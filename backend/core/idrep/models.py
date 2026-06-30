"""
ID-REP: Intelligent Document Representation
Core data models — the semantic tree that powers everything.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Any
import uuid


class IDRepNodeType(str, Enum):
    # Structure
    DOCUMENT   = "document"
    PAGE       = "page"
    SECTION    = "section"
    # Content
    HEADING    = "heading"
    PARAGRAPH  = "paragraph"
    TABLE      = "table"
    TABLE_ROW  = "table_row"
    TABLE_CELL = "table_cell"
    IMAGE      = "image"
    EQUATION   = "equation"
    REFERENCE  = "reference"
    LIST       = "list"
    LIST_ITEM  = "list_item"
    # Metadata
    CAPTION    = "caption"
    FOOTNOTE   = "footnote"
    ANNOTATION = "annotation"
    HEADER     = "header"
    FOOTER     = "footer"


@dataclass
class BoundingBox:
    x: float
    y: float
    width: float
    height: float
    page: int

    def to_dict(self) -> dict:
        return {
            "x": self.x, "y": self.y,
            "width": self.width, "height": self.height,
            "page": self.page
        }


@dataclass
class IDRepNode:
    node_type: IDRepNodeType
    id: str                        = field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: Optional[str]       = None
    children: list[IDRepNode]      = field(default_factory=list)

    # Content
    text: Optional[str]            = None
    image_bytes: Optional[bytes]   = None

    # Layout
    bbox: Optional[BoundingBox]    = None
    page_number: int               = 0
    sort_order: int                = 0

    # Typography
    font_name: Optional[str]       = None
    font_size: Optional[float]     = None
    is_bold: bool                  = False
    is_italic: bool                = False
    color: Optional[str]           = None

    # Structure
    heading_level: Optional[int]   = None   # 1–6
    confidence: float              = 1.0    # classification confidence

    # Extra
    attributes: dict[str, Any]     = field(default_factory=dict)
    _dirty: bool                   = False  # needs re-render?

    def mark_dirty(self):  self._dirty = True
    def mark_clean(self):  self._dirty = False

    def add_child(self, child: IDRepNode):
        child.parent_id = self.id
        child.sort_order = len(self.children)
        self.children.append(child)

    def to_dict(self, include_children: bool = True) -> dict:
        d = {
            "id": self.id,
            "node_type": self.node_type.value,
            "parent_id": self.parent_id,
            "text": self.text,
            "page_number": self.page_number,
            "sort_order": self.sort_order,
            "font_name": self.font_name,
            "font_size": self.font_size,
            "is_bold": self.is_bold,
            "is_italic": self.is_italic,
            "heading_level": self.heading_level,
            "confidence": self.confidence,
            "bbox": self.bbox.to_dict() if self.bbox else None,
            "attributes": self.attributes,
        }
        if include_children:
            d["children"] = [c.to_dict() for c in self.children]
        return d

    def __repr__(self):
        preview = (self.text or "")[:40]
        return f"IDRepNode({self.node_type.value}, id={self.id[:8]}, text={preview!r})"


@dataclass
class IDRepDocument:
    id: str                              = field(default_factory=lambda: str(uuid.uuid4()))
    file_path: str                       = ""
    original_path: str                   = ""
    file_hash: str                       = ""
    page_count: int                      = 0
    root: IDRepNode                      = field(default_factory=lambda: IDRepNode(IDRepNodeType.DOCUMENT))
    _node_index: dict[str, IDRepNode]    = field(default_factory=dict)

    # Metadata
    title: Optional[str]                 = None
    author: Optional[str]               = None
    subject: Optional[str]              = None
    keywords: list[str]                 = field(default_factory=list)

    def register(self, node: IDRepNode):
        """Recursively index all nodes for O(1) lookup."""
        self._node_index[node.id] = node
        for child in node.children:
            self.register(child)

    def get_node(self, node_id: str) -> Optional[IDRepNode]:
        return self._node_index.get(node_id)

    def get_nodes_by_type(self, node_type: IDRepNodeType) -> list[IDRepNode]:
        return [n for n in self._node_index.values()
                if n.node_type == node_type]

    def get_page_nodes(self, page_number: int) -> list[IDRepNode]:
        return sorted(
            [n for n in self._node_index.values()
             if n.page_number == page_number],
            key=lambda n: n.sort_order
        )

    def get_dirty_pages(self) -> set[int]:
        return {n.page_number for n in self._node_index.values()
                if n._dirty}

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "file_path": self.file_path,
            "page_count": self.page_count,
            "title": self.title,
            "author": self.author,
            "subject": self.subject,
            "keywords": self.keywords,
            "tree": self.root.to_dict(),
        }
