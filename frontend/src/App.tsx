/// <reference types="vite/client" />
import { HttpApiAdapter }       from '@/api/HttpApiAdapter';
import { APP_CONFIG }           from '@/config';
import { TradeService, AnalysisService, PerformanceService, SentimentService } from '@/services';
import Dashboard                from '@/components/Dashboard';

// ── Single injection point ─────────────────────────────────────────────────
// All data comes from the real FastAPI backend. No mocks.
const api = new HttpApiAdapter(APP_CONFIG.apiBaseUrl);

const tradeService       = new TradeService(api);
const analysisService    = new AnalysisService(api);
const performanceService = new PerformanceService(api);
const sentimentService   = new SentimentService(api);
// ───────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Dashboard
      api={api}
      tradeService={tradeService}
      analysisService={analysisService}
      performanceService={performanceService}
      sentimentService={sentimentService}
    />
  );
}
