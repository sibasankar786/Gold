export interface EdgeEvaluation {
  live_allowed: boolean;
  status:       'green' | 'yellow' | 'red';
  reasons:      string[];
}

export interface SetupStats {
  setup:          string;
  total_trades:   number;
  win_rate:       number;
  avg_rr:         number;
  profit_factor:  number;
  max_drawdown:   number;
  expectancy:     number;
  edge_evaluation?: EdgeEvaluation;
}

export interface PerformanceOverview {
  avg_expectancy: number;
  live_allowed:   boolean;
}

export interface PerformanceData {
  overall: PerformanceOverview;
  setups:  SetupStats[];
}
