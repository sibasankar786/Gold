import * as React from 'react';
import { useEffect, useState } from 'react';
import type { IApiClient } from '../api/ApiClient';
import type { MarketPrice } from '../types/market';

interface PriceHeaderProps {
  api: IApiClient;
  marketData: MarketPrice | null;
}

export const PriceHeader: React.FC<PriceHeaderProps> = ({ api, marketData }) => {
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    if (marketData && prevPrice !== null && marketData.price !== prevPrice) {
      setTrend(marketData.price > prevPrice ? 'up' : 'down');
    }
    if (marketData) {
      setPrevPrice(marketData.price);
    }
  }, [marketData]);

  if (!marketData) return null;

  return (
    <div className="glass" style={{
      margin: '1.25rem 1.5rem 0 1.5rem',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Market Asset</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            GOLD <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.8rem' }}>XAU/USD</span>
          </div>
        </div>

        <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Broker Price</span>
            <div className="status-dot" style={{ width: '6px', height: '6px' }} />
          </div>
          <div style={{ 
            fontSize: '1.75rem', 
            fontWeight: 850, 
            color: trend === 'up' ? 'var(--bullish)' : trend === 'down' ? 'var(--bearish)' : 'var(--text)',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ${marketData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {trend !== 'neutral' && (
              <span style={{ fontSize: '1rem' }}>{trend === 'up' ? '▲' : '▼'}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
        <div style={{ 
          marginTop: '4px',
          padding: '4px 12px',
          borderRadius: '100px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: marketData.session !== 'Off' ? 'var(--bullish)' : 'var(--bearish)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ 
            width: '6px', height: '6px', borderRadius: '50%', 
            background: marketData.session !== 'Off' ? 'var(--bullish)' : 'var(--bearish)',
            boxShadow: `0 0 8px ${marketData.session !== 'Off' ? 'var(--bullish)' : 'var(--bearish)'}`
          }} />
          {marketData.session} Session
        </div>
      </div>
    </div>
  );
};
