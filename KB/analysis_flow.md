# AstraTrade AI — "Run Analysis" Execution Flow

When you click the **"Run Analysis"** button, the system triggers a multi-stage AI reasoning pipeline. Here is exactly what happens under the hood:

## 1. Frontend Trigger (The UI)
- **Component:** `AIPanel.tsx`
- **Action:** Captures your current **Balance** and **Risk %**.
- **Transmission:** Sends a secure `POST` request to the backend `/api/analyze` endpoint via the `HttpApiAdapter`.

## 2. Backend Orchestration (The Brain)
- **Component:** `graph/workflow.py`
- **Engine:** **LangGraph** (Stateful Multi-Agent Orchestration).
- **LLM:** **Gemini 2.5 Flash** (Handles logic, weighting, and decision-making).

## 3. The 6-Step reasoning Pipeline
The AI "steps" through these nodes sequentially, building a 360-degree view of the market:

### 🟢 Step 1: Market Intelligence (`market_data`)
- Connects to your **Vantage MT5 Terminal** via the `MT5Adapter`.
- Pulls live XAUUSD price and OHLC data.
- Identifies the current **Market Session** (London/NY/Asia).

### 🔵 Step 2: Technical Profiling (`feature_extraction`)
- Analyzes price action for **Market Structure** (HH/HL, LH/LL).
- Computes trend strength and volatility.

### 🟡 Step 3: Historical Recall (`rag_retrieval`)
- Uses **Vector Search (ChromaDB)** to find past trades from your journal that look like the current setup.
- "Reads" your past notes to see what worked or failed in similar conditions.

### 🔴 Step 4: Macro Sentiment (`sentiment`)
- Scours global news headlines via Gemini and NewsAPI.
- Assigns a sentiment score to Gold (e.g., "Safe Haven demand rising due to Geo-politics").

### 🟣 Step 5: Bias Fusion (`bias_fusion`)
- **The Core AI Step:** Gemini weighs the Technicals vs. Macro vs. History.
- If Technicals are Bullish but Macro is Bearish, it flags a **Conflict** and reduces confidence.

### 🟠 Step 6: Risk Engineering (`risk_manager`)
- Calculates precise **Entry**, **Stop Loss**, and **Take Profit** levels.
- Computes the exact **Lot Size** so you never lose more than your specified Risk %.

## 4. Final Delivery
- The completed `Decision` object is returned to the dashboard.
- The UI renders the glassmorphism results, showing you the Bias, Confidence, and clear Trade Levels.

---
*This pipeline ensures that every recommendation is backed by real data, historical performance, and global sentiment—not just guessing.*
