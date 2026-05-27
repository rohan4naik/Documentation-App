from fastapi import APIRouter, Form, HTTPException, Body
from app.services.supabase_service import SupabaseService
from app.services.ai_service import AIService
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()
supabase_service = SupabaseService()
ai_service = AIService()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    workspace_id: str

@router.get("/")
async def chat_hello():
    return {"message": "Chat endpoint ready"}

@router.post("")
async def chat_with_documents(request: ChatRequest):
    try:
        # 1. Fetch all documents in the workspace or personal documents
        import uuid
        try:
            uuid.UUID(request.workspace_id)
            response = supabase_service.client.table('documents').select('title, content').eq('workspace_id', request.workspace_id).execute()
        except ValueError:
            response = supabase_service.client.table('documents').select('title, content').is_('workspace_id', 'null').execute()
        
        documents = response.data or []
        
        # 2. Get history and last user message
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages[:-1]
        ]
        user_message = request.messages[-1].content
        
        # 3. Call AI Service
        answer = await ai_service.ask_question(user_message, history, documents)
        
        return {
            "role": "assistant",
            "content": answer
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
