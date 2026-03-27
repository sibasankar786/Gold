"""LangGraph state schema — all data flows through this TypedDict."""
from __future__ import annotations
from typing import TypedDict, Optional


class TradingState(TypedDict):
    # Inputs
    balance:         float
    risk_pct:        float
    daily_trades:    int
    daily_loss_pct:  float

    # Market data node output
    ohlc_data:       list[dict]
    current_session: str

    # Feature extraction node output
    features:        dict

    # RAG retrieval node output
    similar_trades:  list[dict]

    # Sentiment node output
    sentiment:       dict

    # Bias fusion node output
    bias:            str          # "Bullish" | "Bearish" | "Neutral"
    confidence:      float        # 0.0 – 1.0
    conflict:        bool

    # Risk manager node output
    risk_check:      dict         # {allowed, reason, lot_size, rr}

    # Final decision output
    decision:        dict
