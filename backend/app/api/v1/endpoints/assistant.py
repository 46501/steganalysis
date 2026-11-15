"""
StegoShield AI — Assistant Endpoint.
Provides conversational AI support across all authenticated and exploration pages.
"""

from fastapi import APIRouter, Depends, Request
from typing import Optional

from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services.assistant_service import AssistantService
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/chat", response_model=AssistantChatResponse, summary="Send message to StegoShield AI Assistant")
async def chat_with_assistant(
    req: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Authenticated AI chatbot endpoint with context-aware forensic guidance,
    page awareness, active analysis interpretation, and general educational responses.
    Requires an active authenticated user session.
    """
    response = await AssistantService.process_chat(req)
    return response

