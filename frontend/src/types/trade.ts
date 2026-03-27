export type Session = 'London' | 'NewYork' | 'Asia';
export type Bias    = 'Bullish' | 'Bearish' | 'Neutral';
export type Outcome = 'Win' | 'Loss' | 'Pending';

export interface Trade {
  id?:        string;
  pair:       string;
  entry:      number;
  sl:         number;
  tp:         number;
  session:    Session;
  setup_type: string;
  bias:       Bias;
  outcome?:   Outcome;
  rr?:        number;
  spread?:    number;
  notes?:     string;
  timestamp?: string;
}
