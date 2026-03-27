"""Analyze route — triggers the full LangGraph pipeline."""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from graph.workflow import run_analysis

def get_analyze_router(autotrader):
    router = APIRouter(prefix="/analyze", tags=["analysis"])

    class AnalysisRequest(BaseModel):
        balance:        float = 10000.0
        risk_pct:       float = 0.5
        daily_trades:   int   = 0
        daily_loss_pct: float = 0.0

    @router.post("")
    async def analyze(request: AnalysisRequest):
        """
        Runs the full LangGraph decision pipeline:
        market_data → features → RAG → sentiment → bias_fusion → risk → decision
        """
        decision = await run_analysis(request.model_dump())
        return {"status": "ok", "decision": decision}

    @router.get("/results")
    async def get_results():
        """Returns the latest AI decision/bias from the AutoTrader engine."""
        decision = autotrader.get_last_decision()
        return decision or {"bias": "Neutral", "confidence": 0, "recommendation": "wait"}

    return router


