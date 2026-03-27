import axios, { type AxiosInstance } from 'axios';
import type { IApiClient }          from './ApiClient';
import type { Trade }               from '@/types/trade';
import type { Decision, AnalysisRequest } from '@/types/decision';
import type { PerformanceData }     from '@/types/performance';
import type { Sentiment }           from '@/types/sentiment';
import type { MarketPrice }         from '@/types/market';

export class HttpApiAdapter implements IApiClient {
  private http: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.http = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getTrades(): Promise<Trade[]> {
    const { data } = await this.http.get<Trade[]>('/trades?limit=1000');
    return data;
  }

  async logTrade(trade: Trade): Promise<Trade> {
    const { data } = await this.http.post<Trade>('/trades', trade);
    return data;
  }

  async runAnalysis(req: AnalysisRequest): Promise<Decision> {
    const { data } = await this.http.post<{ decision: Decision }>('/analyze', req);
    return data.decision;
  }

  async getPerformance(): Promise<PerformanceData> {
    const { data } = await this.http.get<PerformanceData>('/performance');
    return data;
  }

  async getSentiment(): Promise<Sentiment> {
    const { data } = await this.http.get<{ sentiment: Sentiment }>('/sentiment');
    return data.sentiment;
  }

  async getCurrentPrice(): Promise<MarketPrice> {
    const { data } = await this.http.get<MarketPrice>('/market/price');
    return data;
  }

  async toggleAutomation(enabled: boolean): Promise<any> {
    const { data } = await this.http.post(`/automation/toggle?enabled=${enabled}`);
    return data;
  }

  async getAutomationStatus(): Promise<any> {
    const { data } = await this.http.get('/automation/status');
    return data;
  }

  // --- NestJS Auto-Trade Endpoints ---
  async toggleNestAutoTrade(enabled: boolean): Promise<{ isEnabled: boolean }> {
    const res = await fetch('http://localhost:3001/auto-trade/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled })
    });
    return res.json();
  }

  async getNestAutoTradeStatus(): Promise<{ control: any; state: any[] }> {
    const res = await fetch('http://localhost:3001/auto-trade/status');
    return res.json();
  }

  async stopNestTrade(id: string): Promise<{ status: string }> {
    const res = await fetch('http://localhost:3001/auto-trade/stop-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    return res.json();
  }

  async runBacktest(config: any): Promise<any> {
    const { data } = await this.http.post('/backtest/run', config);
    return data;
  }
}

