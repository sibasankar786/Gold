# 🌐 AstraTrade AI: Full Technical Walkthrough & Project Documentation

This document provides a deep-dive into the entire AstraTrade AI ecosystem, explaining the architecture, data flows, core logic, and file structures.

---

## 🏗️ System Architecture Overview

The system is built as a modular, loosely coupled microservices architecture consisting of three primary layers:

1.  **FastAPI Backend (Python)**: The "Brain". Handles AI analysis, RAG memory, market data adapters, and the core decision-making pipeline.
2.  **NestJS Backend (Node.js)**: The "Execution Engine". Specialized in high-frequency price polling and reactive strategies (Strategy 5 & 10).
3.  **React Frontend (Vite)**: The "User Interface". Provides a real-time trading dashboard and journal.

---

## 🧠 1. FastAPI Backend (The Brain)

### 🚀 Entry Point: `backend/main.py`
The FastAPI application serves as the central hub for AI intelligence. It integrates several routers and manages the lifecycle of the `AutoTrader` engine.

### ⛓️ LangGraph Analysis Pipeline (`backend/graph/workflow.py`)
The heart of the intelligence system is a **LangGraph** state machine that processes market data through a series of specialized nodes:

1.  **Market Data Node**: Fetches OHLC and session info (Asia/London/NY) via the configured adapter.
2.  **Feature Extraction Node**: Calculates technical indicators (ATR, FVG, Market Structure, Session bias).
3.  **RAG Retrieval Node**: Queries **ChromaDB** for the top-5 most similar historical trades to provide context to the LLM.
4.  **Sentiment Node**: Scrapes news via NewsAPI and uses an LLM to determine macro bias (1-hour cache).
5.  **Bias Fusion Node**: An LLM (Gemini or OpenAI) synthesizes all previous signals to produce a unified bias (Bullish/Bearish/Neutral) and a conflict flag.
6.  **Risk Manager Node**: Calculates optimal lot size and validates daily loss limits.
7.  **Decision Output Node**: Finalizes the recommendation (`take`, `wait`, or `avoid`) with reasoning and confidence scores.

### 🔄 AutoTrader Loop (`backend/engines/autotrader.py`)
A background task that runs a periodic analysis loop (default: every 120s):
- Checks for existing open positions on MT5 to avoid over-leveraging.
- Triggers the LangGraph analysis.
- If confidence is ≥ 0.70 and recommendation is "take", it executes a market order via the `MT5Adapter`.
- Automatically journals the trade into the RAG system for future learning.

### 🔌 Adapter Pattern (Decoupling)
The system uses Python Protocols (interfaces) to remain agnostic of external providers:
- **`IMarketDataProvider`**: Swappable between `MT5Adapter` and `YFinanceAdapter`.
- **`ILLMProvider`**: Swappable between `GeminiAdapter` and `OpenAIAdapter`.
- **`IVectorStore`**: `ChromaAdapter` for local vector storage.
- **`ISentimentProvider`**: `NewsAPIAdapter`.

---

## ⚙️ 2. NestJS Backend (The Execution Engine)

### 🏎️ Price Update & Strategy 5/10 (`auto-trade-backend/src/auto-trade/auto-trade.service.ts`)
The NestJS service is designed for speed and precision in execution. It implements two reactive strategies:

- **Strategy 5**: Uses a 5-pip threshold for entry/reversal.
- **Strategy 10**: Uses a 10-pip threshold for entry/reversal.
- **Breakout Scalping**: A candle-based strategy using M1 and M5 data:
    - **Timeframe Layering**: M1 for fast execution, M5 for structural trend filtering.
    - **Volatility Filter**: Last 5 M1 candles must have a range > 3.5 points to avoid trade traps in dead markets.
    - **Trend Confirmation**: Entry only allowed if EMA9 > EMA21 on M5 (Bullish) or EMA9 < EMA21 (Bearish).
    - **Momentum Signal**: Breakout of the last 10 M1 candles with a strong body candle (Ratio > 0.6 body-to-wick).
    - **Fakeout Protection**: Implements a 2-tick confirmation window. The breakout must be sustained across two consecutive polling cycles (approx. 2s) to prevent entering on "instant reversals" or wicks, ensuring momentum is confirmed.

- **Liquidity Grab (Sweep)**: A high-win-rate reversal strategy:
    - **Detection**: Price sweeps (breaks and closes back inside) the high or low of the last 15 M1 candles.
    - **Rejection Confirmation**: The sweeping candle must show a prominent wick (Wick > Body * 1.5), signaling a "stop hunt" and immediate reversal.
    - **AI Sync**: Sweeps are filtered to only trade in the direction of the AI bias (or if bias is neutral).
- **Dynamic Strategy Selection**:
    - **Market State Analysis (M5)**: Evaluates M5 candles every polling cycle to determine one of four states: `TREND_BULLISH` (EMA9 > EMA21 + distance), `TREND_BEARISH` (EMA9 < EMA21 + distance), `RANGE` (Range < 8 pts), or `NEUTRAL`.
    - **Intelligent Routing**: Automatically routes price updates to the **Breakout** strategy during Trend states and the **Liquidity Grab** strategy during Range states.
    - **AI Bias Filter**: Enforces strict alignment between technical signals and the LangGraph AI Output (Bullish/Bearish). Trades are skipped if technical state and AI bias are in conflict.


#### **Core Logic Flow:**
1.  **Price Update Hook**: Triggered by `AutoTradePollingService` every 1000ms.
2.  **Entry Condition**: If no position is open, it opens a `BUY` or `SELL` trade on a trigger.
3.  **Trailing Stop Activation**: 
    - Once the price moves in profit by the strategy threshold (e.g., 5 pips), **Trailing Active** is set to true.
    - It then tracks the **Peak Price** (for BUYS) or **Lowest Price** (for SELLS).
4.  **Exit Condition (Pullback)**:
    - If Trailing is active, it exits the trade if the price pulls back by **2 pips** from the peak/low.

---

## 📊 3. React Frontend (The UI)

### 🛠️ Architecture
- **Vite + TypeScript**: Fast development and type safety.
- **Adapter Pattern**: Uses `HttpApiAdapter` for live data and `MockApiAdapter` for development/testing. *Note: Currently hardcoded to HttpApiAdapter in App.tsx.*
- **Real-time Updates**: Polls the backend for price, analysis status, and trade history.

### 🧩 Key Components
- **`AIPanel.tsx`**: Visualizes the LangGraph decision, confidence levels, and reasoning.
- **`TradeJournal.tsx`**: A searchable, color-coded table of all historical trades (fetched from MongoDB). **Features include search, filtering by outcome, sorting (Date, Entry, R:R), and a real-time header with Gross Profit, Gross Loss, Highest Profit, Highest Loss, Net P/L, and Net R:R.** It also includes a "Spread" column for execution quality tracking.

- **`PerformanceCards.tsx`**: Displays expectancy, win rate, and the "Edge Validation Gate".
- **`SentimentWidget.tsx`**: Shows the macro drivers and current session sentiment.

---

## 📂 Project Structure Map

```text
XAUUSD/
├── backend/                       # FastAPI Brain (Python)
│   ├── adapters/                  # Concrete implementations (MT5, Gemini, etc.)
│   ├── engines/                   # Risk, Sentiment, Feature extraction engines
│   ├── graph/                     # LangGraph workflow and node definitions
│   ├── interfaces/                # Abstract protocols for decoupling
│   ├── rag/                       # RAG storage and retrieval logic
│   ├── routes/                    # API Endpoints (trades, analyze, market)
│   └── main.py                    # App entry point
├── auto-trade-backend/            # NestJS Execution Engine (Node.js)
│   ├── src/
│   │   ├── auto-trade/            # Polling, Strategy 5/10, Trailing logic
│   │   └── main.ts                # App entry point
├── frontend/                      # React Dashboard (Vite)
│   ├── src/
│   │   ├── api/                   # API Adapters (Mock vs Real)
│   │   ├── components/            # UI Components (Dashboard, Journal, etc.)
│   │   └── services/              # Business logic for the UI
└── KB/                            # Project Knowledge Base
```

---

## 📈 End-to-End Trade Lifecycle

1.  **Discovery**: `AutoTrader` (Python) or the User (Frontend) triggers an analysis.
2.  **Analysis**: LangGraph fetches market data, extracts features, retrieves RAG context, and determines a bias.
3.  **Execution**: 
    - If the signal is strong, the Python `AutoTrader` executes a trade on MT5.
    - Alternatively, the NestJS engine monitors live price and executes Strategy 5/10 when thresholds are hit.
4.  **Monitoring**: NestJS polls price every second, updating the trailing stop and peak prices in the database.
5.  **Exit**: NestJS triggers a 2-pip pullback exit.
6.  **Safety Check**: Before any execution, the system verifies the **Market Spread** using MT5 tick data. If `spread > 0.5` (or the configured `MAX_SPREAD`), the trade is skipped to prevent instant slippage loss. This check is enforced both in the Python periodic loop and the manual/NestJS execution API.
7.  **Journaling**: The entry price, **current spread**, and outcome are updated in the MongoDB `trades` collection. The Python backend auto-embeds this trade into ChromaDB for future RAG retrieval.

---

## ⚙️ Key Technical Thresholds

- **Polling Frequency**: 1000ms (NestJS).
- **Auto-Trade Analysis**: 120s (Python).
- **Auto-Trade Confidence Gate**: 0.70 (70% confidence required).
- **Trailing Pullback**: 2 pips.
- **Strategies**: 5 pips (Fast), 10 pips (Normal), **Breakout**, and **Liquidity Grab**.
- **Volatility Filter (M1)**: Last 5 candles range > 3.5 pts.
- **Trend Filter (M5)**: EMA 9/21 Crossover (for Breakouts).
- **Sweep Range**: Last 15 M1 candles.
- **Risk Limit**: 1% max per trade (default).
- **Spread Filter**: Skip if `spread > 0.5 pips` (configurable via `MAX_SPREAD`). **Recorded in the Trade Journal for every automated and manual entry.**
- **Spread-Adjusted SL/TP**: Initial broker orders are dynamically modified using `effectiveSL = baseSL + spread` and `effectiveTP = baseTP - spread`, ensuring extraction of exact profit targets despite varying execution costs.

- **Max Positions**: 20 concurrent trades (shared limit across Python/NestJS).

---

## 🛠️ Startup Sequence

1.  **MongoDB**: `docker-compose up -d`
2.  **Python Brain**: `cd backend && uvicorn main:app --port 8000 --reload`
3.  **NestJS Engine**: `cd auto-trade-backend && npm run start:dev`
4.  **Frontend**: `cd frontend && npm run dev`
