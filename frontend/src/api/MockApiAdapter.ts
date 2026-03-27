import type { IApiClient }          from './ApiClient';
import type { Trade }               from '@/types/trade';
import type { Decision, AnalysisRequest } from '@/types/decision';
import type { PerformanceData }     from '@/types/performance';
import type { Sentiment }           from '@/types/sentiment';

const MOCK_TRADES: Trade[] = [
  { id:'1', pair:'XAUUSD', entry:2302, sl:2290, tp:2330, session:'London',  setup_type:'FVG + Sweep',   bias:'Bullish', outcome:'Win',  rr:2.3, notes:'Clean FVG fill after Asian sweep',  timestamp:'2024-03-20T08:30:00Z' },
  { id:'2', pair:'XAUUSD', entry:2318, sl:2328, tp:2295, session:'NewYork', setup_type:'OB Rejection',  bias:'Bearish', outcome:'Win',  rr:2.3, notes:'NY reversal from daily OB',           timestamp:'2024-03-20T14:15:00Z' },
  { id:'3', pair:'XAUUSD', entry:2295, sl:2285, tp:2315, session:'London',  setup_type:'FVG + Sweep',   bias:'Bullish', outcome:'Loss', rr:1.0, notes:'SL hit before TP — news spike',       timestamp:'2024-03-19T09:00:00Z' },
];

const MOCK_DECISION: Decision = {
  bias:'Bullish', confidence:0.72, sentiment_bias:'bullish_gold',
  conflict:false, recommendation:'take',
  entry_zone:'2298-2302', stop_loss:'2288', take_profit:'2325',
  risk_percent:0.5, lot_size:0.05,
  reasoning:'Technical bullish confluence with London FVG setup. Macro sentiment aligns — USD weakening on dovish Fed tone.',
};

const MOCK_PERFORMANCE: PerformanceData = {
  overall:{ avg_expectancy:52.4, live_allowed:false },
  setups:[
    { setup:'FVG + Sweep', total_trades:42, win_rate:0.57, avg_rr:2.1, profit_factor:1.71, max_drawdown:9.2, expectancy:64.0,
      edge_evaluation:{ live_allowed:false, status:'yellow', reasons:['✅ Expectancy +64.00','✅ Win rate 57%','✅ Profit factor 1.71','✅ Max drawdown 9.2%','⚠️ Only 42 trades — need 100+ for statistical significance.'] } },
    { setup:'OB Rejection', total_trades:28, win_rate:0.50, avg_rr:1.8, profit_factor:1.30, max_drawdown:12.1, expectancy:40.0,
      edge_evaluation:{ live_allowed:false, status:'yellow', reasons:['✅ Expectancy +40.00','✅ Win rate 50%','✅ Profit factor 1.30','✅ Max drawdown 12.1%','⚠️ Only 28 trades — need 100+ for statistical significance.'] } },
  ],
};

const MOCK_SENTIMENT: Sentiment = {
  macro_bias:'bullish_gold', confidence:0.74,
  drivers:['Fed signals rate cuts ahead','USD weakening on soft jobs data','Geopolitical uncertainty boosting safe-haven demand'],
  raw_sentiment:'Macro environment mildly bullish for gold — dovish Fed + soft USD.',
};

export class MockApiAdapter implements IApiClient {
  private _trades: Trade[] = [...MOCK_TRADES];

  async getTrades(): Promise<Trade[]> { return this._trades; }

  async logTrade(trade: Trade): Promise<Trade> {
    const t: Trade = { ...trade, id: String(Date.now()), timestamp: new Date().toISOString() };
    this._trades.unshift(t);
    return t;
  }

  async runAnalysis(_req: AnalysisRequest): Promise<Decision> {
    await new Promise(r => setTimeout(r, 1200)); // simulate latency
    return MOCK_DECISION;
  }

  async getPerformance(): Promise<PerformanceData> { return MOCK_PERFORMANCE; }
  async getSentiment(): Promise<Sentiment>         { return MOCK_SENTIMENT; }
  async getCurrentPrice(): Promise<any>            { return { symbol: 'XAUUSD.sc', price: 2315.45, timestamp: new Date().toISOString() }; }

  async toggleAutomation(enabled: boolean): Promise<any> {
    return { status: 'ok', enabled };
  }

  async getAutomationStatus(): Promise<any> {
    return { enabled: false, last_decision: MOCK_DECISION };
  }
}
