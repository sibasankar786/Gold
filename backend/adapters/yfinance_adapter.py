"""YFinanceAdapter — implements IMarketDataProvider using yfinance (free, no API key)."""
from __future__ import annotations
import yfinance as yf
import pandas as pd
from datetime import datetime, timezone


_TIMEFRAME_MAP = {
    "1m": "1m", "5m": "5m", "15m": "15m",
    "1h": "1h", "4h": "4h", "1d": "1d",
}

_SESSION_WINDOWS = {
    "Asia":    (0,   8),   # UTC hours
    "London":  (7,  16),
    "NewYork": (12, 21),
}


class YFinanceAdapter:
    """Concrete market data provider using yfinance."""

    def fetch_ohlc(self, symbol: str, timeframe: str, bars: int) -> list[dict]:
        interval = _TIMEFRAME_MAP.get(timeframe, "1h")
        # yfinance period mapping: enough history for `bars` candles
        period = "60d" if interval in ("1h", "4h") else "5d"
        ticker = yf.Ticker(symbol)
        df: pd.DataFrame = ticker.history(period=period, interval=interval)
        df = df.tail(bars).reset_index()
        candles = []
        for _, row in df.iterrows():
            candles.append({
                "timestamp": str(row.get("Datetime", row.get("Date", ""))),
                "open":  round(float(row["Open"]), 2),
                "high":  round(float(row["High"]), 2),
                "low":   round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": float(row.get("Volume", 0)),
            })
        return candles

    def get_current_session(self) -> str:
        hour = datetime.now(timezone.utc).hour
        for session, (start, end) in _SESSION_WINDOWS.items():
            if start <= hour < end:
                return session
        return "Off"

    def get_current_price(self, symbol: str) -> float:
        """Fetch current price using fast_info or latest history."""
        ticker = yf.Ticker(symbol)
        # Using fast_info for minimal latency
        price = ticker.fast_info.get("lastPrice")
        if price:
            return round(float(price), 2)
        
        # Fallback to history if fast_info fails
        df = ticker.history(period="1d", interval="1m")
        if not df.empty:
            return round(float(df["Close"].iloc[-1]), 2)
        return 0.0
