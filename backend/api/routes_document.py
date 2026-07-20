from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from core.idrep import IDRepBuilder, IDRepRenderer
from jobs.queue import job_queue

router = APIRouter(prefix="/document", tags=["document"])

_sessions: dict = {}

def _get_or_restore_session(doc_id: str):
    """Get session or restore from disk if container restarted."""
    if doc_id in _sessions:
        return _sessions[doc_id]
    
    # Try to restore from temp file
    import tempfile, os
    tmp_path = os.path.join(tempfile.gettempdir(), f"pdf_studio_{doc_id}.pdf")
    if os.path.exists(tmp_path):
        try:
            from core.idrep import IDRepBuilder, IDRepRenderer
            idrep = IDRepBuilder.from_pdf(tmp_path)
            idrep.file_path = tmp_path
            renderer = IDRepRenderer(idrep)
            _sessions[doc_id] = {
                "idrep": idrep,
                "renderer": renderer,
                "history": [],
                "history_index": -1,
                "redo_history": [],
            }
            return _sessions[doc_id]
        except Exception as e:
            print(f"Session restore failed: {e}")
    return None


class OpenRequest(BaseModel):
    path: str


@router.post("/open")
async def open_document(req: OpenRequest, background: BackgroundTasks):
    job = job_queue.create()

    async def _build():
        idrep    = IDRepBuilder.from_pdf(req.path)
        renderer = IDRepRenderer(idrep)
        session  = {"idrep": idrep, "renderer": renderer}
        _sessions[idrep.id] = session

        # Auto-OCR: check if any pages are image-only and run OCR silently
        try:
            import fitz as _fitz
            pdf = _fitz.open(idrep.file_path)
            pages_need_ocr = []
            for i, page in enumerate(pdf):
                if len(page.get_text().strip()) < 20:
                    pages_need_ocr.append(i)
            pdf.close()

            if pages_need_ocr:
                print(f"[auto-ocr] {len(pages_need_ocr)} pages need OCR, running silently...")
                import pytesseract
                from PIL import Image
                import tempfile as _tmp
                import shutil as _shutil

                take_snapshot(session, idrep.file_path)

                pdf2 = _fitz.open(idrep.file_path)
                for page_num in pages_need_ocr:
                    page = pdf2[page_num]
                    mat  = _fitz.Matrix(3.0, 3.0)
                    pix  = page.get_pixmap(matrix=mat)
                    img  = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_data = pytesseract.image_to_data(
                        img,
                        output_type=pytesseract.Output.DICT,
                        config="--psm 3"
                    )
                    n_boxes = len(ocr_data["text"])
                    scale_x = page.rect.width  / pix.width
                    scale_y = page.rect.height / pix.height
                    for i in range(n_boxes):
                        conf = int(ocr_data["conf"][i])
                        text = ocr_data["text"][i].strip()
                        if conf < 40 or not text:
                            continue
                        x = ocr_data["left"][i]   * scale_x
                        y = ocr_data["top"][i]    * scale_y
                        w = ocr_data["width"][i]  * scale_x
                        h = ocr_data["height"][i] * scale_y
                        if w < 1 or h < 1:
                            continue
                        try:
                            page.insert_text(
                                _fitz.Point(x, y + h * 0.85),
                                text,
                                fontsize=max(h * 0.8, 6),
                                color=(1, 1, 1),
                                overlay=False,
                            )
                        except Exception:
                            continue

                tmp = _tmp.NamedTemporaryFile(delete=False, suffix=".pdf")
                tmp.close()
                pdf2.save(tmp.name)
                pdf2.close()
                _shutil.move(tmp.name, idrep.file_path)

                # Rebuild IDRep with OCR text
                new_idrep    = IDRepBuilder.from_pdf(idrep.file_path)
                new_renderer = IDRepRenderer(new_idrep)
                new_idrep.id = idrep.id
                old_history       = session.get("history", [])
                old_history_index = session.get("history_index", -1)
                old_redo_history  = session.get("redo_history", [])
                session["idrep"]         = new_idrep
                session["renderer"]      = new_renderer
                session["history"]       = old_history
                session["history_index"] = old_history_index
                session["redo_history"]  = old_redo_history
                session["renderer"]._page_cache.clear()
                print(f"[auto-ocr] Done. History preserved with {len(old_history)} snapshots.")

        except Exception as e:
            print(f"[auto-ocr] Skipped: {e}")

        return session["idrep"].to_dict()
    async def _run():
        await job_queue.run(job.id, _build())

    background.add_task(_run)
    return {"job_id": job.id}



@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF file and open it — web mode."""
    import tempfile, shutil
    
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.close()
    
    with open(tmp.name, "wb") as f:
        f.write(await file.read())
    
    # Direct processing for web upload
    import uuid, shutil
    from core.idrep import IDRepBuilder, IDRepRenderer
    
    doc_id = str(uuid.uuid4())
    
    # Save to persistent temp location
    import tempfile as tmpmod
    persistent_path = os.path.join(tmpmod.gettempdir(), f"pdf_studio_{doc_id}.pdf")
    shutil.copy2(tmp.name, persistent_path)
    
    idrep = IDRepBuilder.from_pdf(persistent_path)
    idrep.file_path = persistent_path
    renderer = IDRepRenderer(idrep)
    
    _sessions[doc_id] = {
        "idrep": idrep,
        "renderer": renderer,
        "history": [],
        "history_index": -1,
        "redo_history": [],
    }
    
    import fitz
    pdf = fitz.open(tmp.name)
    total_pages = len(pdf)
    pdf.close()
    
    return {
        "id": doc_id,
        "totalPages": total_pages,
        "fileName": file.filename,
    }

@router.get("/{doc_id}/info")
async def document_info(doc_id: str):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    return session["idrep"].to_dict()


@router.get("/{doc_id}/page/{page_num}")
async def get_page(doc_id: str, page_num: int, dpi: int = 150, bust: int = 0):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    renderer = session["renderer"]
    if page_num < 0 or page_num >= session["idrep"].page_count:
        raise HTTPException(400, "Invalid page number")
    if bust:
        renderer.invalidate_page(page_num)
    png_b64 = renderer.render_page(page_num, dpi)
    return {"page": page_num, "image": png_b64,
            "dimensions": renderer.get_page_dimensions(page_num)}


@router.get("/{doc_id}/nodes")
async def get_nodes(doc_id: str, node_type: str = None, page: int = None):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    idrep = session["idrep"]
    if page is not None:
        nodes = idrep.get_page_nodes(page)
    elif node_type:
        from core.idrep import IDRepNodeType
        try:
            nt = IDRepNodeType(node_type)
        except ValueError:
            raise HTTPException(400, f"Unknown node type: {node_type}")
        nodes = idrep.get_nodes_by_type(nt)
    else:
        nodes = list(idrep._node_index.values())
    return {"nodes": [n.to_dict(include_children=False) for n in nodes]}


@router.delete("/{doc_id}/close")
async def close_document(doc_id: str):
    _sessions.pop(doc_id, None)
    return {"closed": doc_id}

@router.get("/{doc_id}/download")
async def download_document(doc_id: str):
    from fastapi.responses import Response
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    with open(session["idrep"].file_path, "rb") as f:
        pdf_bytes = f.read()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=edited.pdf"}
    )


@router.post("/{doc_id}/revert")
async def revert_document(doc_id: str):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    
    idrep = session["idrep"]
    
    if not idrep.original_path:
        raise HTTPException(400, "No original file to revert to")
    
    import shutil
    shutil.copy2(idrep.original_path, idrep.file_path)
    
    # Clear renderer cache
    session["renderer"]._page_cache.clear()
    
    return {"reverted": True}


@router.post("/{doc_id}/snapshot")
async def take_snapshot(doc_id: str):
    """Save current state as a snapshot for undo."""
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    
    import shutil, tempfile
    idrep = session["idrep"]
    
    if "history" not in session:
        session["history"] = []
        session["history_index"] = -1
    
    # Save current file as snapshot
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.close()
    shutil.copy2(idrep.file_path, tmp.name)
    
    # Truncate future history if we're in middle
    idx = session["history_index"]
    session["history"] = session["history"][:idx+1]
    session["history"].append(tmp.name)
    session["history_index"] = len(session["history"]) - 1
    
    return {"snapshot": session["history_index"]}


@router.post("/{doc_id}/undo")
async def undo_document(doc_id: str):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    
    if "history" not in session or len(session.get("history", [])) == 0:
        raise HTTPException(400, "Nothing to undo")
    
    import shutil
    session["history_index"] -= 1
    snapshot_path = session["history"][session["history_index"]]
    shutil.copy2(snapshot_path, session["idrep"].file_path)
    session["renderer"]._page_cache.clear()
    
    return {"undone": True, "index": session["history_index"]}


@router.post("/{doc_id}/redo")
async def redo_document(doc_id: str):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    
    history = session.get("history", [])
    idx     = session.get("history_index", -1)
    
    if idx >= len(history) - 1:
        raise HTTPException(400, "Nothing to redo")
    
    import shutil
    session["history_index"] += 1
    snapshot_path = history[session["history_index"]]
    shutil.copy2(snapshot_path, session["idrep"].file_path)
    session["renderer"]._page_cache.clear()
    
    return {"redone": True, "index": session["history_index"]}


@router.post("/{doc_id}/undo_v2")
async def undo_v2(doc_id: str):
    from fastapi.responses import JSONResponse
    import shutil
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    history = session.get("history", [])
    idx     = session.get("history_index", -1)

    if len(history) == 0 or idx < 0:
        raise HTTPException(400, "Nothing to undo")

    # Save current state for redo
    import tempfile
    redo_snap = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    redo_snap.close()
    shutil.copy2(session["idrep"].file_path, redo_snap.name)

    # Restore previous snapshot
    snapshot_path = history[idx]
    shutil.copy2(snapshot_path, session["idrep"].file_path)
    session["history_index"] = idx - 1

    # Add redo snapshot
    if "redo_history" not in session:
        session["redo_history"] = []
    session["redo_history"].append(redo_snap.name)

    session["renderer"]._page_cache.clear()
    try:
        import api.routes_annotations as ann_module
        ann_module._annotations.pop(doc_id, None)
    except Exception:
        pass
    return {"undone": True}


@router.post("/{doc_id}/redo_v2")
async def redo_v2(doc_id: str):
    import shutil
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    redo_history = session.get("redo_history", [])
    if not redo_history:
        raise HTTPException(400, "Nothing to redo")

    snapshot_path = redo_history.pop()
    shutil.copy2(snapshot_path, session["idrep"].file_path)
    session["renderer"]._page_cache.clear()
    return {"redone": True}


def take_snapshot(session: dict, file_path: str):
    """Call this before any edit to enable undo."""
    import shutil, tempfile
    snap = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    snap.close()
    shutil.copy2(file_path, snap.name)
    if "history" not in session:
        session["history"] = []
        session["history_index"] = -1
    idx = session["history_index"]
    session["history"] = session["history"][:idx+1]
    session["history"].append(snap.name)
    session["history_index"] = len(session["history"]) - 1
    session["redo_history"] = []


@router.post("/{doc_id}/insert-text")
async def insert_text_on_page(doc_id: str, page: int, x: float, y: float, text: str, fontsize: float = 12):
    from fastapi.responses import JSONResponse
    import fitz, tempfile, shutil
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]

    take_snapshot(session, idrep.file_path)

    try:
        pdf      = fitz.open(idrep.file_path)
        pg       = pdf[page]
        pg.insert_text(
            fitz.Point(x, y),
            text,
            fontsize=fontsize,
            color=(0, 0, 0),
        )
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(page)
    except Exception as e:
        raise HTTPException(500, f"Insert text failed: {str(e)}")

    return {"success": True}


@router.post("/{doc_id}/insert-image")
async def insert_image_on_page(doc_id: str, page: int, x: float, y: float, width: float = 200, height: float = 200):
    from fastapi import UploadFile, File
    raise HTTPException(400, "Use multipart endpoint")


@router.post("/{doc_id}/insert-image-file")
async def insert_image_file(
    doc_id: str,
    page: int,
    x: float,
    y: float,
    width: float = 200,
    height: float = 200,
    file: "UploadFile" = None,
):
    from fastapi import UploadFile
    import fitz, tempfile, shutil, os
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    if file is None:
        raise HTTPException(400, "No file provided")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    take_snapshot(session, idrep.file_path)

    try:
        img_bytes = await file.read()
        ext = os.path.splitext(file.filename)[1].lower() or ".png"
        tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp_img.write(img_bytes)
        tmp_img.close()

        pdf = fitz.open(idrep.file_path)
        pg  = pdf[page]
        rect = fitz.Rect(x, y, x + width, y + height)
        pg.insert_image(rect, filename=tmp_img.name)
        os.unlink(tmp_img.name)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(page)

    except Exception as e:
        raise HTTPException(500, f"Insert image failed: {str(e)}")

    return {"success": True}


@router.post("/{doc_id}/insert-table")
async def insert_table_on_page(
    doc_id: str,
    page: int,
    x: float,
    y: float,
    rows: int = 3,
    cols: int = 3,
    cell_width: float = 80,
    cell_height: float = 25,
):
    import fitz, tempfile, shutil
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    take_snapshot(session, idrep.file_path)

    try:
        pdf  = fitz.open(idrep.file_path)
        pg   = pdf[page]

        for r in range(rows):
            for c in range(cols):
                x0 = x + c * cell_width
                y0 = y + r * cell_height
                x1 = x0 + cell_width
                y1 = y0 + cell_height
                pg.draw_rect(
                    fitz.Rect(x0, y0, x1, y1),
                    color=(0, 0, 0),
                    width=0.5,
                )

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(page)

    except Exception as e:
        raise HTTPException(500, f"Insert table failed: {str(e)}")

    return {"success": True}


@router.post("/{doc_id}/insert-equation")
async def insert_equation(doc_id: str, page: int, x: float, y: float, equation: str, fontsize: float = 14):
    import fitz, tempfile, shutil
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    take_snapshot(session, idrep.file_path)

    try:
        pdf = fitz.open(idrep.file_path)
        pg  = pdf[page]

        # Draw a light box around the equation
        text_width  = len(equation) * fontsize * 0.6
        text_height = fontsize * 1.8
        box_rect    = fitz.Rect(x - 4, y - text_height, x + text_width + 4, y + 4)
        pg.draw_rect(box_rect, color=(0.85, 0.85, 1.0), fill=(0.95, 0.95, 1.0), width=0.5)

        # Insert equation text in italic
        pg.insert_text(
            fitz.Point(x, y),
            equation,
            fontname="tiro",
            fontsize=fontsize,
            color=(0.1, 0.1, 0.5),
        )

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(page)

    except Exception as e:
        raise HTTPException(500, f"Insert equation failed: {str(e)}")

    return {"success": True}


@router.get("/{doc_id}/history")
async def get_history(doc_id: str):
    """Return list of snapshots with metadata."""
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    
    history = session.get("history", [])
    history_index = session.get("history_index", -1)
    
    snapshots = []
    for i, path in enumerate(history):
        try:
            size = os.path.getsize(path)
            mtime = os.path.getmtime(path)
            import datetime
            snapshots.append({
                "index": i,
                "size": size,
                "timestamp": datetime.datetime.fromtimestamp(mtime).strftime("%H:%M:%S"),
                "is_current": i == history_index,
                "label": "Original" if i == 0 else f"Version {i}",
            })
        except:
            pass
    
    return {"snapshots": snapshots, "current_index": history_index}


@router.post("/{doc_id}/restore/{snapshot_index}")
async def restore_snapshot(doc_id: str, snapshot_index: int):
    """Restore a specific snapshot."""
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    
    history = session.get("history", [])
    if snapshot_index < 0 or snapshot_index >= len(history):
        raise HTTPException(400, "Invalid snapshot index")
    
    snapshot_path = history[snapshot_index]
    if not os.path.exists(snapshot_path):
        raise HTTPException(404, "Snapshot file not found")
    
    shutil.copy2(snapshot_path, session["idrep"].file_path)
    session["history_index"] = snapshot_index
    session["renderer"].invalidate_all()
    
    return {"success": True, "restored_index": snapshot_index}
