"""
IDRepEditor — all document mutations go through here.
Never edit the raw PDF directly. Edit the IDRep tree, then re-render.
"""
from __future__ import annotations
from typing import Optional
from .models import IDRepDocument, IDRepNode, IDRepNodeType


class IDRepEditor:

    def __init__(self, document: IDRepDocument):
        self.doc = document

    # ── Text ─────────────────────────────────────────────────────────────

    def edit_text(self, node_id: str, new_text: str) -> IDRepNode:
        node = self._get_or_raise(node_id)
        node.text = new_text
        node.mark_dirty()
        return node

    def edit_font(self, node_id: str, font_name: str = None,
                  font_size: float = None) -> IDRepNode:
        node = self._get_or_raise(node_id)
        if font_name: node.font_name = font_name
        if font_size: node.font_size = font_size
        node.mark_dirty()
        return node

    # ── Insert ───────────────────────────────────────────────────────────

    def insert_node(
        self,
        parent_id: str,
        node_type: IDRepNodeType,
        text: str = None,
        after_id: str = None,
        **kwargs,
    ) -> IDRepNode:
        parent = self._get_or_raise(parent_id)
        new_node = IDRepNode(node_type=node_type, text=text, **kwargs)
        new_node.page_number = parent.page_number

        if after_id:
            idx = next((i for i, c in enumerate(parent.children)
                        if c.id == after_id), None)
            if idx is not None:
                parent.children.insert(idx + 1, new_node)
                new_node.parent_id = parent.id
                self._reorder_children(parent)
                self.doc._node_index[new_node.id] = new_node
                parent.mark_dirty()
                return new_node

        parent.add_child(new_node)
        self.doc._node_index[new_node.id] = new_node
        parent.mark_dirty()
        return new_node

    # ── Delete ───────────────────────────────────────────────────────────

    def delete_node(self, node_id: str) -> bool:
        node = self._get_or_raise(node_id)
        parent = self.doc.get_node(node.parent_id)
        if not parent:
            return False
        parent.children = [c for c in parent.children if c.id != node_id]
        self._reorder_children(parent)
        self._deregister(node)
        parent.mark_dirty()
        return True

    # ── Move ─────────────────────────────────────────────────────────────

    def move_node(self, node_id: str, new_parent_id: str,
                  position: int = -1) -> IDRepNode:
        node = self._get_or_raise(node_id)
        old_parent = self.doc.get_node(node.parent_id)
        new_parent = self._get_or_raise(new_parent_id)

        if old_parent:
            old_parent.children = [c for c in old_parent.children
                                    if c.id != node_id]
            self._reorder_children(old_parent)
            old_parent.mark_dirty()

        node.parent_id = new_parent_id
        node.page_number = new_parent.page_number
        if position == -1 or position >= len(new_parent.children):
            new_parent.children.append(node)
        else:
            new_parent.children.insert(position, node)
        self._reorder_children(new_parent)
        new_parent.mark_dirty()
        return node

    # ── Helpers ──────────────────────────────────────────────────────────

    def _get_or_raise(self, node_id: str) -> IDRepNode:
        node = self.doc.get_node(node_id)
        if not node:
            raise ValueError(f"Node not found: {node_id}")
        return node

    def _reorder_children(self, parent: IDRepNode):
        for i, child in enumerate(parent.children):
            child.sort_order = i

    def _deregister(self, node: IDRepNode):
        self.doc._node_index.pop(node.id, None)
        for child in node.children:
            self._deregister(child)
