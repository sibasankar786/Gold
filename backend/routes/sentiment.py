"""Sentiment route — returns current macro sentiment (cached)."""
from __future__ import annotations
from fastapi import APIRouter
from graph.workflow import sentiment_engine

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


@router.get("")
async def get_sentiment():
    result = sentiment_engine.get_sentiment()
    return {"status": "ok", "sentiment": result}
