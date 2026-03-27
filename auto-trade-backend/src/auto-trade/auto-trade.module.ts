import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutoTradeService } from './auto-trade.service';
import { AutoTradeController } from './auto-trade.controller';
import { AutoTradeControl, AutoTradeControlSchema } from './schemas/auto-trade-control.schema';
import { TradeState, TradeStateSchema } from './schemas/trade-state.schema';

import { AutoTradePollingService } from './auto-trade-polling.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutoTradeControl.name, schema: AutoTradeControlSchema },
      { name: TradeState.name, schema: TradeStateSchema },
    ]),
  ],
  providers: [AutoTradeService, AutoTradePollingService],
  controllers: [AutoTradeController],
  exports: [AutoTradeService],
})
export class AutoTradeModule {}
