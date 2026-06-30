from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import api.routes_document as doc_module
from core.idrep import IDRepBuilder, IDRepRenderer
from jobs.queue import job_queue
import tempfile
import os
import subprocess
import shutil

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/docx")
async def import_docx(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files supported")

    try:
        # Save uploaded file to temp
        tmp_dir  = tempfile.mkdtemp()
        docx_path = os.path.join(tmp_dir, file.filename)
        pdf_path  = docx_path.replace(".docx", ".pdf")

        with open(docx_path, "wb") as f:
            f.write(await file.read())

        # Convert docx to pdf using python-docx + reportlab
        converted = _convert_docx_to_pdf(docx_path, pdf_path)

        if not converted or not os.path.exists(pdf_path):
            raise HTTPException(500, "Conversion failed")

        # Build IDRep from converted PDF
        idrep    = IDRepBuilder.from_pdf(pdf_path)
        renderer = IDRepRenderer(idrep)
        doc_module._sessions[idrep.id] = {"idrep": idrep, "renderer": renderer}

        return idrep.to_dict()

    except Exception as e:
        raise HTTPException(500, f"Import failed: {str(e)}")


def _convert_docx_to_pdf(docx_path: str, pdf_path: str) -> bool:
    """Convert docx to PDF using python-docx and reportlab."""
    try:
        from docx import Document
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib import colors
        import io

        doc = Document(docx_path)
        buf = io.BytesIO()

        pdf_doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            topMargin=1*inch,
            bottomMargin=1*inch,
            leftMargin=1.2*inch,
            rightMargin=1*inch,
        )

        normal = ParagraphStyle("normal",
            fontName="Helvetica", fontSize=11,
            leading=16, spaceAfter=6)
        heading = ParagraphStyle("heading",
            fontName="Helvetica-Bold", fontSize=14,
            leading=18, spaceAfter=8, spaceBefore=10)

        story = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                story.append(Spacer(1, 0.1*inch))
                continue

            style_name = para.style.name.lower()
            if "heading" in style_name:
                text_escaped = text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                story.append(Paragraph(text_escaped, heading))
            else:
                text_escaped = text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                story.append(Paragraph(text_escaped, normal))

        if not story:
            story.append(Paragraph("Empty document", normal))

        pdf_doc.build(story)

        with open(pdf_path, "wb") as f:
            f.write(buf.getvalue())

        return True

    except Exception as e:
        print(f"Conversion error: {e}")
        return False
