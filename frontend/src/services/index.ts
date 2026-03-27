import type { IApiClient }    from '@/api/ApiClient';
import type { Trade }         from '@/types/trade';
import type { AnalysisRequest, Decision } from '@/types/decision';
import type { PerformanceData } from '@/types/performance';
import type { Sentiment }     from '@/types/sentiment';

export class TradeService {
  constructor(private api: IApiClient) {}
  async getAll():                     Promise<Trade[]> { return this.api.getTrades(); }
  async log(trade: Trade):            Promise<Trade>   { return this.api.logTrade(trade); }
}

export class AnalysisService {
  constructor(private api: IApiClient) {}
  async run(req: AnalysisRequest):    Promise<Decision>         { return this.api.runAnalysis(req); }
}

export class PerformanceService {
  constructor(private api: IApiClient) {}
  async get():                        Promise<PerformanceData>  { return this.api.getPerformance(); }
}

export class SentimentService {
  constructor(private api: IApiClient) {}
  async get():                        Promise<Sentiment>        { return this.api.getSentiment(); }
}
