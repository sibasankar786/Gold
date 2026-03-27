import { Controller, Get, Post, Body } from '@nestjs/common';
import { AutoTradeService } from './auto-trade.service';

@Controller('auto-trade')
export class AutoTradeController {
  constructor(private readonly service: AutoTradeService) {}

  @Get('status')
  getStatus() {
    return this.service.getStatus();
  }

  @Post('toggle')
  toggle(@Body() body: { isEnabled: boolean }) {
    return this.service.toggle(body.isEnabled);
  }

  @Post('stop-trade')
  stopTrade(@Body() body: { id: string }) {
    return this.service.stopTrade(body.id);
  }

  /**
   * Internal Hook — simulating price update
   */
  @Post('price-update')
  onPriceUpdate(@Body() body: { price: number }) {
    return this.service.onPriceUpdate(body.price);
  }
}
