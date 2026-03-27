export type MacroBias = 'bullish_gold' | 'bearish_gold' | 'neutral';

export interface Sentiment {
  macro_bias:    MacroBias;
  confidence:    number;
  drivers:       string[];
  raw_sentiment?: string;
  timestamp?:    string;
}
