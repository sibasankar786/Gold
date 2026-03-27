from fastapi import APIRouter, Depends
from interfaces.market_data import IMarketDataProvider
from config import settings

def get_market_router(market: IMarketDataProvider):
    router = APIRouter(prefix="/market", tags=["market"])

    @router.get("/price")
    async def get_price():
        """Returns the current price and spread for the configured symbol."""
        price = market.get_current_price(settings.market_symbol)
        spread = market.get_spread(settings.market_symbol)
        return {
            "symbol": settings.market_symbol,
            "price": price,
            "spread": spread,
            "session": market.get_current_session()
        }

    @router.get("/candles")
    async def get_candles(timeframe: str = "1m", bars: int = 20):
        """Returns recent OHLC candles."""
        candles = market.fetch_ohlc(settings.market_symbol, timeframe, bars)
        return {
            "symbol": settings.market_symbol,
            "timeframe": timeframe,
            "candles": candles
        }

    return router
