"""RiskEngine — lot size calculation and daily limit enforcement."""
from __future__ import annotations
from config import settings


def calculate_lot_size(
    balance: float,
    risk_pct: float,
    sl_pips: float,
    pip_value: float = 10.0,   # USD per pip per standard lot (XAUUSD default)
) -> float:
    """
    Formula: lots = (balance × risk_pct) / (sl_pips × pip_value)
    Returns rounded lot size (0.01 minimum).
    """
    if sl_pips <= 0 or pip_value <= 0:
        return 0.01
    risk_amount = balance * (risk_pct / 100)
    lot_size = risk_amount / (sl_pips * pip_value)
    return max(round(lot_size, 2), 0.01)


def check_daily_limits(
    daily_trade_count: int,
    daily_loss_pct: float,
) -> dict:
    """
    Returns {allowed: bool, reason: str}
    """
    if daily_trade_count >= settings.max_daily_trades:
        return {
            "allowed": False,
            "reason": f"Daily trade limit reached ({settings.max_daily_trades} trades).",
        }
    if daily_loss_pct >= settings.max_daily_loss_pct:
        return {
            "allowed": False,
            "reason": f"Daily loss limit hit ({settings.max_daily_loss_pct}%). Stop trading today.",
        }
    return {"allowed": True, "reason": "Within limits."}


def validate_rr(entry: float, sl: float, tp: float, min_rr: float = 1.5) -> dict:
    """Validate that the trade has acceptable Risk:Reward."""
    risk   = abs(entry - sl)
    reward = abs(tp - entry)
    if risk == 0:
        return {"valid": False, "rr": 0.0, "reason": "SL equals entry."}
    rr = round(reward / risk, 2)
    if rr < min_rr:
        return {"valid": False, "rr": rr, "reason": f"R:R {rr} below minimum {min_rr}."}
    return {"valid": True, "rr": rr, "reason": f"R:R {rr} is acceptable."}
