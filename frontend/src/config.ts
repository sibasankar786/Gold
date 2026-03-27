/**
 * config.ts — single source of truth for all app-level constants.
 * Change values here, everything picks them up automatically.
 * In future: load from backend /config endpoint.
 */

export const APP_CONFIG = {
  /** Trading pair focus */
  pair: import.meta.env.VITE_PAIR ?? 'XAUUSD',

  /** Default account balance shown in AI panel */
  defaultBalance: Number(import.meta.env.VITE_DEFAULT_BALANCE ?? 10000),

  /** Default risk % per trade */
  defaultRiskPct: Number(import.meta.env.VITE_DEFAULT_RISK_PCT ?? 0.5),

  /** Backend base URL (without trailing slash) */
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '/api',

  /** App display name */
  appName: import.meta.env.VITE_APP_NAME ?? 'AstraTrade',

  /** Use mock adapter instead of real HTTP */
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
} as const;

/** Confidence bar colour thresholds */
export const CONFIDENCE_THRESHOLDS = {
  high:   0.65,   // green (bullish colour)
  medium: 0.50,   // gold
  // below medium → red (bearish colour)
} as const;

/** Default session for new trade form */
export const DEFAULT_TRADE_SESSION = 'London' as const;
