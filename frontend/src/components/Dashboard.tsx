import { useState, useEffect }  from 'react';
import { PriceHeader }      from './PriceHeader';
import AIPanel          from './AIPanel';
import PerformanceCards  from './PerformanceCards';
import SentimentWidget   from './SentimentWidget';
import TradeJournal      from './TradeJournal';
import BacktestDashboard  from './BacktestDashboard';

import { APP_CONFIG }    from '@/config';
import type { IApiClient }   from '@/api/ApiClient';
import type { MarketPrice }  from '@/types/market';
import type { TradeService, AnalysisService, PerformanceService, SentimentService } from '@/services';

interface Props {
  api:                IApiClient;
  tradeService:       TradeService;
  analysisService:    AnalysisService;
  performanceService: PerformanceService;
  sentimentService:   SentimentService;
}

export default function Dashboard({ api, tradeService, analysisService, performanceService, sentimentService }: Props) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [autoTrade, setAutoTrade] = useState(false);
  const [nestAutoTrade, setNestAutoTrade] = useState(false); // NestJS State
  const [nestState, setNestState] = useState<any>(null); // Active Trades
  const [trialMode, setTrialMode] = useState(true);
  const [lastDecision, setLastDecision] = useState<any>(null);
  const [activeView, setActiveView] = useState<'analysis' | 'journal' | 'perf' | 'macro' | 'backtest'>('analysis');

  const [marketData, setMarketData] = useState<MarketPrice | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setOnline(true) : setOnline(false))
      .catch(() => setOnline(false));

    // Get initial automation status
    const sync = async () => {
      try {
        const s = await api.getAutomationStatus() as any;
        setAutoTrade(s.enabled);
        setTrialMode(s.trial_mode ?? true);
        if (s.last_decision && Object.keys(s.last_decision).length > 0) {
          setLastDecision(s.last_decision);
        }
      } catch (err) {}

      try {
        const nestStatus = await api.getNestAutoTradeStatus();
        if (nestStatus) {
          if (nestStatus.control) setNestAutoTrade(nestStatus.control.isEnabled);
          setNestState(nestStatus.state);
        }
      } catch (err) {}

      try {
        const price = await api.getCurrentPrice();
        setMarketData(price);
      } catch (err) {}
    };

    sync();
    const timer = setInterval(sync, 10000); // Poll every 10s for updates
    return () => clearInterval(timer);
  }, [api]);

  const handleToggleAuto = async () => {
    try {
      const res = await api.toggleAutomation(!autoTrade);
      setAutoTrade(res.enabled);
    } catch (err) {
      console.error('Failed to toggle automation:', err);
    }
  };

  const handleToggleNestAuto = async () => {
    try {
      const res = await api.toggleNestAutoTrade(!nestAutoTrade);
      setNestAutoTrade(res.isEnabled);
    } catch (err) {
      console.error('Failed to toggle NestJS execution:', err);
    }
  };

  const handleStopNestTrade = async (strategy: string) => {
    try {
      await api.stopNestTrade(strategy);
      // Refresh status immediately
      const nestStatus = await api.getNestAutoTradeStatus();
      setNestState(nestStatus.state);
    } catch (err) {
      console.error('Failed to stop trade:', err);
    }
  };

  const systemStatus = online === null
    ? { label: 'Connecting…',   color: 'var(--text-muted)', dot: 'var(--text-muted)' }
    : online
    ? { label: 'System Online', color: 'var(--bullish)',    dot: 'var(--bullish)' }
    : { label: 'Backend Offline — start uvicorn', color: 'var(--bearish)', dot: 'var(--bearish)' };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">⚡</span>
          <div>
            <h1>AstraTrade</h1>
            <p>AI Trading Copilot</p>
          </div>
        </div>
        <nav className="nav">
          <button onClick={() => setActiveView('analysis')} className={`nav-item ${activeView === 'analysis' ? 'active' : ''}`}>🤖 AI Analysis</button>
          <button onClick={() => setActiveView('journal')}  className={`nav-item ${activeView === 'journal' ? 'active' : ''}`}>📒 Journal</button>
          <button onClick={() => setActiveView('perf')}     className={`nav-item ${activeView === 'perf' ? 'active' : ''}`}>📊 Performance</button>
          <button onClick={() => setActiveView('macro')}    className={`nav-item ${activeView === 'macro' ? 'active' : ''}`}>📰 Macro</button>
          <button onClick={() => setActiveView('backtest')} className={`nav-item ${activeView === 'backtest' ? 'active' : ''}`}>🧪 Backtest</button>
        </nav>


        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(240,180,41,0.05)', borderRadius: '12px', border: '1px solid rgba(240,180,41,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Node 1: Analysis Bot */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Bot (Python)</span>
              <div className={`status-dot ${autoTrade ? 'active' : ''}`} style={{ background: autoTrade ? 'var(--bullish)' : 'var(--text-muted)', width: '6px', height: '6px' }} />
            </div>
            <button 
              onClick={handleToggleAuto}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                background: autoTrade ? 'var(--bearish)' : 'var(--bg-elevated)',
                color: autoTrade ? '#000' : 'var(--gold)',
                border: autoTrade ? 'none' : '1px solid var(--gold)',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {autoTrade ? 'Stop Analysis' : 'Start Analysis'}
            </button>
          </div>

          <div style={{ height: '1px', background: 'var(--glass-border)' }}></div>

          {/* Node 2: Execution Engine */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution Engine (NestJS)</span>
              <div className={`status-dot ${nestAutoTrade ? 'active' : ''}`} style={{ background: nestAutoTrade ? 'var(--bullish)' : 'var(--text-muted)', width: '6px', height: '6px' }} />
            </div>
            <button 
              onClick={handleToggleNestAuto}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                background: nestAutoTrade ? 'var(--bearish)' : 'var(--bg-elevated)',
                color: nestAutoTrade ? '#000' : '#38bdf8',
                border: nestAutoTrade ? 'none' : '1px solid #38bdf8',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {nestAutoTrade ? 'Stop Event Loop' : 'Start Event Loop'}
            </button>
          </div>

          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
            System nodes manage state independently.
          </p>
        </div>

        <div className="sidebar-footer">
          <span className="pair-badge">{APP_CONFIG.pair}</span>
          <span className="mode-badge" style={{ color: systemStatus.color }}>● Live</span>
        </div>
      </aside>

        <main className="main-content">
          <header className="top-bar glass" style={{ borderBottom: '1px solid var(--glass-border)', padding: '0.75rem 1.5rem', marginBottom: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {activeView === 'analysis' ? '🤖' : 
                 activeView === 'journal' ? '📒' : 
                 activeView === 'perf' ? '📊' : 
                 activeView === 'backtest' ? '🧪' : '📰'}
              </span>

              <h2 className="page-title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Trading Intelligence Dashboard / <span style={{ color: 'var(--text)' }}>{activeView.toUpperCase()}</span></h2>
            </div>
            <div className="top-bar-right glass" style={{ padding: '4px 12px', borderRadius: '100px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span className="status-dot" style={{ background: systemStatus.dot, width: '6px', height: '6px' }} />
              <span style={{ color: systemStatus.color, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{systemStatus.label}</span>
            </div>
          </header>

          <PriceHeader api={api} marketData={marketData} />

        <div className="content-grid">
          {activeView === 'analysis' && (
            <section className="col-full">
              <AIPanel service={analysisService} externalDecision={lastDecision} />
            </section>
          )}

          {activeView === 'macro' && (
            <section className="col-full">
              <SentimentWidget service={sentimentService} />
            </section>
          )}

          {activeView === 'perf' && (
            <section className="col-full">
              <PerformanceCards service={performanceService} />
            </section>
          )}

          {activeView === 'journal' && (
            <section className="col-full">
              <TradeJournal 
                service={tradeService} 
                onStopTrade={handleStopNestTrade} 
                activeNestTrades={nestState}
                currentPrice={marketData?.price}
              />
            </section>
          )}

          {activeView === 'backtest' && (
            <section className="col-full">
              <BacktestDashboard api={api} />
            </section>
          )}
        </div>

      </main>
    </div>
  );
}
