"""FeatureExtractor — derives trading features (bias, structure, ATR) from OHLC candles."""
from __future__ import annotations
import statistics
from datetime import datetime, timezone


def _calculate_atr(candles: list[dict], period: int = 14) -> float:
    """Average True Range over the last `period` candles."""
    if len(candles) < 2:
        return 0.0
    trs = []
    for i in range(1, min(period + 1, len(candles))):
        c = candles[-i]
        p = candles[-i - 1]
        tr = max(
            c["high"] - c["low"],
            abs(c["high"] - p["close"]),
            abs(c["low"]  - p["close"]),
        )
        trs.append(tr)
    return round(statistics.mean(trs), 2) if trs else 0.0


def _detect_bias(candles: list[dict], lookback: int = 20) -> str:
    """Simple HTF bias: compare recent closes to determine trend direction."""
    if len(candles) < lookback:
        return "Neutral"
    recent = candles[-lookback:]
    closes = [c["close"] for c in recent]
    first_half_avg = statistics.mean(closes[: lookback // 2])
    second_half_avg = statistics.mean(closes[lookback // 2 :])
    if second_half_avg > first_half_avg * 1.002:
        return "Bullish"
    elif second_half_avg < first_half_avg * 0.998:
        return "Bearish"
    return "Neutral"


def _detect_structure(candles: list[dict]) -> str:
    """Detect market structure: Trending, Ranging, or Volatile."""
    if len(candles) < 10:
        return "Unknown"
    highs = [c["high"] for c in candles[-20:]]
    lows  = [c["low"]  for c in candles[-20:]]
    range_size = max(highs) - min(lows)
    atr = _calculate_atr(candles)
    if atr == 0:
        return "Unknown"
    ratio = range_size / (atr * 20)
    if ratio > 1.5:
        return "Trending"
    elif ratio < 0.7:
        return "Ranging"
    return "Volatile"


def _detect_fvg(candles: list[dict]) -> bool:
    """Detect a Fair Value Gap in the last 5 candles."""
    for i in range(2, min(5, len(candles))):
        prev   = candles[-i - 1]
        _curr  = candles[-i]
        nxt    = candles[-i + 1]
        # Bullish FVG: gap between prev high and next low
        if nxt["low"] > prev["high"]:
            return True
        # Bearish FVG: gap between prev low and next high
        if nxt["high"] < prev["low"]:
            return True
    return False


def extract_features(candles: list[dict], session: str) -> dict:
    """
    Main entry point. Returns a feature dict consumed by the LangGraph state.
    """
    if not candles:
        return {}

    last = candles[-1]
    return {
        "session":        session,
        "bias":           _detect_bias(candles),
        "structure":      _detect_structure(candles),
        "atr":            _calculate_atr(candles),
        "has_fvg":        _detect_fvg(candles),
        "last_close":     last["close"],
        "last_high":      last["high"],
        "last_low":       last["low"],
        "candle_count":   len(candles),
        "extracted_at":   datetime.now(timezone.utc).isoformat(),
    }
