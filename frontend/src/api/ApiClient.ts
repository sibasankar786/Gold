import type { Trade }           from '@/types/trade';
import type { Decision, AnalysisRequest } from '@/types/decision';
import type { PerformanceData } from '@/types/performance';
import type { Sentiment }       from '@/types/sentiment';
import type { MarketPrice }     from '@/types/market';

/**
 * IApiClient — program against this interface, never against a concrete adapter.
 * Swap HttpApiAdapter ↔ MockApiAdapter without changing any component or service.
 */
export interface IApiClient {
  getTrades():                      Promise<Trade[]>;
  logTrade(trade: Trade):           Promise<Trade>;
  runAnalysis(req: AnalysisRequest): Promise<Decision>;
  getPerformance():                 Promise<PerformanceData>;
  getSentiment():                   Promise<Sentiment>;
  getCurrentPrice():                Promise<MarketPrice>;
  toggleAutomation(enabled: boolean): Promise<{ status: string; enabled: boolean }>;
  getAutomationStatus(): Promise<{ enabled: boolean; last_decision: any; trial_mode?: boolean }>;
  
  // NestJS independent Auto-Trade Execution Engine
  toggleNestAutoTrade(enabled: boolean): Promise<{ isEnabled: boolean }>;
  getNestAutoTradeStatus(): Promise<{ control: any; state: any[] }>;
  stopNestTrade(id: string): Promise<{ status: string }>;
  runBacktest(config: any): Promise<any>;
}

