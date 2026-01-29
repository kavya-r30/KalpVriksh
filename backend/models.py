from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    user_id: str
    role: str


class AgentTaskRequest(BaseModel):
    """Request model for agent task operations."""
    task_type: str
    user_id: str
    role: str
    params: dict = {}


class NotificationRequest(BaseModel):
    """Request model for sending notifications."""
    school_id: str
    notification_type: str
    target_audience: str
    title: str
    message: str
    class_id: Optional[str] = None
    sent_by: str


class DataIngestionRequest(BaseModel):
    """Request model for data ingestion."""
    data_type: str
    school_id: str
    records: List[dict]
