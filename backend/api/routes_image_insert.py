from fastapi import APIRouter, HTTPException, UploadFile, File
import api.routes_document as doc_module
import fitz, tempfile, shutil, os

router = APIRouter(prefix="/insert", tags=["insert"])


@router.post("/{doc_id}/image")
async def insert_image(
    doc_id: str,
    page: int,
    x: float,
    y: float,
    width: float = 200,
    height: float = 200,
    file: UploadFile = File(...),
):
    session = doc_module.get_session(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        img_bytes = await file.read()
        ext = os.path.splitext(file.filename)[1].lower() or ".png"
        tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp_img.write(img_bytes)
        tmp_img.close()

        pdf  = fitz.open(idrep.file_path)
        pg   = pdf[page]
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
