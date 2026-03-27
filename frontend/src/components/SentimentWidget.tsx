import { useEffect, useState } from 'react';
import type { Sentiment }        from '@/types/sentiment';
import type { SentimentService } from '@/services';

interface Props { service: SentimentService }

const BIAS_MAP = {
  bullish_gold: { label: '🟢 Bullish Gold', color: 'var(--bullish)' },
  bearish_gold: { label: '🔴 Bearish Gold', color: 'var(--bearish)' },
  neutral:      { label: '⚪ Neutral',       color: 'var(--text-muted)' },
};

export default function SentimentWidget({ service }: Props) {
  const [s,       setS]       = useState<Sentiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    service.get().then(setS).finally(() => setLoading(false));
  }, [service]);

  const info = s ? BIAS_MAP[s.macro_bias] : null;

  return (
    <div className="card sentiment-card">
      <div className="card-header"><h2>📰 Macro Sentiment</h2></div>
      {loading && <p className="empty-state">Fetching macro data…</p>}
      {s && info && (
        <>
          <div className="sentiment-bias-row">
            <span className="sentiment-pill-large" style={{ color: info.color }}>{info.label}</span>
            <div className="confidence-bar" style={{ width: 120 }}>
              <div className="confidence-fill" style={{ width: `${s.confidence * 100}%`, background: info.color }} />
            </div>
            <span className="conf-label">{(s.confidence * 100).toFixed(0)}%</span>
          </div>

          {s.raw_sentiment && <p className="raw-sentiment">{s.raw_sentiment}</p>}

          <div className="drivers-list">
            <span className="stat-label">Key Drivers</span>
            <ul>{s.drivers.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>

          <p className="cache-note">Cached · refreshes every 60 min</p>
        </>
      )}
    </div>
  );
}
