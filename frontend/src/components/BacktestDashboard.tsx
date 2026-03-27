import React, { useState } from 'react';
import type { IApiClient } from '@/api/ApiClient';
import BacktestChart from './BacktestChart';

interface Props {
  api: IApiClient;
}

export default function BacktestDashboard({ api }: Props) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const getGoldSessionDefaults = () => {
    const now = new Date();
    // Helper to get local date string YYYY-MM-DD
    const toDateStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    
    const today = toDateStr(now);
    const tomorrow = toDateStr(new Date(now.getTime() + 86400000));
    const yesterday = toDateStr(new Date(now.getTime() - 86400000));

    // If it's early (before 3:30 AM local), default to the session that started yesterday
    if (now.getHours() < 3 || (now.getHours() === 3 && now.getMinutes() < 30)) {
      return { from: `${yesterday}T03:30`, to: `${today}T02:30` };
    }
    return { from: `${today}T03:30`, to: `${tomorrow}T02:30` };
  };

  const defaults = getGoldSessionDefaults();

  const [config, setConfig] = useState({
    symbol: "XAUUSD.sc",
    spread: 0.3,
    slippage_max: 0.2,
    base_sl_tp: 10.0,
    min_volatility: 3.5,
    mock_data: true,
    strategy: "all",
    from_date: defaults.from,
    to_date: defaults.to,
    use_sl: true,
    use_tp: true,
    dip_threshold: 15.0
  });

  const getStrategyCondition = () => {
    switch(config.strategy) {
      case 'breakout': 
        return "ENTRY: Price > High/Low of last 10 M1 candles. FILTER: M5 EMA9 vs EMA21 Slope must match direction. MGMT: Uses configured BASE SL/TP with Trailing Stop active.";
      case 'liquidity': 
        return "ENTRY: Price sweeps 15 M1 candle high/low and rejects. FILTER: Must align with AI Bias (or Neutral). MGMT: Uses configured BASE SL/TP.";
      case 'scalp_5pt': 
        return "ENTRY: M1 Breakout (last 10 candles). FILTER: M5 EMA 9/21 Trend Alignment. MGMT: Forced 5 PT Stop-Loss and 5 PT Take-Profit (FIXED - NO TRAILING).";
      case 'scalp_10pt': 
        return "ENTRY: M1 Breakout (last 10 candles). FILTER: M5 EMA 9/21 Trend Alignment. MGMT: Forced 10 PT Stop-Loss and 10 PT Take-Profit (FIXED - NO TRAILING).";
      case 'dip_buy':
        return `ENTRY: Market Price retraces ${config.dip_threshold} PTS from Session High. FILTER: None (Mean Reversion). MGMT: Uses configured BASE SL/TP. 'Keep buying' with 5-min cooldown.`;
      case 'shadow_candle':
        return "ENTRY: 2:00 AM M5 candle 50% level hit + Sweep + BOS. FILTER: H1 EMA 50/200 Trend & M30 ATR Volatility. MGMT: SL on M5 Level-Cross, TP = 2x Red Bar Size. SESSION: 5:30-8:30 PM IST.";
      default: 
        return `HYBRID: Running Breakout, Liquidity, and Dip Buy (${config.dip_threshold} PT) logic concurrently based on market volatility.`;
    }
  };

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest({
        symbol: config.symbol,
        mock_data: config.mock_data,
        from_date: config.from_date,
        to_date: config.to_date,
        strategy: config.strategy,
        config: {
          spread: config.spread,
          slippage_max: config.slippage_max,
          base_sl_tp: config.base_sl_tp,
          min_volatility: config.min_volatility,
          use_sl: config.use_sl,
          use_tp: config.use_tp,
          dip_threshold: config.dip_threshold
        }
      });
      
      if (res.error) {
        setError(res.error);
        setResults(null);
      } else {
        setResults(res);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to run backtest";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPeriod = (period: string) => {
    if (!period) return;
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    // First day of selected month
    const start = new Date(year, month, 1);
    // Last day of selected month
    const end = new Date(year, month + 1, 1); // Helper: Setting day 1 of next month
    
    const toDateStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    
    setConfig({
      ...config,
      from_date: `${toDateStr(start)}T03:30`,
      to_date: `${toDateStr(end)}T02:30`
    });
  };

  const exportToCSV = () => {
    if (!results || !results.trades) return;
    
    // Generate Descriptive Filename: Year_month_strategy
    const startDate = new Date(config.from_date);
    const year = startDate.getFullYear();
    const monthNamesShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNamesShort[startDate.getMonth()];
    const strategyLabel = config.strategy === 'all' ? 'hybrid' : config.strategy.replace('scalp_', '');
    const filename = `${year}_${month}_${strategyLabel}.csv`;

    const headers = ["Strategy", "Side", "Entry Price", "Entry Time", "Exit Price", "Exit Time", "Exit Reason", "PnL", "Status", "Shadow Level", "BOS Price"];
    const rows = results.trades.map((t: any) => [
      t.strategy,
      t.side,
      t.entry_price,
      t.entry_time,
      t.exit_price || "",
      t.exit_time || "",
      t.exit_reason || "",
      t.pnl.toFixed(2),
      t.status,
      t.shadow_level || "N/A",
      t.bos_price || "N/A"
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthOptions = [];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Last 6 months options
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthOptions.push({
      label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      value: `${d.getFullYear()}-${d.getMonth()}`
    });
  }

  return (
    <div className="backtest-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      
      {/* 1. CONFIGURATION HEADER */}
      <div className="glass card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>ASSET SYMBOL</label>
          <input 
            type="text" value={config.symbol} 
            onChange={e => setConfig({...config, symbol: e.target.value.toUpperCase()})}
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
          />
        </div>

        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>STRATEGY CATEGORY</label>
          <select 
            value={config.strategy}
            onChange={e => setConfig({...config, strategy: e.target.value})}
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--gold)', padding: '8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem' }}
          >
            <option value="all">All Strategies (Auto)</option>
            <option value="breakout">Breakout Scalping</option>
            <option value="liquidity">Liquidity Sweep</option>
            <option value="scalp_5pt">5 PT Scalp (Breakout)</option>
            <option value="scalp_10pt">10 PT Scalp (Breakout)</option>
            <option value="dip_buy">Dip Buy (Configurable)</option>
            <option value="shadow_candle">Shadow Candle (Asia Session)</option>
          </select>
        </div>

        {(config.strategy === 'dip_buy' || config.strategy === 'all') && (
          <div className="input-group">
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>DIP THRESHOLD (PTS)</label>
            <input 
              type="number" step="0.5" value={config.dip_threshold} 
              onChange={e => setConfig({...config, dip_threshold: parseFloat(e.target.value) || 0})}
              style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
            />
          </div>
        )}

        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>DATA SOURCE</label>
          <select 
            value={config.mock_data ? 'mock' : 'real'}
            onChange={e => setConfig({...config, mock_data: e.target.value === 'mock'})}
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
          >
            <option value="mock">Synthetic (Mock)</option>
            <option value="real">Real MT5 Terminal</option>
          </select>
        </div>

        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>QUICK PERIOD</label>
          <select 
            onChange={e => handleQuickPeriod(e.target.value)}
            defaultValue=""
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--gold)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
          >
            <option value="" disabled>Select Month...</option>
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>FROM (DATE/TIME)</label>
          <input 
            type="datetime-local" value={config.from_date} 
            onChange={e => setConfig({...config, from_date: e.target.value})}
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
          />
        </div>
        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>TO (DATE/TIME)</label>
          <input 
            type="datetime-local" value={config.to_date} 
            onChange={e => setConfig({...config, to_date: e.target.value})}
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
          />
        </div>


        <div className="input-group">
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>SPREAD (PTS)</label>
          <input 
            type="number" step="0.1" value={config.spread} 
            onChange={e => setConfig({...config, spread: parseFloat(e.target.value)})}
            style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
          />
        </div>
        {config.strategy !== 'shadow_candle' && (
          <>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>BASE SL/TP (PTS)</label>
              <input 
                type="number" step="1" value={config.base_sl_tp} 
                onChange={e => setConfig({...config, base_sl_tp: parseFloat(e.target.value)})}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}
              />
            </div>

            <div className="input-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={config.use_sl} onChange={e => setConfig({...config, use_sl: e.target.checked})} />
                USE SL
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={config.use_tp} onChange={e => setConfig({...config, use_tp: e.target.checked})} />
                USE TP
              </label>
            </div>
          </>
        )}
        
        <button 
          onClick={handleRun}
          disabled={loading}
          className="btn-primary"
          style={{
            height: '38px',
            background: loading ? 'var(--bg-elevated)' : 'var(--gold)',
            color: '#000',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            border: 'none',
            borderRadius: '6px',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'SIMULATING...' : '🚀 RUN BACKTEST'}
        </button>
      </div>

      {/* Logic Condition Info */}
      <div className="glass" style={{ padding: '0.8rem 1.2rem', fontSize: '0.75rem', borderLeft: '3px solid var(--gold)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ opacity: 0.6 }}>Current Logic:</span>
        <b style={{ color: 'var(--gold)' }}>{getStrategyCondition()}</b>
      </div>

      {error && (
        <div className="glass" style={{ padding: '1rem', borderLeft: '4px solid var(--bearish)', color: 'var(--bearish)', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 2. RESULTS SUMMARY & CHART */}
      {results && results.metrics && (
        <>
          {(() => {
            const formatEntryTime = (ts: string) => {
              if (!ts) return "";
              const d = new Date(ts);
              return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            };

            return (
              <div style={{ marginTop: '2rem' }}>
                <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Profit / Loss</p>
                    <h3 style={{ fontSize: '1.5rem', color: results.metrics.net_profit >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                      {results.metrics.net_profit >= 0 ? '+' : ''}{results.metrics.net_profit} <span style={{ fontSize: '0.8rem' }}>PTS</span>
                    </h3>
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Win Rate</p>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--gold)' }}>{results.metrics.win_rate}%</h3>
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Total Trades</p>
                    <h3 style={{ fontSize: '1.5rem' }}>{results.metrics.total_trades}</h3>
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Max Drawdown</p>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--bearish)' }}>{results.metrics.max_drawdown} <span style={{ fontSize: '0.8rem' }}>PTS</span></h3>
                    {results.metrics.max_drawdown_entry && (
                      <p style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '4px' }}>
                        Entry: {formatEntryTime(results.metrics.max_drawdown_entry)}
                      </p>
                    )}
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center', position: 'relative' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Max Profit (Single)</p>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--bullish)' }}>{results.metrics.max_profit} <span style={{ fontSize: '0.8rem' }}>PTS</span></h3>
                    {results.metrics.max_profit_entry && (
                      <p style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '4px' }}>
                        Entry: {formatEntryTime(results.metrics.max_profit_entry)}
                      </p>
                    )}
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Avg Profit / Trade</p>
                    <h3 style={{ fontSize: '1.5rem', color: results.metrics.avg_profit >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                      {results.metrics.avg_profit} <span style={{ fontSize: '0.8rem' }}>PTS</span>
                    </h3>
                  </div>
                  
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Avg Hold Time</p>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--gold)' }}>{results.metrics.hold_time?.avg || 0} <span style={{ fontSize: '0.8rem' }}>MIN</span></h3>
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Short Hold (Min)</p>
                    <h3 style={{ fontSize: '1.5rem' }}>{results.metrics.hold_time?.min || 0} <span style={{ fontSize: '0.8rem' }}>MIN</span></h3>
                  </div>
                  <div className="glass card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Long Hold (Max)</p>
                    <h3 style={{ fontSize: '1.5rem' }}>{results.metrics.hold_time?.max || 0} <span style={{ fontSize: '0.8rem' }}>MIN</span></h3>
                    {results.metrics.hold_time?.max_entry && (
                      <p style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '4px' }}>
                        Entry: {formatEntryTime(results.metrics.hold_time.max_entry)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <BacktestChart candles={results.candles} trades={results.trades} />
        </>
      )}

      {/* 3. TRADE LIST */}
      {results && results.trades && results.trades.length > 0 && (
        <div className="glass card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Executed Trades — Historical Simulation</h4>
            <button 
              onClick={exportToCSV}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--gold)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📥</span> DOWNLOAD CSV
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '12px' }}>STRATEGY</th>
                <th style={{ padding: '12px' }}>SIDE</th>
                <th style={{ padding: '12px' }}>ENTRY</th>
                <th style={{ padding: '12px' }}>EXIT</th>
                {config.strategy === 'shadow_candle' && <th style={{ padding: '12px' }}>SHADOW LEVEL</th>}
                {config.strategy === 'shadow_candle' && <th style={{ padding: '12px' }}>BOS PRICE</th>}
                <th style={{ padding: '12px' }}>REASON</th>
                <th style={{ padding: '12px' }}>PNL</th>
              </tr>
            </thead>
            <tbody>
              {results.trades.map((t: any, i: number) => (
                <tr key={i} style={{ 
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: t.status === 'PENDING' ? 'rgba(212, 175, 55, 0.05)' : 'transparent'
                }}>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: t.strategy === 'Breakout' ? '#38bdf8' : 'var(--gold)', fontWeight: 700 }}>{t.strategy}</span>
                    <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '2px' }}>{new Date(t.entry_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: t.side === 'BUY' ? 'var(--bullish)' : 'var(--bearish)', fontWeight: 800 }}>{t.side}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{t.entry_price.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>{t.exit_price?.toFixed(2) || 'N/A'}</td>
                  {config.strategy === 'shadow_candle' && <td style={{ padding: '12px', color: 'var(--gold)' }}>{t.shadow_level?.toFixed(2) || '—'}</td>}
                  {config.strategy === 'shadow_candle' && <td style={{ padding: '12px', color: 'var(--bullish)' }}>{t.bos_price?.toFixed(2) || '—'}</td>}
                  <td style={{ padding: '12px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {t.status === 'PENDING' ? <span style={{ color: 'var(--gold)' }}>Market End</span> : t.exit_reason || 'N/A'}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: t.pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!results && !loading && !error && (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔬</span>
          <p>Historical trading data ready for simulation. Adjust parameters and click Run.</p>
        </div>
      )}

    </div>
  );
}

