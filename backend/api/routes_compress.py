from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import fitz, tempfile, os, shutil
import api.routes_document as doc_module

router = APIRouter(prefix="/compress", tags=["compress"])

class CompressRequest(BaseModel):
    doc_id: str
    quality: int = 60  # image quality 1-100
    deflate: bool = True

@router.post("/apply")
async def compress_pdf(req: CompressRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep = session["idrep"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf = fitz.open(idrep.file_path)
        original_size = os.path.getsize(idrep.file_path)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()

        # Compress images on each page
        for page in pdf:
            for img in page.get_images(full=True):
                xref = img[0]
                try:
                    base_image = pdf.extract_image(xref)
                    image_bytes = base_image["image"]
                    ext = base_image["ext"]

                    if ext in ["jpeg", "jpg"]:
                        import io
                        from PIL import Image as PILImage
                        img_obj = PILImage.open(io.BytesIO(image_bytes))
                        buf = io.BytesIO()
                        img_obj.save(buf, format="JPEG", quality=req.quality, optimize=True)
                        pdf.update_stream(xref, buf.getvalue())
                except Exception:
                    pass

        garbage = 4 if req.deflate else 0
        pdf.save(tmp.name, garbage=garbage, deflate=req.deflate, clean=True)
        pdf.close()

        new_size = os.path.getsize(tmp.name)
        shutil.move(tmp.name, idrep.file_path)

        session["renderer"].invalidate_all()

        return {
            "success": True,
            "original_size": original_size,
            "new_size": new_size,
            "saved_bytes": original_size - new_size,
            "reduction_pct": round((1 - new_size / original_size) * 100, 1) if original_size > 0 else 0
        }
    except Exception as e:
        raise HTTPException(500, str(e))
