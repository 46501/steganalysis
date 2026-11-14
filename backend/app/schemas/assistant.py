"""
StegoShield AI — Assistant Schemas.
Data contracts for global AI conversational assistant.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message author: 'user' or 'assistant'")
    content: str = Field(..., description="Plaintext or markdown content")


class ChatContext(BaseModel):
    current_page: Optional[str] = Field(None, description="Current application route (e.g. /detector, /lab)")
    workflow_step: Optional[int] = Field(None, description="Active step number if in a multi-step workflow")
    analysis_data: Optional[Dict[str, Any]] = Field(None, description="Contextual analysis metrics or scan findings")


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question or inquiry")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation turns")
    context: Optional[ChatContext] = Field(default=None, description="Current route, step, and forensic metrics")

    @field_validator("message")
    @classmethod
    def validate_non_empty_message(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message cannot be empty or contain only whitespace.")
        return stripped


class AssistantChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant markdown response")
    suggested_prompts: List[str] = Field(default_factory=list, description="Context-relevant quick prompts")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
