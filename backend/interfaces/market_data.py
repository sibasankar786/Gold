"""IMarketDataProvider — abstract interface for any OHLC data source."""
from typing import Protocol, runtime_checkable


@runtime_checkable
class IMarketDataProvider(Protocol):
    def fetch_ohlc(self, symbol: str, timeframe: str, bars: int) -> list[dict]:
        """Return a list of OHLC candle dicts: {timestamp, open, high, low, close, volume}."""
        ...

    def get_current_session(self) -> str:
        """Return current trading session: 'London' | 'NewYork' | 'Asia' | 'Off'."""
        ...

    def get_current_price(self, symbol: str) -> float:
        """Return the latest available price for the given symbol."""
        ...
