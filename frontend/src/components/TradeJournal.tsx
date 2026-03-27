import { useEffect, useState } from 'react';
import type { Trade }          from '@/types/trade';
import type { TradeService }   from '@/services';

interface Props { 
  service: TradeService;
  onStopTrade?: (id: string) => Promise<void>;
  activeNestTrades?: any[];
  currentPrice?: number;
}

const OUTCOME_COLOR: Record<string, string> = { Win: 'var(--bullish)', Loss: 'var(--bearish)', Pending: 'var(--gold)' };
const BIAS_COLOR:    Record<string, string> = { Bullish: 'var(--bullish)', Bearish: 'var(--bearish)', Neutral: 'var(--text-muted)' };

const EMPTY_FORM: Omit<Trade, 'id'|'timestamp'> = {
  pair:'XAUUSD', entry:0, sl:0, tp:0, session:'London', setup_type:'', bias:'Bullish', outcome:'Pending', rr:undefined, notes:'',
};

export default function TradeJournal({ service, onStopTrade, activeNestTrades, currentPrice }: Props) {
  const [trades,    setTrades]    = useState<Trade[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [show,      setShow]      = useState(false);
  const [search,    setSearch]    = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Trade; direction: 'ascending' | 'descending' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [outcomeFilter, setOutcomeFilter] = useState<string>('All');
  const recordsPerPage = 50;

  const load = () => { 
    service.getAll().then(data => {
      console.log(`[JOURNAL] Loaded ${data.length} trades. Active Nest trades: ${activeNestTrades?.length}`);
      setTrades(data);
    }).finally(() => setLoading(false)); 
  };
  
  useEffect(() => {
    console.log("Journal: Raw trades fetched from service:", trades);
    const pendingInRaw = trades.filter(t => (t.outcome?.toLowerCase() ?? '') === 'pending');
    console.log("Journal: Total Pending trades in raw data:", pendingInRaw.length);
  }, [trades]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000); // Refresh journal every 30s
    return () => clearInterval(timer);
  }, [service]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
  }, [search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await service.log(form as Trade);
    setForm({ ...EMPTY_FORM });
    setShow(false);
    load();
  };

  const filteredTrades = trades.filter(t => {
    const matchesSearch = 
      (t.setup_type?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (t.session?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (t.bias?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (t.outcome?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (t.notes?.toLowerCase() ?? '').includes(search.toLowerCase());
    
    const matchesOutcome = outcomeFilter === 'All' || (t.outcome ?? 'Pending') === outcomeFilter;
    
    return matchesSearch && matchesOutcome;
  });

  const winCount = filteredTrades.filter(t => t.outcome === 'Win').length;
  const lossCount = filteredTrades.filter(t => t.outcome === 'Loss').length;
  const pendingCount = filteredTrades.filter(t => (t.outcome?.toLowerCase() ?? '') === 'pending').length;
  
  const calculatePL = (t: Trade) => {
    if (t.outcome === 'Pending') {
      if (!currentPrice) return 0;
      return t.bias === 'Bullish' ? (currentPrice - t.entry) : (t.entry - currentPrice);
    }
    const exitPrice = t.outcome === 'Win' ? t.tp : t.sl;
    return t.bias === 'Bullish' ? (exitPrice - t.entry) : (t.entry - exitPrice);
  };

  const netRR = filteredTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
  const totalPL = filteredTrades.reduce((acc, t) => acc + calculatePL(t), 0);
  const grossProfit = filteredTrades.reduce((acc, t) => {
    const pl = calculatePL(t);
    return pl > 0 ? acc + pl : acc;
  }, 0);
  const grossLoss = filteredTrades.reduce((acc, t) => {
    const pl = calculatePL(t);
    return pl < 0 ? acc + pl : acc;
  }, 0);

  const highestProfit = filteredTrades.reduce((max, t) => {
    const pl = calculatePL(t) || 0;
    return pl > max ? pl : max;
  }, 0);

  const highestLoss = filteredTrades.reduce((min, t) => {
    const pl = calculatePL(t) || 0;
    return pl < min ? pl : min;
  }, 0);


  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortConfig !== null) {
      const { key, direction } = sortConfig;
      if (a[key] < b[key]) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'ascending' ? 1 : -1;
      }
    }
    // Default: Newest first (timestamp descending)
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  const totalPages = Math.ceil(sortedTrades.length / recordsPerPage);
  const currentRecords = sortedTrades.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const requestSort = (key: keyof Trade) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, direction });
  };

  return (
    <div class="card">
      <div class="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2>📒 Trade Journal</h2>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', fontWeight: 600, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--bullish)', background: 'rgba(0, 255, 128, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Gross Profit: +{grossProfit.toFixed(2)}
            </span>
            <span style={{ color: 'var(--bearish)', background: 'rgba(255, 75, 75, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Gross Loss: {grossLoss.toFixed(2)}
            </span>
            <span style={{ color: 'var(--bullish)', background: 'rgba(0, 255, 128, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Highest Profit: +{highestProfit.toFixed(2)}
            </span>
            <span style={{ color: 'var(--bearish)', background: 'rgba(255, 75, 75, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Highest Loss: {highestLoss.toFixed(2)}
            </span>

            <span style={{ color: totalPL >= 0 ? 'var(--bullish)' : 'var(--bearish)', background: totalPL >= 0 ? 'rgba(0, 255, 128, 0.1)' : 'rgba(255, 75, 75, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid currentColor' }}>
              Net P/L: {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)} pts
            </span>
            <span style={{ color: netRR >= 0 ? 'var(--bullish)' : 'var(--bearish)', background: netRR >= 0 ? 'rgba(0, 255, 128, 0.1)' : 'rgba(255, 75, 75, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Net R:R: {netRR.toFixed(2)} R
            </span>
            <span style={{ color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Pending: {pendingCount}
            </span>
            <span style={{ color: 'var(--text-muted)', padding: '2px 0' }}>
              ({winCount}W - {lossCount}L)
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <select 
            value={outcomeFilter} 
            onChange={e => setOutcomeFilter(e.target.value)}
            style={{ 
              padding: '0.5rem', 
              borderRadius: '8px', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-normal)',
              fontSize: '.85rem'
            }}
          >
            <option value="All">All Outcomes</option>
            <option value="Win">Wins Only</option>
            <option value="Loss">Losses Only</option>
            <option value="Pending">Pending Only</option>
          </select>
          <input 
            type="text" 
            placeholder="Search..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ 
              marginRight: '1rem', 
              padding: '0.5rem .75rem', 
              borderRadius: '8px', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-normal)',
              fontSize: '.85rem'
            }}
          />
        </div>
        <button class="btn-primary" onClick={() => setShow(!show)} id="add-trade-btn">
          {show ? '✕ Cancel' : '+ Log Trade'}
        </button>
      </div>

      {show && (
        <form class="trade-form" onSubmit={submit}>
          <div class="form-row">
            <label>Entry<input type="number" required step="0.01" value={form.entry} onChange={e => setForm(f=>({...f,entry:+e.target.value}))} /></label>
            <label>Stop Loss<input type="number" required step="0.01" value={form.sl} onChange={e => setForm(f=>({...f,sl:+e.target.value}))} /></label>
            <label>Take Profit<input type="number" required step="0.01" value={form.tp} onChange={e => setForm(f=>({...f,tp:+e.target.value}))} /></label>
          </div>
          <div class="form-row">
            <label>Session
              <select value={form.session} onChange={e => setForm(f=>({...f,session:e.target.value as Trade['session']}))}>
                <option>London</option><option>NewYork</option><option>Asia</option>
              </select>
            </label>
            <label>Bias
              <select value={form.bias} onChange={e => setForm(f=>({...f,bias:e.target.value as Trade['bias']}))}>
                <option>Bullish</option><option>Bearish</option><option>Neutral</option>
              </select>
            </label>
            <label>Outcome
              <select value={form.outcome} onChange={e => setForm(f=>({...f,outcome:e.target.value as Trade['outcome']}))}>
                <option>Pending</option><option>Win</option><option>Loss</option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label>Setup Type<input type="text" required placeholder="e.g. FVG + Sweep" value={form.setup_type} onChange={e => setForm(f=>({...f,setup_type:e.target.value}))} /></label>
            <label>R:R (realized)<input type="number" step="0.01" value={form.rr ?? ''} onChange={e => setForm(f=>({...f,rr:e.target.value?+e.target.value:undefined}))} /></label>
          </div>
          <label>Notes<textarea rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></label>
          <button type="submit" class="btn-primary">Save Trade</button>
        </form>
      )}

      {loading ? (
        <p class="empty-state">Loading trades…</p>
      ) : trades.length === 0 ? (
        <p class="empty-state">No trades logged yet. Click <strong>+ Log Trade</strong> to start.</p>
      ) : (
        <div class="table-wrapper">
          <table class="trade-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('timestamp')}>Date {sortConfig?.key === 'timestamp' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('session')}>Session {sortConfig?.key === 'session' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('setup_type')}>Setup {sortConfig?.key === 'setup_type' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('bias')}>Bias {sortConfig?.key === 'bias' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('spread')}>Spread {sortConfig?.key === 'spread' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('entry')}>Entry {sortConfig?.key === 'entry' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('sl')}>SL {sortConfig?.key === 'sl' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('tp')}>TP {sortConfig?.key === 'tp' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th onClick={() => requestSort('rr')}>R:R {sortConfig?.key === 'rr' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                <th>P/L</th>
                <th onClick={() => requestSort('outcome')}>Outcome {sortConfig?.key === 'outcome' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map(t => (
                <tr key={t.id}>
                  <td>{t.timestamp ? new Date(t.timestamp).toLocaleString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  }) : '—'}</td>
                  <td>{t.session}</td>
                  <td>{t.setup_type}</td>
                  <td style={{ color: BIAS_COLOR[t.bias] }}>{t.bias}</td>
                  <td>{t.spread?.toFixed(2) ?? '—'}</td>
                  <td>{t.entry}</td>
                  <td>{t.sl}</td>
                  <td>{t.tp}</td>
                  <td>{t.rr?.toFixed(2) ?? '—'}</td>
                  <td style={{ color: calculatePL(t) >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                    {calculatePL(t) !== 0 ? (calculatePL(t) > 0 ? `+${calculatePL(t).toFixed(2)}` : calculatePL(t).toFixed(2)) : '—'}
                  </td>
                  <td style={{ color: OUTCOME_COLOR[t.outcome ?? 'Pending'], display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                    {t.outcome ?? 'Pending'}
                    {(t.outcome === 'Pending' || !t.outcome) && onStopTrade && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Find the matching NestJS active trade ID if it exists
                          const activeTrade = activeNestTrades?.find(at => at.tradeId === t.id || at.tradeId === t._id);
                          if (activeTrade) {
                            onStopTrade(activeTrade._id);
                          } else {
                            // Fallback if not found in activeNestTrades (e.g. if it was a manual trade)
                            // or if we just want to stop by some logic.
                            // For now, we only stop if we have the NestJS internal ID.
                            console.warn("No active NestJS trade found for this journal entry.");
                          }
                        }}
                        style={{ 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          background: 'var(--bearish)', 
                          color: '#000', 
                          border: 'none', 
                          fontSize: '0.6rem', 
                          fontWeight: 900, 
                          cursor: 'pointer' 
                        }}
                      >
                        STOP
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '1rem', 
              marginTop: '1.5rem',
              padding: '1rem 0',
              borderTop: '1px solid var(--border)'
            }}>
              <button 
                class="btn-secondary" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.4rem 0.8rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                ← Previous
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: currentPage === page ? 'var(--primary)' : 'var(--bg-elevated)',
                      color: currentPage === page ? 'white' : 'var(--text-normal)',
                      cursor: 'pointer',
                      fontWeight: currentPage === page ? 'bold' : 'normal'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                class="btn-secondary" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.4rem 0.8rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
