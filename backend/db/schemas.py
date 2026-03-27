"""Pydantic schemas for all MongoDB collections."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


# ─── Shared ────────────────────────────────────────────────────────────────────

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── Trade ─────────────────────────────────────────────────────────────────────

class TradeCreate(BaseModel):
    pair: str = "XAUUSD"
    entry: float
    sl: float
    tp: float
    session: Literal["London", "NewYork", "Asia"]
    setup_type: str                          # e.g. "FVG + Sweep"
    bias: Literal["Bullish", "Bearish", "Neutral"]
    outcome: Literal["Win", "Loss", "Pending"] = "Pending"
    rr: Optional[float] = None               # realised R:R
    spread: Optional[float] = None           # market spread at entry
    notes: Optional[str] = None


class Trade(TradeCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True


# ─── Setup Stats ───────────────────────────────────────────────────────────────

class SetupStats(BaseModel):
    setup: str
    total_trades: int = 0
    win_rate: float = 0.0
    avg_rr: float = 0.0
    profit_factor: float = 0.0
    max_drawdown: float = 0.0
    expectancy: float = 0.0                  # < 0 = block live


# ─── Forward Test Log ──────────────────────────────────────────────────────────

class ForwardTestLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mode: str = "forward_test"
    decisions_generated: int = 0
    decisions_taken: int = 0
    slippage_avg_pips: float = 0.0
    execution_errors: int = 0
    win_rate_live: float = 0.0
    win_rate_backtest: float = 0.0
    gap: float = 0.0
    trade_count: int = 0
    day_count: int = 0
    live_unlocked: bool = False
    timestamp: datetime = Field(default_factory=utcnow)


# ─── Sentiment Event ───────────────────────────────────────────────────────────

class SentimentEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    macro_bias: Literal["bullish_gold", "bearish_gold", "neutral"]
    confidence: float
    drivers: list[str]
    raw_sentiment: Optional[str] = None
    timestamp: datetime = Field(default_factory=utcnow)


# ─── Decision Output ───────────────────────────────────────────────────────────

class Decision(BaseModel):
    bias: Literal["Bullish", "Bearish", "Neutral"]
    confidence: float
    sentiment_bias: str
    conflict: bool
    recommendation: Literal["take", "wait", "avoid"]
    entry_zone: str
    stop_loss: str
    take_profit: str
    risk_percent: float
    reasoning: str
