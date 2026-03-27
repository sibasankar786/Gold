"""FastAPI application entrypoint."""
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.mongodb import get_client, close_client
from routes import trades, analyze, performance, sentiment, market, automation, backtest

from graph.workflow import market_adapter
from engines.autotrader import AutoTrader

# Instantiate AutoTrader singleton
# Note: market_adapter from workflow.py is an MT5Adapter which implements ITrader
autotrader_engine = AutoTrader(trader=market_adapter)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    get_client()  # initialise MongoDB connection
    yield
    # Shutdown
    autotrader_engine.stop()
    await close_client()


app = FastAPI(
    title="AstraTrade AI",
    description="RAG + LangGraph XAUUSD Trading Intelligence System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(trades.router)
app.include_router(analyze.get_analyze_router(autotrader_engine))
app.include_router(performance.router)
app.include_router(sentiment.router)
app.include_router(market.get_market_router(market_adapter))
app.include_router(automation.get_automation_router(autotrader_engine))
app.include_router(backtest.router)



@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "AstraTrade AI"}
