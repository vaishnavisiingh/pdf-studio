"""
Basic tests for IDRepBuilder.
Run with: pytest tests/test_idrep_builder.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from core.idrep import IDRepBuilder, IDRepNodeType


def test_builder_imports():
    """Builder should be importable without errors."""
    assert IDRepBuilder is not None


def test_node_types_defined():
    """All expected node types should exist."""
    expected = ["DOCUMENT","PAGE","HEADING","PARAGRAPH","TABLE","IMAGE","EQUATION","REFERENCE"]
    for t in expected:
        assert hasattr(IDRepNodeType, t), f"Missing node type: {t}"


def test_idrep_document_structure():
    """IDRepDocument should have correct initial structure."""
    from core.idrep import IDRepDocument, IDRepNode
    doc = IDRepDocument()
    assert doc.id is not None
    assert doc.page_count == 0
    assert doc.root.node_type == IDRepNodeType.DOCUMENT


def test_node_add_child():
    """Adding a child node should update parent_id and sort_order."""
    from core.idrep import IDRepNode
    parent = IDRepNode(IDRepNodeType.PAGE)
    child1 = IDRepNode(IDRepNodeType.PARAGRAPH, text="Hello")
    child2 = IDRepNode(IDRepNodeType.HEADING, text="Title")

    parent.add_child(child1)
    parent.add_child(child2)

    assert child1.parent_id == parent.id
    assert child1.sort_order == 0
    assert child2.sort_order == 1
    assert len(parent.children) == 2


def test_document_node_index():
    """register() should index all nodes for O(1) lookup."""
    from core.idrep import IDRepDocument, IDRepNode
    doc = IDRepDocument()
    page = IDRepNode(IDRepNodeType.PAGE)
    para = IDRepNode(IDRepNodeType.PARAGRAPH, text="Test paragraph")
    page.add_child(para)
    doc.root.add_child(page)
    doc.register(doc.root)

    assert doc.get_node(page.id) is not None
    assert doc.get_node(para.id).text == "Test paragraph"


def test_dirty_flag():
    """Nodes should track dirty state for re-render decisions."""
    from core.idrep import IDRepNode
    node = IDRepNode(IDRepNodeType.PARAGRAPH, text="original")
    assert not node._dirty
    node.mark_dirty()
    assert node._dirty
    node.mark_clean()
    assert not node._dirty
