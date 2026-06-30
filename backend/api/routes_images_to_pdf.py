from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from typing import List
import fitz
import tempfile
import os

router = APIRouter(prefix="/images-to-pdf", tags=["images-to-pdf"])


@router.post("/convert")
async def images_to_pdf(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "No files uploaded")

    supported = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}

    try:
        pdf = fitz.open()

        for file in files:
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in supported:
                raise HTTPException(400, f"Unsupported format: {file.filename}")

            img_bytes = await file.read()

            # Save to temp file
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            tmp.write(img_bytes)
            tmp.close()

            # Open image and add as PDF page
            img_doc = fitz.open(tmp.name)
            img_pdf = fitz.open("pdf", img_doc.convert_to_pdf())
            pdf.insert_pdf(img_pdf)

            img_doc.close()
            img_pdf.close()
            os.unlink(tmp.name)

        # Save to bytes
        pdf_bytes = pdf.tobytes()
        pdf.close()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=images.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Conversion failed: {str(e)}")
