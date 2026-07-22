from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import api.routes_document as doc_module
from core.idrep import IDRepNodeType
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
router = APIRouter(prefix="/ai", tags=["ai"])


def extract_document_text(idrep, max_chars=6000) -> str:
    text_types = {
        IDRepNodeType.HEADING,
        IDRepNodeType.PARAGRAPH,
        IDRepNodeType.CAPTION,
        IDRepNodeType.REFERENCE,
    }
    nodes = sorted(
        [n for n in idrep._node_index.values() if n.node_type in text_types],
        key=lambda n: (n.page_number, n.sort_order)
    )
    lines = [node.text.strip() for node in nodes if node.text and node.text.strip()]
    return "\n".join(lines)[:max_chars]


class ChatRequest(BaseModel):
    doc_id: str
    message: str
    history: Optional[List[Dict]] = []


class SummarizeRequest(BaseModel):
    doc_id: str


@router.post("/chat")
async def chat_with_document(req: ChatRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    doc_text = extract_document_text(session["idrep"])

    system_prompt = f"""You are an intelligent document assistant.
The user has opened a document and wants to ask questions about it.

Document content:
---
{doc_text}
---

Answer questions based on this document. Be concise and helpful.
If the answer is not in the document, say so clearly."""

    messages = [{"role": "system", "content": system_prompt}]
    for h in (req.history or []):
        role = h.get("role", "user")
        content = h.get("content") or h.get("message", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": req.message})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=1024,
        )
        return {"reply": response.choices[0].message.content, "role": "assistant"}
    except Exception as e:
        raise HTTPException(500, f"AI error: {str(e)}")


@router.post("/summarize")
async def summarize_document(req: SummarizeRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    doc_text = extract_document_text(session["idrep"])

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful document summarizer."},
                {"role": "user", "content": f"""Provide a clear structured summary of this document.
Include:
- What the document is about (2-3 sentences)
- Key features and capabilities
- Main objectives

Document:
---
{doc_text}
---"""}
            ],
            max_tokens=1024,
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(500, f"AI error: {str(e)}")
