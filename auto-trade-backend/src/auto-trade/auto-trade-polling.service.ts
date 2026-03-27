import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { AutoTradeService } from './auto-trade.service';

@Injectable()
export class AutoTradePollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoTradePollingService.name);
  private intervalId: NodeJS.Timeout;

  constructor(private readonly autoTradeService: AutoTradeService) {}

  onModuleInit() {
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.logger.log('Starting Price Polling Loop (1000ms)');
    this.intervalId = setInterval(async () => {
      try {
        // In a real system, you'd fetch from an exchange or MT5 bridge
        // For this standalone setup, we'll simulate or fetch from a known source
        const { price, spread } = await this.getCurrentPriceAndSpread();
        if (price > 0) {
          await this.autoTradeService.onPriceUpdate(price, spread || 0);
        }

      } catch (err) {
        this.logger.error('Error in polling loop:', err.message);
      }
    }, 1000);
  }

  private stopPolling() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /**
   * Mocking the price fetch. 
   * In production, this would call your MT5 Bridge or a Market Data Provider.
   */
  private async getCurrentPriceAndSpread(): Promise<{ price: number, spread: number }> {
    // Fetch live price and spread from FastAPI market endpoint
    try {
      const response = await fetch('http://localhost:8000/market/price');
      const data = await response.json();
      return { price: data.price ?? 0, spread: data.spread ?? 0 };
    } catch (e) {
      this.logger.error(`Failed to fetch live price/spread: ${e.message}`);
      return { price: 0, spread: 0 };
    }
  }

}
