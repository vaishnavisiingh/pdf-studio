from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.routes_document import _sessions
from core.idrep import IDRepEditor, IDRepNodeType

router = APIRouter(prefix="/edit", tags=["editor"])


class EditTextRequest(BaseModel):
    doc_id: str
    node_id: str
    new_text: str

class EditFontRequest(BaseModel):
    doc_id: str
    node_id: str
    font_name: Optional[str] = None
    font_size: Optional[float] = None

class InsertNodeRequest(BaseModel):
    doc_id: str
    parent_id: str
    node_type: str
    text: Optional[str] = None
    after_id: Optional[str] = None

class DeleteNodeRequest(BaseModel):
    doc_id: str
    node_id: str


def _editor(doc_id: str):
    session = _sessions.get(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")
    return IDRepEditor(session["idrep"])


@router.post("/text")
async def edit_text(req: EditTextRequest):
    editor = _editor(req.doc_id)
    node = editor.edit_text(req.node_id, req.new_text)
    _sessions[req.doc_id]["renderer"].invalidate_page(node.page_number)
    return node.to_dict(include_children=False)


@router.post("/font")
async def edit_font(req: EditFontRequest):
    editor = _editor(req.doc_id)
    node = editor.edit_font(req.node_id, req.font_name, req.font_size)
    _sessions[req.doc_id]["renderer"].invalidate_page(node.page_number)
    return node.to_dict(include_children=False)


@router.post("/insert")
async def insert_node(req: InsertNodeRequest):
    editor = _editor(req.doc_id)
    try:
        nt = IDRepNodeType(req.node_type)
    except ValueError:
        raise HTTPException(400, f"Unknown node type: {req.node_type}")
    node = editor.insert_node(req.parent_id, nt, req.text, req.after_id)
    return node.to_dict(include_children=False)


@router.delete("/node")
async def delete_node(req: DeleteNodeRequest):
    editor = _editor(req.doc_id)
    success = editor.delete_node(req.node_id)
    if not success:
        raise HTTPException(400, "Could not delete node")
    return {"deleted": req.node_id}