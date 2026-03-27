# 🚀 AstraTrade System: Setup & Startup Guide

This document explains what you need to start, why you need to start each component, and the exact commands to get the system running.

---

## 🏗️ System Architecture Overview

The system consists of three main parts that work together:

1.  **FastAPI Backend (Python)**: The "Brain" of the system.
    *   **Why**: Handles market data, AI analysis, and the MongoDB database.
    *   **Port**: 8000

2.  **NestJS Backend (Node.js)**: The "Execution Engine" (Strategy 5 & 10).
    *   **Why**: Handles high-frequency price polling, trailing stops, and trade logic.
    *   **Port**: 3001

3.  **React Frontend (Vite)**: The "User Interface".
    *   **Why**: Displays the Dashboard and Trade Journal.
    *   **Port**: 5173

---

## 🚦 Startup Order & Commands

Follow this order to ensure all services can communicate.

### 1. Start the FastAPI Brain (Python)
Ensure your virtual environment is active so `uvicorn` is recognized.

```powershell
# In Terminal 1
cd backend
python -m uvicorn main:app --port 8000 --host 0.0.0.0 --reload
```

### 2. Start the Execution Engine (NestJS)
This runs both the "5" and "10" strategies.

```powershell
# In Terminal 2
cd auto-trade-backend
npm run start:dev
```

### 3. Start the Frontend (React)

```powershell
# In Terminal 3
cd frontend
npm run dev
```

---

## 🛠️ Prerequisites Checklist

*   **MongoDB**: Must be running on `localhost:27017`.
*   **Node.js**: Version 18+ installed.
*   **Python**: Version 3.10+ installed.
*   **MT5 (Optional)**: If you want real execution, MetaTrader 5 must be open and configured with the MT5 bridge.

---

## 📖 Key Documentation Reference

*   [PRD.md](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/KB/PRD.md): Product Requirements & Core Logic.
*   [walkthrough.md](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/KB/walkthrough.md): Technical deep-dive into the AI workflow.
*   [normalimplementation_plan.md](file:///c:/Users/GOKU/Downloads/Info/Sharemarket/XAUUSD/KB/normalimplementation_plan.md): Details on the NestJS execution engine.
