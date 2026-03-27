import { useState } from 'react';
import type { Decision, AnalysisRequest }           from '@/types/decision';
import type { AnalysisService }                     from '@/services';
import { APP_CONFIG, CONFIDENCE_THRESHOLDS }        from '@/config';

interface Props { 
  service: AnalysisService;
  externalDecision?: Decision | null;
}

const BIAS_COLOR: Record<string, string> = {
  Bullish: 'var(--bullish)',
  Bearish: 'var(--bearish)',
  Neutral: 'var(--text-muted)',
};
const REC_COLOR: Record<string, string> = {
  take:  'var(--bullish)',
  wait:  'var(--gold)',
  avoid: 'var(--bearish)',
};
const REC_ICON: Record<string, string> = { take: '✅', wait: '⚠️', avoid: '🚫' };

export default function AIPanel({ service, externalDecision }: Props) {
  const [internalDecision, setInternalDecision] = useState<Decision | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [balance,  setBalance]  = useState(APP_CONFIG.defaultBalance);
  const [riskPct,  setRiskPct]  = useState(APP_CONFIG.defaultRiskPct);

  // Use external (autonomous) decision if available, else manual
  const decision = externalDecision || internalDecision;

  const run = async () => {
    setLoading(true);
    try {
      const req: AnalysisRequest = { balance, risk_pct: riskPct, daily_trades: 0, daily_loss_pct: 0 };
      const d = await service.run(req);
      setInternalDecision(d);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>🤖 AI Decision Engine</h2>
        <div className="panel-controls">
          <label>
            Balance <input type="number" value={balance} onChange={e => setBalance(+e.target.value)} className="input-sm" />
          </label>
          <label>
            Risk % <input type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(+e.target.value)} className="input-sm" />
          </label>
          <button onClick={run} disabled={loading} className="btn-primary" id="run-analysis-btn">
            {loading ? '⚙️ Analyzing…' : '▶ Run Analysis'}
          </button>
        </div>
      </div>

      {decision && (
        <div className="decision-body">
          {decision.conflict && (
            <div className="conflict-banner">
              ⚠️ SIGNAL CONFLICT — Technical vs Macro sentiment mismatch. Confidence reduced.
            </div>
          )}

          <div className="decision-grid">
            <div className="stat-box">
              <span className="stat-label">Bias</span>
              <span className="stat-value" style={{ color: BIAS_COLOR[decision.bias] }}>{decision.bias}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Confidence</span>
              <span className="stat-value">{(decision.confidence * 100).toFixed(0)}%</span>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${decision.confidence * 100}%`,
                  background: decision.confidence > CONFIDENCE_THRESHOLDS.high   ? 'var(--bullish)'
                        : decision.confidence > CONFIDENCE_THRESHOLDS.medium ? 'var(--gold)'
                        : 'var(--bearish)' }} />
              </div>
            </div>
            <div className="stat-box">
              <span className="stat-label">Recommendation</span>
              <span className="stat-value" style={{ color: REC_COLOR[decision.recommendation] }}>
                {REC_ICON[decision.recommendation]} {decision.recommendation.toUpperCase()}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Lot Size</span>
              <span className="stat-value">{decision.lot_size}</span>
            </div>
          </div>

          <div className="levels-row">
            <div className="level-item"><span>Entry</span><strong>{decision.entry_zone}</strong></div>
            <div className="level-item"><span>Stop Loss</span><strong style={{ color:'var(--bearish)' }}>{decision.stop_loss}</strong></div>
            <div className="level-item"><span>Take Profit</span><strong style={{ color:'var(--bullish)' }}>{decision.take_profit}</strong></div>
            <div className="level-item"><span>Risk</span><strong>{decision.risk_percent}%</strong></div>
          </div>

          <div className="reasoning-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="stat-label">Reasoning</span>
              <div className="macro-row" style={{ margin: 0 }}>
                <span className="stat-label">Sentiment:</span>
                <span className={`sentiment-pill ${decision.sentiment_bias}`}>{decision.sentiment_bias.replace('_', ' ')}</span>
              </div>
            </div>
            <p>{decision.reasoning}</p>
            {decision.risk_reason && (
              <p className="risk-note">
                {decision.risk_reason.toLowerCase().includes('within') ? '🟢' : '⚠️'} {decision.risk_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {!decision && !loading && (
        <div className="empty-state">Click <strong>Run Analysis</strong> to get an AI-powered trading decision</div>
      )}
    </div>
  );
}
