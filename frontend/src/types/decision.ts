import type { Bias } from './trade';

export type Recommendation = 'take' | 'wait' | 'avoid';

export interface Decision {
  bias:           Bias;
  confidence:     number;
  sentiment_bias: string;
  conflict:       boolean;
  recommendation: Recommendation;
  entry_zone:     string;
  stop_loss:      string;
  take_profit:    string;
  risk_percent:   number;
  lot_size:       number;
  reasoning:      string;
  risk_reason?:   string;
}

export interface AnalysisRequest {
  balance:        number;
  risk_pct:       number;
  daily_trades:   number;
  daily_loss_pct: number;
}
