from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/annotations", tags=["annotations"])

_annotations: dict = {}


class Annotation(BaseModel):
    id: Optional[str] = None
    doc_id: str
    page: int
    type: str
    x: float
    y: float
    width: float
    height: float
    color: Optional[str] = "#FFFF00"
    comment: Optional[str] = ""
    selected_text: Optional[str] = ""


class DeleteRequest(BaseModel):
    doc_id: str
    annotation_id: str


@router.post("/add")
async def add_annotation(ann: Annotation):
    ann.id = str(uuid.uuid4())
    if ann.doc_id not in _annotations:
        _annotations[ann.doc_id] = []
    _annotations[ann.doc_id].append(ann.dict())
    return ann


@router.get("/{doc_id}")
async def get_annotations(doc_id: str):
    return {"annotations": _annotations.get(doc_id, [])}


@router.get("/{doc_id}/page/{page}")
async def get_page_annotations(doc_id: str, page: int):
    all_anns = _annotations.get(doc_id, [])
    page_anns = [a for a in all_anns if a["page"] == page]
    return {"annotations": page_anns}


@router.delete("/delete")
async def delete_annotation(req: DeleteRequest):
    if req.doc_id in _annotations:
        _annotations[req.doc_id] = [
            a for a in _annotations[req.doc_id]
            if a["id"] != req.annotation_id
        ]
    return {"deleted": req.annotation_id}


@router.delete("/{doc_id}/clear")
async def clear_annotations(doc_id: str):
    _annotations.pop(doc_id, None)
    return {"cleared": doc_id}
