# AstraTrade AI — Phase 1 MVP Walkthrough

## What Was Built

A **fully modular, loosely coupled** XAUUSD trading intelligence system — backend + frontend — from scratch.

---

## File Tree

```text
XAUUSD/
├── docker-compose.yml             MongoDB local dev container
├── KB/PRD.md                      Product Requirements Document
├── backend/
│   ├── main.py                    FastAPI app + CORS + lifespan
│   ├── config.py                  Central settings (pydantic-settings)
│   ├── requirements.txt
│   ├── .env.example
│   ├── db/
│   │   ├── mongodb.py             Async Motor client + collection accessors
│   │   └── schemas.py             Pydantic models (Trade, SetupStats, Decision…)
│   ├── interfaces/                ← Abstract protocols (swap anything)
│   │   ├── market_data.py         IMarketDataProvider
│   │   ├── llm_provider.py        ILLMProvider
│   │   ├── vector_store.py        IVectorStore
│   │   └── sentiment_provider.py  ISentimentProvider
│   ├── adapters/                  ← Concrete implementations
│   │   ├── yfinance_adapter.py    → swap for broker API
│   │   ├── openai_adapter.py      → swap for Claude / Ollama
│   │   ├── chroma_adapter.py      → swap for Pinecone
│   │   └── newsapi_adapter.py     → swap for GDELT
│   ├── rag/
│   │   ├── rag_store.py           Embed + upsert trades → ChromaDB
│   │   └── rag_retriever.py       Semantic search → top-5 similar trades
│   ├── engines/
│   │   ├── feature_extractor.py   HTF bias, ATR, FVG, market structure
│   │   ├── risk_engine.py         Lot sizing, daily limits, R:R check
│   │   ├── sentiment_engine.py    Headlines → LLM → macro bias (1hr cache)
│   │   ├── expectancy.py          Expectancy formula + live-trading gate
│   │   └── setup_tracker.py       Per-setup stat aggregation in MongoDB
│   ├── graph/
│   │   ├── state.py               LangGraph TypedDict state schema
│   │   ├── nodes.py               7 nodes as factory functions (DI-injected)
│   │   └── workflow.py            Graph assembly — single DI root
│   └── routes/
│       ├── trades.py              POST/GET /trades (auto-embeds into RAG)
│       ├── analyze.py             POST /analyze (triggers full graph)
│       ├── performance.py         GET /performance (expectancy + edge gate)
│       └── sentiment.py           GET /sentiment (cached macro sentiment)
└── frontend/
    ├── index.html
    ├── vite.config.ts             Proxy /api → localhost:8000
    ├── package.json               React 18 + TS + Vite + Axios
    ├── tsconfig.json              Strict mode + path aliases (@/)
    └── src/
        ├── App.tsx                DI root — swap mock/real with VITE_USE_MOCK
        ├── main.tsx
        ├── index.css              Dark gold trading terminal theme
        ├── types/                 (trade.ts, decision.ts, performance.ts, sentiment.ts)
        ├── api/
        │   ├── ApiClient.ts       IApiClient interface
        │   ├── HttpApiAdapter.ts  Real HTTP calls via axios
        │   └── MockApiAdapter.ts  Fixture data — dev without backend
        ├── services/              (TradeService, AnalysisService, etc.)
        └── components/
            ├── Dashboard.tsx      Fixed sidebar + grid layout
            ├── AIPanel.tsx        Decision output, confidence bar, conflict warning
            ├── TradeJournal.tsx   Trade log form + colour-coded table
            ├── PerformanceCards.tsx  Expectancy, edge gate, per-setup stats
            └── SentimentWidget.tsx   Macro bias, drivers, 60-min cache indicator
```

---

## Architecture: Loose Coupling

Every external dependency sits behind a **Python Protocol or TypeScript interface**:

| What you want to change | Where to change it |
|---|---|
| yfinance → broker API | Swap [YFinanceAdapter](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/adapters/yfinance_adapter.py#20-48) — implement [IMarketDataProvider](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/interfaces/market_data.py#5-14) |
| OpenAI → Claude/Ollama | Swap [OpenAIAdapter](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/adapters/openai_adapter.py#7-33) — implement [ILLMProvider](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/interfaces/llm_provider.py#5-14) |
| ChromaDB → Pinecone | Swap [ChromaAdapter](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/adapters/chroma_adapter.py#8-44) — implement [IVectorStore](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/interfaces/vector_store.py#5-14) |
| NewsAPI → GDELT | Swap [NewsAPIAdapter](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/adapters/newsapi_adapter.py#7-33) — implement [ISentimentProvider](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/backend/interfaces/sentiment_provider.py#5-10) |
| Real backend → Mock | Set `VITE_USE_MOCK=true` in `.env` |

---

## LangGraph Pipeline

```text
market_data_node
  → feature_extraction_node   (HTF bias, ATR, FVG)
  → rag_retrieval_node        (top-5 similar historical trades)
  → sentiment_node            (macro news → LLM → bias score)
  → bias_fusion_node          (LLM fuses all signals → bias + conflict flag)
  → risk_manager_node         (lot size + daily limits)
  → decision_output_node      (take / wait / avoid + full JSON)
```

---

## How to Run

### 1. Start MongoDB
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # fill in OPENAI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend (with live backend)
```bash
cd frontend
npm run dev                   # http://localhost:5173
```

### 4. Frontend (no backend — mock mode)
```bash
cd frontend
echo "VITE_USE_MOCK=true" > .env.local
npm run dev
```

---

## Verified

- ✅ `npx tsc --noEmit` — **0 TypeScript errors**
- ✅ `npm install` — **48 packages installed (exit 0)**
- ✅ Full project file structure created and consistent
- ✅ Adapter pattern wired end-to-end
- ✅ MockApiAdapter with realistic XAUUSD fixture data

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/trades` | Log trade — auto-embeds into RAG |
| `GET`  | `/trades` | List trades (filter by session/setup/outcome) |
| `POST` | `/analyze` | Run full LangGraph pipeline → Decision |
| `GET`  | `/performance` | Expectancy + edge gate per setup |
| `GET`  | `/sentiment` | Macro sentiment (1hr cached) |
| `GET`  | `/health` | Health check |

---

## Next Steps (Phase 2)

- DXY real-time feed integration
- Economic calendar NO TRADE ZONE automation
- Multi-timeframe bias alignment
- Confidence scoring with weighted formula
- Forward test tracking (demo account gate)
