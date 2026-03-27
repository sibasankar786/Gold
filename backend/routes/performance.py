"""Performance route — expectancy, setup stats, and edge evaluation."""
from __future__ import annotations
from fastapi import APIRouter
from engines.setup_tracker import get_all_stats
from engines.expectancy import evaluate_edge

router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("")
async def get_performance():
    """Returns all setup stats with edge evaluation for each."""
    stats = await get_all_stats()
    enriched = []
    for s in stats:
        edge = evaluate_edge(s)
        enriched.append({**s, "edge_evaluation": edge})

    # Overall
    all_expectancies = [s.get("expectancy", 0) for s in stats]
    overall = {
        "avg_expectancy": round(sum(all_expectancies) / len(all_expectancies), 4) if all_expectancies else 0,
        "live_allowed":   all(e["edge_evaluation"]["live_allowed"] for e in enriched) if enriched else False,
    }
    return {"overall": overall, "setups": enriched}
