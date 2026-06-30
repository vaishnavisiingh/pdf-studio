import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from api.routes_crop import router as crop_router
from api.routes_rotate import router as rotate_router
from api.routes_pagedecor import router as pagedecor_router
from api.routes_ocr import router as ocr_router
from api.routes_stamp import router as stamp_router
from api.routes_pages import router as pages_router
from api.routes_redact import router as redact_router
from api.routes_images_to_pdf import router as images_to_pdf_router
from api.routes_import import router as import_router
from api.routes_security import router as security_router
from api.routes_watermark import router as watermark_router
from api.routes_info import router as info_router
from api.routes_annotations import router as annotations_router
from api.routes_export import router as export_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.routes_repaginate import router as repaginate_router
from db.connection import engine, Base
from api.routes_document import router as doc_router
from api.routes_editor    import router as edit_router
from api.routes_jobs      import router as jobs_router
from api.routes_search import router as search_router
from api.routes_image_insert import router as image_insert_router
from api.routes_signature import router as signature_router
from api.routes_ai import router as ai_router
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="PDF Studio API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    
)

app.include_router(images_to_pdf_router, prefix="/api")
app.include_router(import_router, prefix="/api")
app.include_router(security_router, prefix="/api")
app.include_router(watermark_router, prefix="/api")
app.include_router(info_router, prefix="/api")
app.include_router(annotations_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(doc_router,  prefix="/api")
app.include_router(edit_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(repaginate_router, prefix="/api")
app.include_router(image_insert_router, prefix="/api")
app.include_router(signature_router, prefix="/api")
app.include_router(redact_router, prefix="/api")
app.include_router(stamp_router, prefix="/api")
app.include_router(pages_router, prefix="/api")
app.include_router(ocr_router, prefix="/api")
app.include_router(pagedecor_router, prefix="/api")
app.include_router(rotate_router, prefix="/api")
app.include_router(crop_router, prefix="/api")



@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
