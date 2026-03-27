import { useEffect, useState } from 'react';
import type { SetupStats }        from '@/types/performance';
import type { PerformanceService } from '@/services';

interface Props { service: PerformanceService }

const STATUS_COLOR = { green: 'var(--bullish)', yellow: 'var(--gold)', red: 'var(--bearish)' };
const STATUS_LABEL = { green: '✅ Live Ready', yellow: '⚠️ Building Edge', red: '🚫 Demo Only' };

export default function PerformanceCards({ service }: Props) {
  const [data,    setData]    = useState<{ overall: { avg_expectancy: number; live_allowed: boolean }; setups: SetupStats[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    service.get().then(setData).finally(() => setLoading(false));
  }, [service]);

  if (loading) return <div className="card"><p className="empty-state">Loading performance data…</p></div>;
  if (!data)   return null;

  return (
    <div className="card">
      <div className="card-header"><h2>📊 Edge Validation & Performance</h2></div>

      <div className="overall-bar">
        <div className="stat-box">
          <span className="stat-label">Avg Expectancy</span>
          <span className="stat-value" style={{ color: data.overall.avg_expectancy > 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
            {data.overall.avg_expectancy > 0 ? '+' : ''}{data.overall.avg_expectancy.toFixed(2)}
          </span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Live Trading</span>
          <span className="stat-value" style={{ color: data.overall.live_allowed ? 'var(--bullish)' : 'var(--bearish)' }}>
            {data.overall.live_allowed ? '✅ Unlocked' : '🔒 Demo Mode'}
          </span>
        </div>
      </div>

      <div className="setup-grid">
        {data.setups.map(s => {
          const ev = s.edge_evaluation;
          const status = ev?.status ?? 'yellow';
          return (
            <div key={s.setup} className="setup-card">
              <div className="setup-card-header">
                <strong>{s.setup}</strong>
                <span className="status-badge" style={{ background: STATUS_COLOR[status] }}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <div className="setup-stats-row">
                <span>Win Rate<br /><strong>{(s.win_rate * 100).toFixed(1)}%</strong></span>
                <span>Avg R:R<br /><strong>{s.avg_rr.toFixed(2)}</strong></span>
                <span>Profit Factor<br /><strong>{s.profit_factor.toFixed(2)}</strong></span>
                <span>Max DD<br /><strong>{s.max_drawdown.toFixed(1)}%</strong></span>
                <span>Trades<br /><strong>{s.total_trades}</strong></span>
                <span>Expectancy<br /><strong style={{ color: s.expectancy > 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                  {s.expectancy > 0 ? '+' : ''}{s.expectancy.toFixed(2)}
                </strong></span>
              </div>
              {ev && (
                <details className="edge-details">
                  <summary>Edge Analysis</summary>
                  <ul>{ev.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
