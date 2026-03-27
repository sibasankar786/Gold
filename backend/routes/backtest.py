from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from backtesting.engine import BacktestEngine

router = APIRouter(prefix="/backtest", tags=["Backtesting"])

class BacktestRequest(BaseModel):
    symbol: str = "XAUUSD.sc"
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    strategy: str = "all"  # options: all, breakout, liquidity, scalp_5pt, scalp_10pt
    config: Optional[Dict] = None
    mock_data: bool = True 

@router.post("/run")
async def run_backtest(req: BacktestRequest):
    import traceback
    print(f"[BACKTEST] Received request: {req}")
    try:
        engine = BacktestEngine(config=req.config)
        
        # Parse dates with safety
        start_dt = None
        end_dt = datetime.now() # Default end_dt to now
        
        if req.from_date:
            try:
                # Parse and keep as naive (MT5 prefers naive for local broker time)
                dt = datetime.fromisoformat(req.from_date.replace('Z', '+00:00'))
                start_dt = dt.replace(tzinfo=None)
            except Exception as de:
                print(f"[ERROR] Failed to parse FROM date: {req.from_date} - {de}")
                pass
        
        if req.to_date:
            try:
                dt = datetime.fromisoformat(req.to_date.replace('Z', '+00:00'))
                end_dt = dt.replace(tzinfo=None)
            except Exception as de:
                print(f"[ERROR] Failed to parse TO date: {req.to_date} - {de}")
                pass

        if not start_dt:
            # Fallback if parsing failed or not provided
            start_dt = end_dt - timedelta(minutes=500)

        if req.mock_data:
            # Final check for type safety
            m1_data = generate_mock_m1_data(start_dt, end_dt)

        else:
            from adapters.mt5_adapter import MT5Adapter
            adapter = MT5Adapter()
            # Fetch for the specific range
            m1_data = adapter.fetch_ohlc_range(req.symbol, "M1", start_dt, end_dt)
            if not m1_data:
                raise HTTPException(
                    status_code=400, 
                    detail="No data found in MT5 for this range. TIP: Open XAUUSD M1 chart in MT5 and scroll back to Oct/Nov 2025 to force terminal download. Also check MT5 > Tools > Options > Charts > 'Max bars in chart'."
                )

        # Initialize engine with custom config if provided
        # Ensure use_sl and use_tp are in config if not provided in req.config
        final_config = req.config or {}
        if "use_sl" not in final_config: final_config["use_sl"] = True
        if "use_tp" not in final_config: final_config["use_tp"] = True

        engine = BacktestEngine(config=final_config)
        
        # Execute with strategy filter
        results = engine.run(m1_data, strategy_filter=req.strategy)

        results["candles"] = m1_data
        return results
    except HTTPException as he:
        # Re-raise HTTP exceptions (like 400 No data)
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def generate_mock_m1_data(start_dt: datetime, end_dt: datetime) -> List[Dict]:
    import random
    delta = end_dt - start_dt
    count = int(delta.total_seconds() / 60)
    if count <= 0: count = 500
    if count > 5000: count = 5000
    
    data = []
    base_price = 2000.0
    for i in range(count):
        change = random.uniform(-1.5, 1.5) 
        open_p = base_price
        close_p = open_p + change
        high_p = max(open_p, close_p) + random.uniform(0, 1.0)
        low_p  = min(open_p, close_p) - random.uniform(0, 1.0)
        
        data.append({
            "timestamp": (start_dt + timedelta(minutes=i)).isoformat(),
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": random.randint(100, 1000)
        })
        base_price = close_p
    return data

