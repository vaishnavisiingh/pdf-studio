from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response, JSONResponse
from typing import List, Optional
import fitz
import tempfile
import os
import shutil
import subprocess
import zipfile
import io

router = APIRouter(prefix="/convert", tags=["convert"])


# ── PDF → PNG (all pages as zip, or single page) ──────────────────────────
@router.post("/pdf-to-png")
async def pdf_to_png(
    file: UploadFile = File(...),
    dpi: int = 150,
):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(await file.read())
    tmp.close()

    try:
        pdf = fitz.open(tmp.name)
        images = []
        for i, page in enumerate(pdf):
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            images.append((f"page_{i+1:03d}.png", pix.tobytes("png")))
        pdf.close()

        if len(images) == 1:
            return Response(
                content=images[0][1],
                media_type="image/png",
                headers={"Content-Disposition": f"attachment; filename=page_1.png"}
            )

        # Multiple pages → zip
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, data in images:
                zf.writestr(name, data)
        buf.seek(0)
        return Response(
            content=buf.read(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=pages.zip"}
        )
    finally:
        os.unlink(tmp.name)


# ── PDF → JPG ─────────────────────────────────────────────────────────────
@router.post("/pdf-to-jpg")
async def pdf_to_jpg(
    file: UploadFile = File(...),
    dpi: int = 150,
    quality: int = 85,
):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(await file.read())
    tmp.close()

    try:
        pdf = fitz.open(tmp.name)
        images = []
        for i, page in enumerate(pdf):
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            # Convert to RGB for JPEG
            from PIL import Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality)
            images.append((f"page_{i+1:03d}.jpg", buf.getvalue()))
        pdf.close()

        if len(images) == 1:
            return Response(
                content=images[0][1],
                media_type="image/jpeg",
                headers={"Content-Disposition": "attachment; filename=page_1.jpg"}
            )

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, data in images:
                zf.writestr(name, data)
        buf.seek(0)
        return Response(
            content=buf.read(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=pages.zip"}
        )
    finally:
        os.unlink(tmp.name)


# ── PPT → PDF (requires LibreOffice) ──────────────────────────────────────
@router.post("/ppt-to-pdf")
async def ppt_to_pdf(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".ppt", ".pptx"]:
        raise HTTPException(400, "Only .ppt and .pptx files supported")

    tmp_dir = tempfile.mkdtemp()
    input_path = os.path.join(tmp_dir, file.filename)

    with open(input_path, "wb") as f:
        f.write(await file.read())

    try:
        # Try LibreOffice
        lo_paths = [
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
            "soffice",
            "libreoffice",
        ]
        lo_bin = None
        for p in lo_paths:
            if shutil.which(p) or os.path.exists(p):
                lo_bin = p
                break

        if not lo_bin:
            raise HTTPException(500, "LibreOffice not found. Install it from libreoffice.org to convert PPT files.")

        result = subprocess.run(
            [lo_bin, "--headless", "--convert-to", "pdf", "--outdir", tmp_dir, input_path],
            capture_output=True, text=True, timeout=60
        )

        pdf_path = os.path.join(tmp_dir, os.path.splitext(file.filename)[0] + ".pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(500, f"Conversion failed: {result.stderr}")

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={os.path.splitext(file.filename)[0]}.pdf"}
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── PDF compress ───────────────────────────────────────────────────────────
@router.post("/compress-pdf")
async def compress_pdf(
    file: UploadFile = File(...),
    level: str = "medium",  # low, medium, high
):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(await file.read())
    tmp.close()

    try:
        pdf = fitz.open(tmp.name)

        dpi_map = {"low": 150, "medium": 96, "high": 72}
        img_quality_map = {"low": 85, "medium": 65, "high": 45}
        dpi     = dpi_map.get(level, 96)
        quality = img_quality_map.get(level, 65)

        out = fitz.open()
        for page in pdf:
            # Re-render each page at lower DPI
            mat  = fitz.Matrix(dpi / 72, dpi / 72)
            pix  = page.get_pixmap(matrix=mat)
            img_pdf = fitz.open("pdf", pix.pdfocr_tobytes())
            out.insert_pdf(img_pdf)

        buf = io.BytesIO()
        out.save(buf, garbage=4, deflate=True, clean=True)
        pdf.close()
        out.close()

        return Response(
            content=buf.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=compressed.pdf"}
        )
    finally:
        os.unlink(tmp.name)


@router.post("/pdf-to-ppt")
async def pdf_to_ppt(file: UploadFile = File(...)):
    """Convert PDF to PowerPoint using LibreOffice."""
    import tempfile, shutil, subprocess, os
    from fastapi.responses import FileResponse

    tmp_dir = tempfile.mkdtemp()
    try:
        input_path = os.path.join(tmp_dir, file.filename or "input.pdf")
        with open(input_path, "wb") as f:
            f.write(await file.read())

        # Try LibreOffice
        lo_bin = None
        for path in [
            "/usr/bin/libreoffice", "/usr/local/bin/libreoffice",
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
            "libreoffice", "soffice"
        ]:
            try:
                subprocess.run([path, "--version"], capture_output=True, timeout=5)
                lo_bin = path
                break
            except Exception:
                continue

        if not lo_bin:
            raise HTTPException(500, "LibreOffice not found. Install it from libreoffice.org to convert PDF to PPT.")

        result = subprocess.run(
            [lo_bin, "--headless", "--convert-to", "pptx", "--outdir", tmp_dir, input_path],
            capture_output=True, text=True, timeout=120
        )

        out_file = input_path.replace(".pdf", ".pptx")
        if not os.path.exists(out_file):
            # Try finding any pptx in tmp_dir
            for f_name in os.listdir(tmp_dir):
                if f_name.endswith(".pptx"):
                    out_file = os.path.join(tmp_dir, f_name)
                    break
            else:
                raise HTTPException(500, f"Conversion failed: {result.stderr}")

        return FileResponse(
            out_file,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename="converted.pptx"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        # Cleanup after response
        pass
