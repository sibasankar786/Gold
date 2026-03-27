import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutoTradeControl } from './schemas/auto-trade-control.schema';
import { TradeState } from './schemas/trade-state.schema';

@Injectable()
export class AutoTradeService implements OnModuleInit {
  private readonly logger = new Logger(AutoTradeService.name);
  private readonly STRATEGIES = ['5', '10', 'Breakout', 'LiquidityGrab'];
  private readonly MIN_VOLATILITY = 3.5; // pts per 5 M1 candles
  private breakoutTicks: Record<string, number> = { BUY: 0, SELL: 0 };


  constructor(
    @InjectModel(AutoTradeControl.name) private controlModel: Model<AutoTradeControl>,
    @InjectModel(TradeState.name) private stateModel: Model<TradeState>,
  ) {}

  async onModuleInit() {
    // Ensure control and initial states exist
    const control = await this.controlModel.findOne();
    if (!control) await this.controlModel.create({ 
      isEnabled: false, 
      is5Enabled: false, 
      is10Enabled: false,
      isBreakoutEnabled: false,
      isLiquidityGrabEnabled: false
    });
    
    this.logger.log('Auto-Trade Multi-Trade Service Initialized (Max 20 Positions)');
  }

  async getStatus() {
    const control = await this.controlModel.findOne();
    const state = await this.stateModel.find({ position: { $ne: 'NONE' } });
    return { control, state };
  }

  async toggle(isEnabled: boolean) {
    await this.controlModel.updateOne({}, { 
      isEnabled, 
      is5Enabled: isEnabled, 
      is10Enabled: isEnabled, 
      isBreakoutEnabled: isEnabled,
      isLiquidityGrabEnabled: isEnabled,
      updatedAt: new Date() 
    });
    return { isEnabled };
  }

  async stopTrade(id: string) {
    const state = await this.stateModel.findById(id);
    if (!state || state.position === 'NONE') return { status: 'error', message: 'No active trade' };

    this.logger.log(`[MANUAL STOP] [${state.strategy}] Stopping trade ${id} at request.`);
    // Fetch current price to close
    const priceRes = await fetch('http://localhost:8000/market/price');
    const priceData = await priceRes.json();
    const currentPrice = priceData.price || state.entryPrice;

    await this.closeTradeInPython(state, currentPrice);
    await this.stateModel.deleteOne({ _id: id });
    return { status: 'success' };
  }

  /**
   * Main Price Update Hook — The Engine
   */
  async onPriceUpdate(price: number, spread: number = 0) {

    const control = await this.controlModel.findOne();
    if (!control || !control.isEnabled) return;

    // 1. Manage existing trades
    const activeTrades = await this.stateModel.find({ position: { $ne: 'NONE' } });
    this.logger.log(`[POLLING] Price: ${price} | Active Trades: ${activeTrades.length}/20`);

    for (const state of activeTrades) {
      if (state.position === 'BUY') {
        await this.handleBuyLogic(price, state);
      } else if (state.position === 'SELL') {
        await this.handleSellLogic(price, state);
      }
    }

    // 2. Handle New Entries (if capacity < 20)
    if (activeTrades.length < 20 && control.isEnabled) {
      try {
        // Fetch Context (M5 Data & AI Bias)
        const [m5Res, aiRes] = await Promise.all([
          fetch('http://localhost:8000/market/candles?timeframe=5m&bars=30'),
          fetch('http://localhost:8000/analyze/results')
        ]);
        
        const m5Data = await m5Res.json();
        const aiData = await aiRes.json();
        
        const m5 = m5Data.candles || [];
        const aiBias = aiData.bias || 'Neutral';
        const marketState = this.getMarketState(m5);

        this.logger.debug(`[DYNAMIC] State: ${marketState} | AI Bias: ${aiBias}`);

        // --- STRATEGY ROUTER ---
        if (marketState === 'TREND_BULLISH' || marketState === 'TREND_BEARISH') {
          // TRENDING: Use Breakout Scalping (strictly following AI bias)
          if (marketState === 'TREND_BULLISH' && aiBias === 'Bullish' && control.isBreakoutEnabled) {
             await this.handleBreakoutSignal(price, spread, 'BUY');
          } else if (marketState === 'TREND_BEARISH' && aiBias === 'Bearish' && control.isBreakoutEnabled) {
             await this.handleBreakoutSignal(price, spread, 'SELL');
          }
        } else if (marketState === 'RANGE') {
          // RANGING: Use Liquidity Grab (Sweep)
          if (control.isLiquidityGrabEnabled) {
            await this.handleLiquidityGrabSignal(price, spread, aiBias);
          }
        } else if (marketState === 'NEUTRAL') {
          // Optional: Strategy 5/10 as fallback if enabled
          if (control.is5Enabled || control.is10Enabled) {
            this.logger.debug(`[FALLBACK] Market Neutral. Checking legacy 5/10 strategies.`);
            for (const strat of ['5', '10']) {
              const isStratEnabled = strat === '5' ? control.is5Enabled : control.is10Enabled;
              if (!isStratEnabled) continue;

              const tradesForStrategy = activeTrades.filter(t => t.strategy === strat);
              const canEnter = tradesForStrategy.length === 0 || 
                               tradesForStrategy.every(t => Math.abs(price - t.entryPrice) >= 5);
              
              if (canEnter) {
                const side = await this.getNextSide(strat);
                if (side === 'BUY') await this.handleEntry(price, strat, spread);
                else await this.handleSellEntry(price, strat, spread);
              }
            }
          }
        }
      } catch (e) {
        this.logger.error(`[DYNAMIC ERROR] Failed to fetch market context: ${e.message}`);
      }
    } else if (activeTrades.length >= 20) {
      this.logger.warn(`[CAPACITY] Maximum trades (20) reached. Ignoring new signals.`);
    }
  }

  private getMarketState(m5: any[]): 'TREND_BULLISH' | 'TREND_BEARISH' | 'RANGE' | 'NEUTRAL' {
    if (!m5 || m5.length < 21) return 'NEUTRAL';

    const ema9 = this.calculateEMA(m5.map(c => c.close), 9);
    const ema21 = this.calculateEMA(m5.map(c => c.close), 21);
    const distance = Math.abs(ema9 - ema21);

    const highs = m5.slice(-10).map(c => c.high);
    const lows = m5.slice(-10).map(c => c.low);
    const range = Math.max(...highs) - Math.min(...lows);

    if (ema9 > ema21 && distance > 1) return 'TREND_BULLISH';
    if (ema9 < ema21 && distance > 1) return 'TREND_BEARISH';
    if (range < 8) return 'RANGE';

    return 'NEUTRAL';
  }


  // Modified handleEntry to create a NEW document instead of updating one
  private async handleEntry(price: number, strategy: string, spread: number = 0) {
    this.logger.log(`[ENTRY] [${strategy}] Auto-Trade Triggered. Position: BUY @ ${price}. Spread Buffer: ${spread}`);
    
    // Spread adjustment (Broker TP/SL should be offset by spread)
    const dist = parseInt(strategy) || 10;
    const baseSL = price - dist;
    const baseTP = price + (dist * 1.5);
    const adjustedSL = baseSL + spread;
    const adjustedTP = baseTP - spread;

    const tradeId = await this.openNewTradeInPython('BUY', price, strategy);
    
    if (!tradeId) {
      this.logger.error(`[ENTRY ERROR] [${strategy}] Failed to create pending trade in journal.`);
      return;
    }

    await this.stateModel.create({
      strategy,
      position: 'BUY',
      entryPrice: price,
      peakPrice: price,
      trailingActive: false,
      tradeId: tradeId,
      lastUpdated: new Date(),
    });
    // Execute BUY order via MT5 backend (with adjusted SL/TP)
    await this.executeOrder('BUY', 0.01, adjustedSL, adjustedTP);
  }


  // --- NEW: Scalping Strategy Logic ---
  private async handleBreakoutSignal(price: number, spread: number = 0, filteredSide?: 'BUY' | 'SELL') {
    try {
      // 1. Fetch M1 Data (M5 already handled in the router)
      const m1Res = await fetch('http://localhost:8000/market/candles?timeframe=1m&bars=15');
      const m1Data = await m1Res.json();
      const m1: any[] = m1Data.candles || [];

      if (!m1 || m1.length < 10) return;


      // 2. Volatility Filter (Last 5 M1 candles)
      const last5 = m1.slice(-5);
      const volHigh = Math.max(...last5.map(c => c.high));
      const volLow  = Math.min(...last5.map(c => c.low));
      const range = volHigh - volLow;
      if (range < this.MIN_VOLATILITY) return; // Dead market

      // 3. (Optional) M5 Trend Filter (Already handled by Router, but can secondary check)
      const isBullish = filteredSide === 'BUY';
      const isBearish = filteredSide === 'SELL';


      // 4. Breakout Levels (Lookback 10 M1)
      const lookback = m1.slice(-10);
      const resistance = Math.max(...lookback.map(c => c.high));
      const support    = Math.min(...lookback.map(c => c.low));

      // 5. Candle Strength Confirmation
      const lastCandle = m1[m1.length - 1];
      const body = Math.abs(lastCandle.close - lastCandle.open);
      const wick = lastCandle.high - lastCandle.low || 0.1;
      const isStrong = (body / wick) > 0.6;      // 6. Final Trigger with Fakeout Protection (2-Tick Confirmation)
      if (price > resistance && isStrong && isBullish && (!filteredSide || filteredSide === 'BUY')) {
        this.breakoutTicks.BUY++;
        this.breakoutTicks.SELL = 0;
        
        if (this.breakoutTicks.BUY >= 2) {
          this.logger.log(`[BREAKOUT] [BUY] Confirmed @ ${price} (Tick ${this.breakoutTicks.BUY}). Spread: ${spread}`);
          await this.handleEntry(price, 'Breakout', spread);
          this.breakoutTicks.BUY = 0; // Reset after entry
        } else {
          this.logger.log(`[BREAKOUT] [BUY] Potential breakout @ ${price}. Waiting for confirmation...`);
        }
      } else if (price < support && isStrong && isBearish && (!filteredSide || filteredSide === 'SELL')) {
        this.breakoutTicks.SELL++;
        this.breakoutTicks.BUY = 0;
        
        if (this.breakoutTicks.SELL >= 2) {
          this.logger.log(`[BREAKOUT] [SELL] Confirmed @ ${price} (Tick ${this.breakoutTicks.SELL}). Spread: ${spread}`);
          await this.handleSellEntry(price, 'Breakout', spread);
          this.breakoutTicks.SELL = 0; // Reset after entry
        } else {
          this.logger.log(`[BREAKOUT] [SELL] Potential breakout @ ${price}. Waiting for confirmation...`);
        }
      } else {
        // Reset counters if conditions fail
        this.breakoutTicks.BUY = 0;
        this.breakoutTicks.SELL = 0;
      }


    } catch (e) {
      this.logger.error(`[SCALPING ERROR] ${e.message}`);
    }
  }

  private calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] * k) + (ema * (1 - k));
    }
    return ema;
  }

  private async handleSellEntry(price: number, strategy: string, spread: number = 0) {
    this.logger.log(`[ENTRY] [${strategy}] Auto-Trade Triggered. Position: SELL @ ${price}. Spread Buffer: ${spread}`);
    
    // Spread adjustment (Broker TP/SL should be offset by spread)
    const dist = parseInt(strategy) || 10;
    const baseSL = price + dist;
    const baseTP = price - (dist * 1.5);
    const adjustedSL = baseSL + spread;
    const adjustedTP = baseTP - spread;

    const tradeId = await this.openNewTradeInPython('SELL', price, strategy);
    if (!tradeId) return;

    await this.stateModel.create({
      strategy,
      position: 'SELL',
      entryPrice: price,
      lowestPrice: price,
      trailingActive: false,
      tradeId: tradeId,
      lastUpdated: new Date(),
    });
    await this.executeOrder('SELL', 0.01, adjustedSL, adjustedTP);
  }


  private async handleLiquidityGrabSignal(price: number, spread: number = 0, aiBias: string = 'Neutral') {
    try {
      const m1Res = await fetch('http://localhost:8000/market/candles?timeframe=1m&bars=20');
      const m1Data = await m1Res.json();
      const m1: any[] = m1Data.candles;
      if (!m1 || m1.length < 15) return;

      const lastCandle = m1[m1.length - 1];
      const prevCandles = m1.slice(-15, -1);
      const prevHigh = Math.max(...prevCandles.map(c => c.high));
      const prevLow  = Math.min(...prevCandles.map(c => c.low));

      const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
      const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
      const body = Math.abs(lastCandle.close - lastCandle.open) || 0.1;

      // Logic: Sweep and Rejection
      const sweepHigh = lastCandle.high > prevHigh && lastCandle.close < prevHigh;
      const sweepLow  = lastCandle.low < prevLow && lastCandle.close > prevLow;

      if (sweepHigh && upperWick > body * 1.5 && (aiBias === 'Bearish' || aiBias === 'Neutral')) {
        this.logger.log(`[LIQUIDITY] [SELL] Sweep High @ ${lastCandle.high}. Spread: ${spread}. Bias: ${aiBias}`);
        await this.handleSellEntry(price, 'LiquidityGrab', spread);
      } else if (sweepLow && lowerWick > body * 1.5 && (aiBias === 'Bullish' || aiBias === 'Neutral')) {
        this.logger.log(`[LIQUIDITY] [BUY] Sweep Low @ ${lastCandle.low}. Spread: ${spread}. Bias: ${aiBias}`);
        await this.handleEntry(price, 'LiquidityGrab', spread);
      }


    } catch (e) {
      this.logger.error(`[LIQUIDITY ERROR] ${e.message}`);
    }
  }

  private async getNextSide(strategy: string): Promise<'BUY' | 'SELL'> {
    // Check local TradeState for the most recent entry of this strategy
    const lastTrade = await this.stateModel.findOne({ strategy }).sort({ lastUpdated: -1 });
    if (!lastTrade || lastTrade.position === 'NONE') {
      // If we found a reset record, check its previous state from elsewhere or just use the last known
      // Actually, if position is 'NONE', it means it was closed. 
      // We need to know what it WAS. We can add a 'lastSide' field OR check the journal.
      // Easiest: default to SELL if we only see BUY history.
    }
    
    // For simplicity, let's just query the last trade's position before it was reset if possible, 
    // or better: just store it in the Control model.
    const control = await this.controlModel.findOne();
    const lastSides = (control as any).lastSides || {};
    const currentLastSide = lastSides[strategy] || 'SELL';
    const nextSide = currentLastSide === 'BUY' ? 'SELL' : 'BUY';
    
    // Update control
    lastSides[strategy] = nextSide;
    await this.controlModel.updateOne({}, { lastSides } as any);
    
    return nextSide;
  }

  private async handleBuyLogic(price: number, state: TradeState) {
    const isSpecial = state.strategy === 'Breakout' || state.strategy === 'LiquidityGrab';
    const threshold = isSpecial ? 5 : parseInt(state.strategy);
    // 1. Activate Trailing if +threshold
    if (!state.trailingActive && price >= state.entryPrice + threshold) {
      this.logger.log(`[TRAILING] [${state.strategy}] BUY Trailing Activated @ ${price}`);
      await this.stateModel.updateOne({ _id: state._id }, { trailingActive: true });
    }

    // 2. Track Peak
    if (price > state.peakPrice) {
      await this.stateModel.updateOne({ _id: state._id }, { peakPrice: price });
    }

    // 3. Exit Condition (Trailing Pullback - Always 2 for now)
    if (state.trailingActive && price <= state.peakPrice - 2) {
      this.logger.log(`[EXIT] [${state.strategy}] Trailing Stop Hit @ ${price}. Peak was ${state.peakPrice}`);
      await this.closeTradeInPython(state, price);
      await this.resetState(state);
      return;
    }
  }

  private async handleSellLogic(price: number, state: TradeState) {
    const isSpecial = state.strategy === 'Breakout' || state.strategy === 'LiquidityGrab';
    const threshold = isSpecial ? 5 : parseInt(state.strategy);
    // 1. Activate Trailing if -threshold
    if (!state.trailingActive && price <= state.entryPrice - threshold) {
      this.logger.log(`[TRAILING] [${state.strategy}] SELL Trailing Activated @ ${price}`);
      await this.stateModel.updateOne({ _id: state._id }, { trailingActive: true });
    }

    // 2. Track Lowest
    if (price < state.lowestPrice) {
      await this.stateModel.updateOne({ _id: state._id }, { lowestPrice: price });
    }

    // 3. Exit Condition (Trailing Pullback - Always 2 for now)
    if (state.trailingActive && price >= state.lowestPrice + 2) {
      this.logger.log(`[EXIT] [${state.strategy}] Trailing Stop Hit @ ${price}. Low was ${state.lowestPrice}`);
      await this.closeTradeInPython(state, price);
      await this.resetState(state);
      return;
    }
  }

  private async openNewTradeInPython(side: 'BUY'|'SELL', entryPrice: number, strategy: string): Promise<string | null> {
    const session = this.getCurrentSession();
    const payload = {
      pair: 'XAUUSD',
      entry: entryPrice,
      sl: entryPrice,
      tp: entryPrice,
      session: session,
      setup_type: strategy,
      bias: side === 'BUY' ? 'Bullish' : 'Bearish',
      spread: 0, // Placeholder, will be updated below
      outcome: 'Pending'
    };
    try {
      this.logger.log(`[JOURNAL] Fetching current price and spread...`);
      const priceRes = await fetch('http://localhost:8000/market/price');
      const priceData = await priceRes.json();
      payload.spread = priceData.spread || 0;
      
      this.logger.log(`[JOURNAL] Attempting to create pending trade: ${JSON.stringify(payload)}`);
      const res = await fetch('http://localhost:8000/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`[JOURNAL ERROR] FastAPI returned ${res.status}: ${errorText}`);
        return null;
      }

      const data = await res.json();
      this.logger.log(`[JOURNAL SUCCESS] Created trade with ID: ${data.id || data._id}`);
      return data.id || data._id;
    } catch (e) {
      this.logger.error(`[JOURNAL ERROR] Fetch failed: ${e.message}`);
      return null;
    }
  }

  private async closeTradeInPython(state: TradeState, exitPrice: number) {
    if (!state.tradeId) return;
    try {
      const isBuy = state.position === 'BUY';
      const profit = isBuy ? (exitPrice - state.entryPrice) : (state.entryPrice - exitPrice);
      const outcome = profit > 0 ? 'Win' : 'Loss';

      const payload = {
        sl: exitPrice,
        tp: exitPrice,
        outcome,
        rr: profit > 0 ? 1.5 : -1.0, 
        notes: `Auto closed at ${exitPrice}. Trailing: ${state.trailingActive}`
      };

      await fetch(`http://localhost:8000/trades/${state.tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.logger.log(`[JOURNAL] Updated trade ${state.tradeId} to ${outcome}.`);
    } catch (e) {
      this.logger.error(`[JOURNAL ERROR] Failed to update trade: ${e.message}`);
    }
  }

  // New helper to execute orders via FastAPI automation endpoint
  private async executeOrder(side: 'BUY' | 'SELL', lot: number, sl: number, tp: number) {
    try {
      const orderPayload = { side, lot, sl, tp };
      const res = await fetch('http://localhost:8000/automation/execute-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const error = await res.json();
        this.logger.error(`[MT5 ERROR] [${side}] Execution Blocked: ${error.detail || 'Unknown error'}`);
        return;
      }

      this.logger.log(`[MT5] [${side}] Order successfully executed.`);
    } catch (e) {
      this.logger.error(`[MT5 ERROR] Fetch failed: ${e.message}`);
    }
  }

  private async resetState(state: TradeState) {
    await this.stateModel.updateOne({ _id: state._id }, {
      position: 'NONE',
      entryPrice: 0,
      peakPrice: 0,
      lowestPrice: 0,
      trailingActive: false,
      lastUpdated: new Date(),
    });
  }

  private getCurrentSession(): 'London' | 'NewYork' | 'Asia' {
    const hour = new Date().getUTCHours();
    // Asia: 00:00 - 08:00 UTC
    // London: 08:00 - 16:00 UTC
    // New York: 13:00 - 21:00 UTC
    // Logic handles overlaps by prioritizing active session progress
    if (hour >= 13 && hour < 21) return 'NewYork';
    if (hour >= 8 && hour < 16) return 'London';
    return 'Asia';
  }
}
