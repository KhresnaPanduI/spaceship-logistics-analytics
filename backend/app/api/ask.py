from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.llm.orchestrator import ask

router = APIRouter(prefix="/api", tags=["ai"])


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


@router.post("/ask")
def ask_endpoint(req: AskRequest) -> dict:
    try:
        result = ask(req.question)
    except RuntimeError as e:
        # Missing API key, etc.
        raise HTTPException(status_code=503, detail=str(e)) from e
    return result.model_dump()
