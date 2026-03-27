"""ITrader — abstract interface for trade execution and position management."""
from typing import Protocol, runtime_checkable

@runtime_checkable
class ITrader(Protocol):
    def execute_order(self, symbol: str, lot: float, side: str, sl: float = 0, tp: float = 0) -> dict:
        """Executes a Market Order. Returns {status, ticket, price}."""
        ...

    def get_open_positions(self, symbol: str = None) -> list[dict]:
        """Returns active positions. [{ticket, symbol, type, volume, price_open, sl, tp, profit}]"""
        ...

    def close_position(self, ticket: int) -> bool:
        """Closes a position by ticket."""
        ...
