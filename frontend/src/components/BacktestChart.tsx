import { 
  ComposedChart, 
  Line, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Scatter,
  Brush
} from 'recharts';



interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Trade {
  entry_price: number;
  exit_price: number;
  entry_time: string;
  exit_time: string;
  side: 'BUY' | 'SELL';
  pnl: number;
  strategy: string;
  exit_reason?: string;
}

interface Props {
  candles: Candle[];
  trades: Trade[];
}

// Custom Marker Shapes
const TriangleUp = (props: any) => {
  const { cx, cy } = props;
  if (isNaN(cx) || isNaN(cy)) return null;
  return (
    <path 
      d={`M ${cx} ${cy - 8} L ${cx - 6} ${cy + 4} L ${cx + 6} ${cy + 4} Z`} 
      fill="var(--bullish)" 
      stroke="#000" 
      strokeWidth={1}
    />
  );
};

const TriangleDown = (props: any) => {
  const { cx, cy } = props;
  if (isNaN(cx) || isNaN(cy)) return null;
  return (
    <path 
      d={`M ${cx} ${cy + 8} L ${cx - 6} ${cy - 4} L ${cx + 6} ${cy - 4} Z`} 
      fill="var(--bearish)" 
      stroke="#000" 
      strokeWidth={1}
    />
  );
};

const ExitMarker = (props: any) => {
  const { cx, cy, payload } = props;
  if (isNaN(cx) || isNaN(cy)) return null;
  const isProfit = payload.pnl > 0;
  return (
    <circle 
      cx={cx} cy={cy} r={4} 
      fill="#fff" 
      stroke={isProfit ? 'var(--bullish)' : 'var(--bearish)'} 
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({ active, payload }: any) => {

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isTrade = !!data.type;
    
    return (
      <div className="glass" style={{ padding: '10px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
        <p style={{ margin: 0, fontWeight: 800, color: 'var(--gold)' }}>
          {new Date(data.timestamp || data.time).toLocaleTimeString()}
        </p>
        
        {isTrade ? (
          <div style={{ marginTop: '5px' }}>
            <p style={{ margin: 0 }}>
              <span style={{ color: data.side === 'BUY' ? 'var(--bullish)' : 'var(--bearish)', fontWeight: 800 }}>
                {data.side} {data.type}
              </span>
            </p>
            <p style={{ margin: 0 }}>Price: <b>{data.price.toFixed(2)}</b></p>
            {data.type === 'EXIT' && (
              <>
                <p style={{ margin: 0, color: data.pnl > 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                  PnL: <b>{data.pnl > 0 ? '+' : ''}{data.pnl.toFixed(2)}</b>
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.7 }}>Reason: {data.reason}</p>
              </>
            )}
            <p style={{ margin: 0, fontSize: '0.7rem', marginTop: '4px', opacity: 0.8 }}>Strategy: {data.strategy}</p>
          </div>
        ) : (
          <div style={{ marginTop: '5px' }}>
            <p style={{ margin: 0 }}>Price: <b>{data.close.toFixed(2)}</b></p>
            <p style={{ margin: 0, fontSize: '0.7rem' }}>O: {data.open} H: {data.high} L: {data.low}</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function BacktestChart({ candles, trades }: Props) {
  if (!candles || candles.length === 0) return null;

  // Combine candles and trade markers based on timestamp match
  // For better Recharts performance and markers alignment
  const mergedData = candles.map(c => {
    const entry = trades.find(t => t.entry_time === c.timestamp);
    const exit = trades.find(t => t.exit_time === c.timestamp);
    
    return {
      ...c,
      marker: entry ? { 
        type: 'ENTRY', side: entry.side, price: entry.entry_price, strategy: entry.strategy 
      } : exit ? {
        type: 'EXIT', side: exit.side, price: exit.exit_price, strategy: exit.strategy, pnl: exit.pnl, reason: exit.exit_reason
      } : null
    };
  });

  // Extract trade markers for the Scatter layer
  const scatterData = mergedData.filter(d => d.marker).map(d => ({
    ...d.marker,
    timestamp: d.timestamp,
    price: d.marker!.price
  }));

  return (
    <div style={{ width: '100%', marginTop: '2rem', background: 'rgba(0,0,0,0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Price Action & Execution Map
        </h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '10px' }}>
           <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid var(--bullish)' }} /> BUY
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid var(--bearish)' }} /> SELL
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid white' }} /> EXIT
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            stroke="var(--text-muted)"
            fontSize={10}
            minTickGap={50}
          />
          
          <YAxis 
            domain={['auto', 'auto']} 
            stroke="var(--text-muted)" 
            fontSize={10} 
            orientation="right"
            tickFormatter={(val) => val.toFixed(2)}
          />
          
          <Tooltip content={<CustomTooltip />} />

          <Area 
            type="monotone" 
            dataKey="close" 
            stroke="none" 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />

          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="var(--gold)" 
            dot={false} 
            strokeWidth={1} 
            opacity={0.6}
          />

          <Scatter data={scatterData} shape={(props: any) => {
             const { type, side } = props.payload;
             if (type === 'ENTRY') {
               return side === 'BUY' ? <TriangleUp {...props} /> : <TriangleDown {...props} />;
             }
             return <ExitMarker {...props} />;
          }} />

          <Brush 
            dataKey="timestamp" 
            height={30} 
            stroke="var(--gold)" 
            fill="rgba(0,0,0,0.5)"
            tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

