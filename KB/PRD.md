# 📄 PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Product:** AstraTrade AI *(working name)*
**Subtitle:** AI-powered Trading Copilot using RAG + LangGraph
**Focus:** XAUUSD (Gold) — Multi-layer Intelligence System

---

## Table of Contents

1. [Product Vision](#1--product-vision)
2. [Problem Statement](#2--problem-statement)
3. [Goals & Objectives](#3--goals--objectives)
4. [Target Users](#4--target-users)
5. [System Overview](#5--system-overview)
6. [Core Features](#6--core-features)
7. [Advanced Intelligence Modules](#7--advanced-intelligence-modules)
   * 7.17 Edge Validation System
   * 7.18 Forward Testing Engine
   * 7.19 Expectancy Engine
8. [Technical Architecture](#8--technical-architecture)
9. [AI / LLM Design](#9--ai--llm-design)
10. [Functional Requirements](#10--functional-requirements)
11. [Non-Functional Requirements](#11--non-functional-requirements)
12. [Metrics & KPIs](#12--metrics--kpis)
13. [Phased Roadmap](#13--phased-roadmap)
14. [Risks & Limitations](#14--risks--limitations)
15. [Guardrails](#15--guardrails)
16. [Future Extensions](#16--future-extensions)

---

# 1. 🎯 Product Vision

Build an **AI-assisted trading system** that:

* Understands market context (not just indicators)
* Learns from past trades (RAG memory)
* Guides decision-making (not blind execution)
* Enforces discipline & risk management
* Integrates macro intelligence (DXY, yields, sentiment)

---

# 2. 🚨 Problem Statement

Retail traders:

* Overtrade and lack consistency
* Ignore risk management
* Cannot analyze past performance effectively
* Only use price + indicators — missing macro signals

> Traders lose due to poor discipline, revenge trading, and lack of structure.

Most traders fail because they use **price + indicators alone**.
Prop firms, quant desks, and smart money operate with **multi-layer intelligence systems**.

---

# 3. 🎯 Goals & Objectives

## Primary Goals

* Reduce trading mistakes by **50%+**
* Improve decision quality using **historical context + macro signals**
* Enable **semi-automated intelligent trading**

## Secondary Goals

* Build a **self-learning trading system**
* Create reusable **AI trading workflows**
* Graduate from retail → **hedge-fund style intelligence**

---

# 4. 👤 Target Users

### Primary

* Retail traders (XAUUSD focus initially)
* Algo traders transitioning to AI

### Secondary

* Quant hobbyists
* AI engineers in the trading domain

---

# 5. 🧩 System Overview

```text
User
  → Dashboard
  → LangGraph Engine
  → RAG System + Macro Engine
  → LLM
  → Decision Output
  → Execution Layer
```

---

# 6. 🧱 Core Features

---

## 6.1 Market Context Engine

Analyzes price structure using SMC/ICT methodology.

**Inputs:** OHLC data · Session timing · Key levels

**Outputs:** Bias (Bullish/Bearish/Neutral) · Key zones

**Detects:**
* Market structure (HTF bias)
* Liquidity zones (equal highs/lows, stop clusters)
* Session behavior (London, NY, Asia)
* FVG, order blocks, sweeps

---

## 6.2 RAG-Based Trade Memory

Stores and retrieves past trade context for decision-making.

**Data Schema:**

```json
{
  "trade_id": "",
  "pair": "XAUUSD",
  "entry": "",
  "sl": "",
  "tp": "",
  "session": "London",
  "setup_type": "FVG + Sweep",
  "bias": "Bullish",
  "outcome": "Win/Loss",
  "notes": ""
}
```

**Pipeline:**
1. Embed trade data
2. Store in vector DB
3. Retrieve top-k similar trades
4. Pass to LLM for reasoning

---

## 6.3 AI Decision Engine

Uses current market state + retrieved historical trades to produce:

* Trade recommendation
* Confidence score
* Risk suggestion

---

## 6.4 LangGraph Workflow Engine

### Full Node Pipeline:

```text
START
  → Market Data Node
  → Feature Extraction Node
  → RAG Retrieval Node
  → Sentiment Analysis Node
  → Macro Engine Node (DXY + Yields + Rates)
  → Bias Fusion Node
  → Setup Validation Node
  → Risk Manager Node
  → Decision Output Node
END
```

---

## 6.5 Risk Management Engine

* Max **0.5–1% risk** per trade
* Daily / weekly loss limits

**Features:**
* Auto lot size calculation
* Risk validation before entry
* Trade blocking if limits exceeded

---

## 6.6 Smart Alert System

* Liquidity sweep alerts
* FVG detection alerts
* Session breakout alerts
* News risk warnings (CPI, NFP, FOMC)

---

## 6.7 Trade Journal (Auto + AI Enhanced)

**Features:**
* Auto logging of every trade
* Screenshot storage
* AI-generated insights:
  * *"You lose 70% of trades taken in the NY session"*
  * *"FVG setups perform best for you"*
  * *"You lose 80% of trades after 2 consecutive losses — stop trading"*

---

## 6.8 News & Sentiment Intelligence Engine

Gold (XAUUSD) is heavily news-driven:
* Fed decisions → gold spikes
* CPI data → volatility
* War / geopolitics → safe-haven demand

### Sentiment Pipeline:

**Step 1 — News Ingestion**

Sources: NewsAPI · GDELT · Alpha Vantage · Economic calendar APIs

**Step 2 — Preprocessing**

* Remove noise, deduplicate
* Filter: `gold, XAUUSD, Fed, inflation, CPI, interest rates, USD, recession`

**Step 3 — Sentiment Analysis (LLM + NLP)**

```json
{
  "sentiment": "bullish_gold",
  "confidence": 0.81,
  "reason": "Weak USD + recession fears"
}
```

**Step 4 — Event Classification**

| Type        | Events              |
| ----------- | ------------------- |
| High Impact | Fed, CPI, NFP, FOMC |
| Medium      | USD strength, yields|
| Low         | General news        |

**Step 5 — Macro Context Builder**

```json
{
  "macro_bias": "bullish_gold",
  "confidence": 0.76,
  "drivers": ["Fed dovish stance", "USD weakness"]
}
```

### Sentiment Memory (RAG Extension):

```json
{
  "event": "CPI high",
  "market_reaction": "gold dump",
  "lesson": "avoid longs during high CPI"
}
```

---

## 6.9 Natural Language Interface

Users can ask:

* *"Should I take this trade?"*
* *"Why am I losing?"*
* *"Show similar setups"*

---

# 7. 🧠 Advanced Intelligence Modules

These are the exact signals used by hedge funds and prop desks to gain real edge on XAUUSD.

---

## 7.1 USD Strength Engine (CRITICAL)

Gold is **inversely correlated with USD**.

**Track:** DXY (US Dollar Index) · USD momentum

| Signal  | Gold Impact |
| ------- | ----------- |
| USD ↑   | Gold ↓      |
| USD ↓   | Gold ↑      |

**What to add:** Real-time DXY feed · Correlation tracker

```json
{
  "dxy_trend": "bullish",
  "impact_on_gold": "bearish",
  "confidence": 0.82
}
```

> Feeds directly into the **Bias Fusion Node**

---

## 7.2 US Bond Yields Engine (Smart Money Signal)

**Track:** US 10Y Treasury Yield

| Signal    | Gold Impact                         |
| --------- | ----------------------------------- |
| Yields ↑  | Gold ↓ (non-yield asset unattractive) |
| Yields ↓  | Gold ↑                              |

> Institutions react to yield changes faster than retail.

---

## 7.3 Real Interest Rate Model

**Formula:**

```text
Real Rate = Interest Rate – Inflation
```

| Real Rate | Gold Impact   |
| --------- | ------------- |
| ↑ Rising  | Bearish Gold  |
| ↓ Falling | Bullish Gold  |

> Computed automatically from economic data feeds.

---

## 7.4 Central Bank Activity Monitor

**Track:**
* Fed tone (hawkish / dovish)
* Gold reserves buying by central banks

> Central banks are the **largest gold buyers** in the world.

---

## 7.5 Liquidity & Market Structure Engine (SMC Upgrade)

Enhancing existing SMC with:

* Equal highs/lows detection
* Stop loss cluster mapping
* Liquidity heatmaps
* Order flow approximation (via volume spikes)

---

## 7.6 Volume & Volatility Engine

**Track:** Tick volume (from broker) · ATR

| Signal         | Meaning     |
| -------------- | ----------- |
| Low volatility | Fake moves  |
| High volatility| Real moves  |

---

## 7.7 Session Behavior Model

Learn patterns from historical session data:

* London breakout success rate
* NY reversal probability
* Asian range behavior

**Store in RAG:**

```json
{
  "session": "London",
  "setup": "Asian sweep",
  "win_rate": 0.67
}
```

---

## 7.8 Economic Calendar Engine

Track **scheduled events** — not just live news:

* CPI · NFP · FOMC · Interest rate decisions

**Features:**
* Auto "NO TRADE ZONE" before/during events
* Pre-event directional bias

---

## 7.9 Correlation Engine

Gold correlates with:

| Asset           | Relationship  |
| --------------- | ------------- |
| DXY             | Inverse       |
| US 10Y Yield    | Inverse       |
| S&P 500         | Risk sentiment|
| Silver (XAGUSD) | Direct        |

**Build:**
* Correlation matrix
* Divergence detection alerts

---

## 7.10 Market Regime Detection

Classify market state before trading:

| Regime      | Action                         |
| ----------- | ------------------------------ |
| Trending    | Trend-following setups         |
| Ranging     | Range fade setups              |
| Volatile    | Reduce size / wait             |
| News-driven | Block trades / wait for calm   |

> Your strategy works **only in certain regimes**.

---

## 7.11 Behavioral Tracking (Trader AI)

Track YOUR personal trading behavior:

* Overtrading frequency
* Performance after consecutive losses
* Best-performing setups by session

> *"You lose 80% of trades after 2 consecutive losses — stop trading for the day"*

---

## 7.12 Multi-Timeframe Alignment Engine

Automate HTF → LTF alignment:

* Weekly bias → Daily bias → Intraday entry

> Only allow trades when all timeframes are **aligned**.

---

## 7.13 Fakeout Detection Engine

Gold is **manipulation-heavy** — detect false breakouts:

* Wick spikes beyond key levels
* Low-volume breakouts
* Quick reversals after sweep

> Uses candle structure + volatility analysis.

---

## 7.14 Backtest & Strategy Evolution Engine

* Test setups automatically against historical data
* Rank strategies by win rate, R:R, and drawdown
* Evolve and retire underperforming setups

---

## 7.15 Confidence Scoring System

Combine all signals into a single weighted score:

```python
confidence = (
  0.25 * technical_score +
  0.20 * rag_score +
  0.15 * sentiment_score +
  0.15 * dxy_score +
  0.10 * yields_score +
  0.10 * session_score +
  0.05 * behavior_score
)
```

---

## 7.16 Bias Fusion Engine

Where all signals merge into a single trading decision.

**Example:**

| Source        | Bias     |
| ------------- | -------- |
| Technical     | Bullish  |
| RAG (history) | Bullish  |
| Sentiment     | Bearish  |
| DXY           | Bearish  |

**Output options:**
* Reduce confidence score
* Skip trade
* Wait for confirmation

**Fusion Formula:**

```python
final_score = (
  0.30 * technical_score +
  0.25 * rag_score +
  0.20 * sentiment_score +
  0.15 * dxy_score +
  0.10 * yields_score
)
```

---

## 7.17 ✅ Edge Validation System (MOST IMPORTANT)

> **Right now:** You assume your strategy works.
> **You need:** Proof.

Before the AI helps you trade, it must **prove your strategy has a positive edge**. Without this, AI will just help you lose faster.

### Strategy Performance Engine

Track every setup's historical performance:

```json
{
  "setup": "FVG + Sweep",
  "total_trades": 120,
  "win_rate": 0.54,
  "avg_rr": 2.1,
  "max_drawdown": 8.5,
  "profit_factor": 1.6
}
```

### Minimum Thresholds to Trade Live

| Metric          | Minimum Required |
| --------------- | ---------------- |
| Win Rate        | > 40% (with good R:R) |
| Profit Factor   | > 1.3            |
| Max Drawdown    | < 15%            |
| Expectancy      | > 0              |
| Sample Size     | ≥ 100 trades     |

### Per-Setup Tracking

* Track performance by: session · timeframe · setup type · market regime
* Automatically **retire setups** that fall below threshold
* Surface **best-performing setups** in the dashboard

> ⚠️ If expectancy is negative, the system **blocks live trading** and forces demo mode.

---

## 7.18 🧪 Forward Testing Engine

From the original doc: *"Demo trade before going live"* — now automated.

### How It Works

* Run the full system on a **demo/paper account**
* Every signal the AI generates is executed on demo
* Track real-world performance vs. backtest assumptions

### What to Track

```json
{
  "mode": "forward_test",
  "account": "demo",
  "decisions_generated": 142,
  "decisions_taken": 87,
  "slippage_avg_pips": 1.2,
  "execution_errors": 3,
  "win_rate_live": 0.51,
  "win_rate_backtest": 0.54,
  "gap": -0.03
}
```

### Minimum Forward Test Before Going Live

| Criteria      | Minimum        |
| ------------- | -------------- |
| Trade count   | 100–200 trades |
| Duration      | 30–60 days     |
| Regime coverage | Trending + Ranging + Volatile |

### Detects

* **Slippage** — difference between signal price and fill price
* **Execution errors** — missed trades, bad fills
* **Backtest vs. live gap** — overfitting indicator

> ✅ System only unlocks **live trading mode** after forward test criteria are met.

---

## 7.19 📐 Expectancy Engine (THIS = PROFITABILITY)

This is the **single most important formula** in trading.

### Formula

```text
Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss)
```

### Example Calculation

```python
win_rate   = 0.54
avg_win    = 200   # USD
loss_rate  = 0.46
avg_loss   = 100   # USD

expectancy = (0.54 × 200) − (0.46 × 100)
           = 108 − 46
           = +$62 per trade  ✅  Positive edge
```

### System Behaviour

| Expectancy     | Action                          |
| -------------- | ------------------------------- |
| Positive (> 0) | ✅ System allows trading        |
| Near zero      | ⚠️ Warning — refine strategy   |
| Negative (< 0) | 🚫 Block live trading           |

### Tracked Continuously

* Per setup type
* Per session
* Per market regime
* Rolling 30-day vs. all-time

> The AI surfaces: *"Your FVG + Sweep setup has expectancy of +$62/trade. Your Order Block setup has expectancy of −$14/trade — avoid it."*

---

# 8. 🏗️ Technical Architecture

---

## 8.1 High-Level Stack

| Layer            | Technology                            |
| ---------------- | ------------------------------------- |
| Frontend         | React + Vite                          |
| Backend          | FastAPI / NestJS                      |
| AI Orchestration | LangGraph                             |
| RAG Framework    | LangChain                             |
| Vector DB        | Pinecone / Weaviate / ChromaDB        |
| Database         | MongoDB                               |
| LLM              | OpenAI / Claude / Local               |
| Market Data      | TradingView / Broker API              |
| News / Sentiment | NewsAPI / GDELT / Alpha Vantage       |
| NLP (optional)   | FinBERT (finance-grade sentiment)     |

---

## 8.2 Full System Data Flow

```text
┌─────────────────────────────────────────┐
│              DATA INPUTS                │
│  Market OHLC + DXY + Yields             │
│  + Volume + Sessions + News Calendar   │
└──────────────────┬──────────────────────┘
                   ↓
           Feature Extraction
                   ↓
        ┌──────────┴──────────┐
        ↓                     ↓
   RAG Memory           Sentiment Engine
  (Trade History)       (News + Events)
        └──────────┬──────────┘
                   ↓
        Macro Engine (DXY + Yields + Real Rates)
                   ↓
          Correlation Engine
                   ↓
        Market Regime Detection
                   ↓
          Bias Fusion Engine
                   ↓
            Risk Manager
                   ↓
          Decision Output
```

---

## 8.3 News & Sentiment Data Flow

```text
News API → Preprocess → Embed → Vector DB
                ↓
      Sentiment Analysis → Macro Bias
                ↓
      LangGraph Decision Engine
```

---

# 9. 🧠 AI / LLM Design

---

## Input Context

* Current market snapshot
* Retrieved trade history (RAG)
* Risk constraints
* Macro signals (DXY, yields, sentiment)

---

## Output Schema (Full)

```json
{
  "bias": "Bullish",
  "confidence": 0.72,
  "sentiment_bias": "Bearish",
  "conflict": true,
  "recommendation": "wait",
  "entry_zone": "",
  "stop_loss": "",
  "take_profit": "",
  "risk_percent": 0.5,
  "reasoning": "Technical bullish but macro bearish due to strong USD and hawkish Fed"
}
```

---

## Scenario: Conflict Detection

**Situation:** Price sweeps liquidity bullishly + FVG formed
**News:** USD strengthening · Fed hawkish

| Old System        | New System                          |
| ----------------- | ----------------------------------- |
| ✅ "Take trade"   | ⚠️ Conflict detected — Avoid long  |

---

# 10. 📊 Functional Requirements

| ID   | Requirement                                        |
| ---- | -------------------------------------------------- |
| FR-1 | Analyze market in < 2 seconds                      |
| FR-2 | Retrieve top 5–20 similar trades from RAG          |
| FR-3 | Block trades exceeding daily/weekly risk limits    |
| FR-4 | Log every trade automatically                      |
| FR-5 | Real-time alerts for setups                        |
| FR-6  | Auto NO TRADE ZONE during high-impact news events        |
| FR-7  | Multi-timeframe alignment check before any trade         |
| FR-8  | Regime detection before entry validation                 |
| FR-9  | Track per-setup expectancy; block live trading if ≤ 0    |
| FR-10 | Forward test gate: require 100+ trades before live mode  |
| FR-11 | Continuous expectancy recalculation on every new trade   |

---

# 11. ⚙️ Non-Functional Requirements

| Category    | Requirement                          |
| ----------- | ------------------------------------ |
| Performance | Decision latency < 2 seconds         |
| Scalability | Support 10,000+ trades in DB         |
| Reliability | 99.9% uptime                         |
| Security    | API key protection + secure broker   |

---

# 12. 📈 Metrics & KPIs

## Trading Metrics

* Win rate improvement over baseline
* Drawdown reduction
* Risk adherence percentage
* Session-wise performance trends

## AI Metrics

* RAG retrieval accuracy
* Decision acceptance rate
* Confidence score calibration
* Conflict detection accuracy

---

# 13. 🚀 Phased Roadmap

---

## Phase 1 — MVP (Core Foundation)

* [ ] Trade journal + RAG memory
* [ ] Basic LLM assistant
* [ ] LangGraph workflow (core nodes)
* [ ] Risk engine
* [ ] **Expectancy engine** (track edge from day one)
* [ ] **Strategy performance tracker** (per-setup win rate, R:R, drawdown)
* [ ] **Forward testing mode** (demo account gate before live)

## Phase 2 — Market Intelligence

* [ ] DXY integration
* [ ] Economic calendar filter + NO TRADE ZONE
* [ ] Multi-timeframe bias alignment
* [ ] Confidence scoring system
* [ ] News & sentiment engine

## Phase 3 — Macro Layer

* [ ] US Bond Yields integration
* [ ] Real interest rate computation
* [ ] Central bank activity monitor
* [ ] Correlation engine (DXY, US10Y, S&P, Silver)
* [ ] Session behavior learning (RAG)

## Phase 4 — Advanced Intelligence

* [ ] Market regime detection
* [ ] Fakeout detection engine
* [ ] Behavioral tracking AI
* [ ] Backtest + strategy evolution engine
* [ ] Smart alerts + sentiment dashboard

## Phase 5 — Automation

* [ ] Semi-auto execution (with confirmation)
* [ ] Multi-agent system
* [ ] Reinforcement learning layer

---

# 14. ⚠️ Risks & Limitations

## Technical Risks

* Poor embeddings → bad RAG retrieval → wrong decisions
* LLM hallucinations on ambiguous market conditions
* News lag — market moves before news is processed

**Mitigations:**
* Strong keyword filtering for news relevance
* Use sentiment as a **filter**, not a trade trigger
* Always combine with price action

## Market Risks

* Unpredictable volatility (black swan events)
* Manipulation spikes (stop hunts in gold)

## User Risks

* Over-reliance on AI recommendations

---

# 15. 🔒 Guardrails

* AI **cannot auto-execute** trades without explicit user confirmation
* Mandatory risk checks before every decision
* Trade limits strictly enforced (daily + weekly caps)
* High-impact news events automatically block trade signals

---

# 16. 🧪 Future Extensions

* Reinforcement learning for strategy self-improvement
* Multi-market support (crypto, indices, forex)
* Social trading intelligence (aggregate signals)
* Voice-based trading assistant
* Mobile dashboard with push alerts

---

> **Bottom Line:** You're not building a bot.
> You're building a **context-aware, memory-driven, macro-intelligent, risk-controlled trading system** — the kind used by prop firms and quant desks.
>
> 👉 **Next steps:** MongoDB schema · LangGraph multi-agent code · Data ingestion pipelines · Production folder structure.