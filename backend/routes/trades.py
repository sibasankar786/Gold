"""Trades routes — log and query trades."""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from db.schemas import TradeCreate, Trade
from db.mongodb import trades_col
from graph.workflow import rag_store
from engines.setup_tracker import compute_and_save_stats

router = APIRouter(prefix="/trades", tags=["trades"])


@router.post("", response_model=Trade, status_code=201)
async def log_trade(payload: TradeCreate):
    trade = Trade(**payload.model_dump())
    doc = trade.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat() if hasattr(doc["timestamp"], "isoformat") else str(doc["timestamp"])
    
    print(f"[DEBUG] Saving trade to DB: {doc}")
    result = await trades_col().insert_one(doc)
    print(f"[DEBUG] DB Insert result: {result.inserted_id}")

    # Embed into RAG vector store and compute stats ONLY if completed
    if trade.outcome in ["Win", "Loss"]:
        try:
            rag_store.store_trade(trade)
        except Exception as e:
            print(f"[RAG] Warning: could not embed trade — {e}")

        try:
            await compute_and_save_stats(trade.setup_type)
        except Exception as e:
            print(f"[Stats] Warning: could not update stats — {e}")

    return trade


@router.put("/{trade_id}", response_model=Trade)
async def update_trade(trade_id: str, payload: dict):
    result = await trades_col().update_one({"id": trade_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    updated_doc = await trades_col().find_one({"id": trade_id}, {"_id": 0})
    trade_obj = Trade(**updated_doc)

    if trade_obj.outcome in ["Win", "Loss"]:
        try:
            rag_store.store_trade(trade_obj)
            await compute_and_save_stats(trade_obj.setup_type)
        except Exception as e:
            print(f"[Stats/RAG] Warning: post-update tasks failed — {e}")

    return trade_obj


@router.get("", response_model=list[Trade])
async def list_trades(
    session:    str | None = Query(None),
    setup_type: str | None = Query(None),
    outcome:    str | None = Query(None),
    limit:      int        = Query(1000, ge=1, le=2000),
):
    query: dict = {}
    if session:    query["session"]    = session
    if setup_type: query["setup_type"] = setup_type
    if outcome:    query["outcome"]    = outcome

    cursor = trades_col().find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return docs
