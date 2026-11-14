"""
StegoShield AI — Assistant Endpoint.
Provides conversational AI support across all authenticated and exploration pages.
"""

from fastapi import APIRouter, Depends, Request
from typing import Optional

from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services.assistant_service import AssistantService
from app.core.auth import get_current_user_optional
from app.models.user import User

router = APIRouter()


@router.post("/chat", response_model=AssistantChatResponse, summary="Send message to StegoShield AI Assistant")
async def chat_with_assistant(
    req: AssistantChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Globally accessible AI chatbot endpoint with context-aware forensic guidance,
    page awareness, active analysis interpretation, and general educational responses.
    """
    response = await AssistantService.process_chat(req)
    return response
