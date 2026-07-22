from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import api.routes_document as doc_module
from core.idrep import IDRepNodeType
import fitz, re, tempfile, shutil

router = APIRouter(prefix="/search", tags=["search"])


class ReplaceRequest(BaseModel):
    find: str
    replace: str


def find_matches_with_style(page, find_text):
    find_lower = find_text.lower()
    matches = []
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                span_text = span["text"]
                if find_lower not in span_text.lower():
                    continue
                idx = 0
                while True:
                    pos = span_text.lower().find(find_lower, idx)
                    if pos == -1:
                        break
                    span_rect  = fitz.Rect(span["bbox"])
                    span_width = span_rect.width
                    total_chars = len(span_text)
                    char_width  = span_width / max(total_chars, 1)
                    x0 = span_rect.x0 + pos * char_width
                    x1 = span_rect.x0 + (pos + len(find_text)) * char_width
                    matches.append({
                        "rect":     fitz.Rect(x0, span_rect.y0, x1, span_rect.y1),
                        "fontsize": span["size"],
                        "fontname": span["font"],
                        "color":    span.get("color", 0),
                    })
                    idx = pos + 1
    return matches


@router.get("/{doc_id}")
async def search_document(doc_id: str, q: str):
    session = doc_module.get_session(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep   = session["idrep"]
    q_lower = q.lower()
    results = []

    text_types = {
        IDRepNodeType.PARAGRAPH,
        IDRepNodeType.HEADING,
        IDRepNodeType.CAPTION,
        IDRepNodeType.REFERENCE,
    }

    for node in idrep._node_index.values():
        if node.node_type not in text_types:
            continue
        text = node.text or ""
        idx  = text.lower().find(q_lower)
        if idx == -1:
            continue
        start   = max(0, idx - 30)
        end     = min(len(text), idx + len(q) + 30)
        context = ("..." if start > 0 else "") + text[start:end] + ("..." if end < len(text) else "")
        results.append({
            "node_id": node.id,
            "page":    node.page_number,
            "context": context,
        })

    return {"results": results, "count": len(results)}


@router.post("/{doc_id}/replace")
async def replace_in_document(doc_id: str, req: ReplaceRequest):
    session = doc_module.get_session(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    count    = 0
    dirty_pages = set()

    # Take snapshot for undo
    doc_module.take_snapshot(session, idrep.file_path)

    text_types = {
        IDRepNodeType.PARAGRAPH,
        IDRepNodeType.HEADING,
        IDRepNodeType.CAPTION,
        IDRepNodeType.REFERENCE,
    }

    pattern = re.compile(re.escape(req.find), re.IGNORECASE)
    for node in idrep._node_index.values():
        if node.node_type not in text_types:
            continue
        if node.text and pattern.search(node.text):
            node.text = pattern.sub(req.replace, node.text)
            dirty_pages.add(node.page_number)
            count += 1

    if count > 0:
        try:
            pdf = fitz.open(idrep.file_path)
            for page_num in dirty_pages:
                page    = pdf[page_num]
                matches = find_matches_with_style(page, req.find)
                for m in matches:
                    rect      = m["rect"]
                    fontsize  = m["fontsize"]
                    fontname  = m["fontname"].lower()
                    if "times" in fontname or "roman" in fontname:
                        fitz_font = "tiro"
                    elif "courier" in fontname or "mono" in fontname:
                        fitz_font = "cour"
                    else:
                        fitz_font = "helv"
                    color_int = m["color"]
                    r = ((color_int >> 16) & 0xFF) / 255
                    g = ((color_int >> 8)  & 0xFF) / 255
                    b = (color_int & 0xFF) / 255
                    page.draw_rect(rect, color=(1,1,1), fill=(1,1,1))
                    page.insert_text(
                        fitz.Point(rect.x0, rect.y1 - 1),
                        req.replace,
                        fontname=fitz_font,
                        fontsize=fontsize,
                        color=(r, g, b),
                    )
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            tmp.close()
            pdf.save(tmp.name)
            pdf.close()
            shutil.move(tmp.name, idrep.file_path)
            for page_num in dirty_pages:
                renderer.invalidate_page(page_num)
        except Exception as e:
            print(f"[warn] PDF write failed: {e}")
            for page_num in dirty_pages:
                renderer.invalidate_page(page_num)

    return {"count": count, "find": req.find, "replace": req.replace}
