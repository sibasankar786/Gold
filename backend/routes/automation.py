"""Automation routes — control and monitor the AutoTrader engine."""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

class AutomationStatus(BaseModel):
    enabled: bool
    trial_mode: bool
    last_decision: dict

def get_automation_router(autotrader):
    router = APIRouter(prefix="/automation", tags=["automation"])

    @router.get("/status")
    async def get_status():
        from config import settings
        return {
            "enabled": autotrader.is_running(),
            "trial_mode": settings.auto_trade_trial_mode,
            "last_decision": autotrader.get_last_decision()
        }

    @router.post("/toggle")
    async def toggle_automation(enabled: bool):
        if enabled:
            autotrader.start()
        else:
            autotrader.stop()
        return {"status": "ok", "enabled": autotrader.is_running()}
    class ExecuteOrderRequest(BaseModel):
        side: str  # "BUY" or "SELL"
        lot: float
        sl: float = 0
        tp: float = 0

    @router.post("/execute-order")
    async def execute_order(req: ExecuteOrderRequest):
        from adapters.mt5_adapter import MT5Adapter
        from config import settings
        from fastapi import HTTPException
        
        adapter = MT5Adapter()
        
        # --- Spread Filter ---
        spread = adapter.get_spread(settings.market_symbol)
        if spread > settings.max_spread:
            raise HTTPException(
                status_code=400, 
                detail=f"Spread too high ({spread} > {settings.max_spread}). Execution blocked."
            )
            
        result = adapter.execute_order(settings.market_symbol, req.lot, req.side, req.sl, req.tp)
        return result
    return router
