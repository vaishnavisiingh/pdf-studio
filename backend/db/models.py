from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text
from sqlalchemy.sql import func
from .connection import Base

class Document(Base):
    __tablename__ = "documents"
    id          = Column(String, primary_key=True)
    filename    = Column(String, nullable=False)
    file_path   = Column(String, nullable=False)
    file_hash   = Column(String, nullable=False)
    page_count  = Column(Integer)
    metadata_   = Column("metadata", JSON)
    created_at  = Column(DateTime, server_default=func.now())
    last_opened = Column(DateTime, onupdate=func.now())

class EditHistory(Base):
    __tablename__ = "edit_history"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, nullable=False)
    node_id     = Column(String, nullable=False)
    operation   = Column(String, nullable=False)  # edit|insert|delete|move
    old_value   = Column(JSON)
    new_value   = Column(JSON)
    timestamp   = Column(DateTime, server_default=func.now())

class AICache(Base):
    __tablename__ = "ai_cache"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    content_hash = Column(String, nullable=False)
    feature      = Column(String, nullable=False)  # summarize|qa|cite
    prompt_hash  = Column(String)
    response     = Column(Text, nullable=False)
    created_at   = Column(DateTime, server_default=func.now())
