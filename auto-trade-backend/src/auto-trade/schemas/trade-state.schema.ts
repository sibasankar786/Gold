import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TradeState extends Document {
  @Prop({ default: '5' })
  strategy: string;

  @Prop({ default: 'NONE' })
  position: 'NONE' | 'BUY' | 'SELL';

  @Prop({ default: 0 })
  entryPrice: number;

  @Prop({ default: 0 })
  peakPrice: number;

  @Prop({ default: 0 })
  lowestPrice: number;

  @Prop({ default: false })
  trailingActive: boolean;

  @Prop({ default: null })
  tradeId: string;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const TradeStateSchema = SchemaFactory.createForClass(TradeState);
