# AstraTrade AI — Phase 1 MVP Implementation Plan

Build a **modular, loosely coupled** AI trading intelligence system.
- **Backend:** FastAPI + LangGraph + LangChain RAG + MongoDB + ChromaDB
- **Frontend:** React + Vite + **TypeScript**
- **LLM:** OpenAI `gpt-4o-mini`
- **Market Data:** yfinance (free MVP; swap-ready)

> **Greenfield project** — all files created inside `c:\Users\GOKU\Downloads\Info\Sharemarket\XAUUSD\`

---

## User Review Required

> [!IMPORTANT]
> **Confirmed choices (based on your input):**
> - ✅ TypeScript on frontend
> - ✅ Modular / loosely coupled (adapter pattern)
>
> **Still need:**
> 1. Do you have an **OpenAI API key**?
> 2. Do you have a **NewsAPI key**? (free tier at newsapi.org)
> 3. Proceed with **yfinance** for market data (no key needed)?

---

## Architecture Principles

### Loose Coupling Strategy

Every external dependency is wrapped in an **interface + adapter**:

```
Frontend                   Backend
─────────────────────────────────────────
ApiClient (interface)      IMarketDataProvider (interface)
  └── HttpApiAdapter  ←──►   └── YFinanceAdapter  [swap → BrokerAdapter]
  └── MockApiAdapter         ILLMProvider (interface)
                               └── OpenAIAdapter   [swap → ClaudeAdapter / OllamaAdapter]
                             IVectorStore (interface)
                               └── ChromaAdapter   [swap → PineconeAdapter]
                             ISentimentProvider (interface)
                               └── NewsApiAdapter  [swap → GDELTAdapter]
```

**Rule:** No component ever imports a concrete implementation directly — only interfaces.

---

## Proposed Changes

### Production Folder Structure

```text
XAUUSD/
├── KB/                               [existing]
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── db/
│   │   ├── mongodb.py
│   │   └── schemas.py
│   ├── interfaces/                   ← NEW: all abstract interfaces
│   │   ├── market_data.py            IMarketDataProvider
│   │   ├── llm_provider.py           ILLMProvider
│   │   ├── vector_store.py           IVectorStore
│   │   └── sentiment_provider.py     ISentimentProvider
│   ├── adapters/                     ← NEW: concrete implementations
│   │   ├── yfinance_adapter.py
│   │   ├── openai_adapter.py
│   │   ├── chroma_adapter.py
│   │   └── newsapi_adapter.py
│   ├── rag/
│   │   ├── rag_store.py
│   │   └── rag_retriever.py
│   ├── engines/
│   │   ├── feature_extractor.py
│   │   ├── risk_engine.py
│   │   ├── sentiment_engine.py
│   │   ├── expectancy.py
│   │   └── setup_tracker.py
│   ├── graph/
│   │   ├── state.py
│   │   ├── nodes.py
│   │   └── workflow.py
│   └── routes/
│       ├── trades.py
│       ├── analyze.py
│       ├── performance.py
│       └── sentiment.py
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/                    ← NEW: all TS interfaces
        │   ├── trade.ts
        │   ├── decision.ts
        │   ├── performance.ts
        │   └── sentiment.ts
        ├── api/                      ← NEW: adapter pattern
        │   ├── ApiClient.ts          interface IApiClient
        │   ├── HttpApiAdapter.ts     real HTTP calls
        │   └── MockApiAdapter.ts     for local dev / testing
        ├── services/                 ← NEW: business logic layer
        │   ├── TradeService.ts
        │   ├── AnalysisService.ts
        │   ├── PerformanceService.ts
        │   └── SentimentService.ts
        └── components/
            ├── Dashboard.tsx
            ├── TradeJournal.tsx
            ├── AIPanel.tsx
            ├── PerformanceCards.tsx
            └── SentimentWidget.tsx
```

---

### Backend Interfaces (`backend/interfaces/`)

Each file defines a Python `Protocol` (structural typing):

#### `market_data.py`
```python
class IMarketDataProvider(Protocol):
    def fetch_ohlc(self, symbol: str, timeframe: str, bars: int) -> list[dict]: ...
    def get_current_session(self) -> str: ...
```

#### `llm_provider.py`
```python
class ILLMProvider(Protocol):
    def complete(self, prompt: str) -> str: ...
    def embed(self, text: str) -> list[float]: ...
```

#### `vector_store.py`
```python
class IVectorStore(Protocol):
    def upsert(self, id: str, embedding: list[float], metadata: dict) -> None: ...
    def query(self, embedding: list[float], top_k: int) -> list[dict]: ...
```

#### `sentiment_provider.py`
```python
class ISentimentProvider(Protocol):
    def fetch_headlines(self, keywords: list[str]) -> list[str]: ...
```

---

### Frontend TypeScript Types (`frontend/src/types/`)

#### `trade.ts`
```typescript
export interface Trade {
  id?: string;
  pair: string;
  entry: number;
  sl: number;
  tp: number;
  session: 'London' | 'NewYork' | 'Asia';
  setup_type: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  outcome?: 'Win' | 'Loss' | 'Pending';
  notes?: string;
  timestamp?: string;
}
```

#### `decision.ts`
```typescript
export interface Decision {
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  confidence: number;          // 0–1
  sentiment_bias: string;
  conflict: boolean;
  recommendation: 'take' | 'wait' | 'avoid';
  entry_zone: string;
  stop_loss: string;
  take_profit: string;
  risk_percent: number;
  reasoning: string;
}
```

#### `performance.ts`
```typescript
export interface SetupStats {
  setup: string;
  total_trades: number;
  win_rate: number;
  avg_rr: number;
  profit_factor: number;
  max_drawdown: number;
  expectancy: number;          // < 0 = blocked
}
```

#### `sentiment.ts`
```typescript
export interface Sentiment {
  macro_bias: 'bullish_gold' | 'bearish_gold' | 'neutral';
  confidence: number;
  drivers: string[];
  timestamp: string;
}
```

---

### Frontend API Layer (`frontend/src/api/`)

#### `ApiClient.ts` — interface
```typescript
export interface IApiClient {
  getTrades(): Promise<Trade[]>;
  logTrade(trade: Trade): Promise<Trade>;
  runAnalysis(params: AnalysisParams): Promise<Decision>;
  getPerformance(): Promise<SetupStats[]>;
  getSentiment(): Promise<Sentiment>;
}
```

#### `HttpApiAdapter.ts`
Implements `IApiClient` using `axios` against `http://localhost:8000`.

#### `MockApiAdapter.ts`
Implements `IApiClient` using static fixture data — no backend needed for UI dev.

---

### Frontend Services (`frontend/src/services/`)

Services consume **only** `IApiClient` — never `HttpApiAdapter` directly:

```typescript
// TradeService.ts
export class TradeService {
  constructor(private api: IApiClient) {}
  async logTrade(trade: Trade) { return this.api.logTrade(trade); }
  async getAllTrades() { return this.api.getTrades(); }
}
```

Swap the adapter at the app root:
```typescript
// App.tsx — single injection point
const api = import.meta.env.DEV && USE_MOCK
  ? new MockApiAdapter()
  : new HttpApiAdapter(BASE_URL);
```

---

### MongoDB Schemas (`backend/db/schemas.py`)

| Collection | Key Fields |
|---|---|
| `trades` | pair, entry, sl, tp, session, setup_type, bias, outcome, rr, notes, timestamp |
| `setup_stats` | setup, total_trades, win_rate, avg_rr, profit_factor, max_drawdown, expectancy |
| `forward_tests` | mode, decisions_generated, win_rate_live, slippage_avg, execution_errors |
| `sentiment_events` | macro_bias, confidence, drivers, timestamp |

---

### LangGraph State & Nodes (`backend/graph/`)

**State:**
```python
class TradingState(TypedDict):
    ohlc_data: list
    features: dict
    similar_trades: list
    sentiment: dict
    bias: str
    confidence: float
    risk_check: dict
    decision: dict
```

**Node pipeline:**
```
market_data_node → feature_extraction_node → rag_retrieval_node
  → sentiment_node → bias_fusion_node → risk_manager_node → decision_output_node
```

All nodes receive a **provider** via dependency injection from `workflow.py` — never instantiate adapters inside nodes.

---

### REST API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/trades` | `POST` | Log trade + embed into RAG |
| `/trades` | `GET` | List trades (filterable by session/setup) |
| `/analyze` | `POST` | Run LangGraph → return Decision |
| `/performance` | `GET` | Expectancy + per-setup stats |
| `/sentiment` | `GET` | Current macro sentiment (cached 1hr) |

---

### Frontend Design System (`frontend/src/index.css`)

Dark trading terminal aesthetic:
- Background: `#0a0d14`
- Gold accent: `#f0b429`
- Bullish: `#00d4aa` (teal)
- Bearish: `#f56565` (red)
- Font: `Inter` (Google Fonts)
- Glassmorphism cards + subtle gold glow on hover

---

## Verification Plan

### Automated Tests

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Expectancy engine unit test
python -c "from engines.expectancy import calculate_expectancy; assert calculate_expectancy(0.54,200,0.46,100)==62.0; print('✅ Expectancy OK')"

# Graph smoke test
python -c "from graph.workflow import run_analysis; import asyncio; r=asyncio.run(run_analysis({'balance':10000,'risk_pct':0.5})); print('✅ Graph OK:', r['decision'])"

# Frontend
cd ../frontend && npm install && npm run dev
```

### Manual Verification

1. Dashboard loads dark gold theme at `localhost:5173`
2. AI Panel shows bias, confidence, conflict warning, recommendation
3. Trade form submits → appears in journal table
4. Performance cards show expectancy (green/red)
5. Sentiment widget shows macro bias from latest news
6. Swap `MockApiAdapter` → `HttpApiAdapter` → all data flows live
