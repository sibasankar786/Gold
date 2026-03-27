import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AutoTradeControl extends Document {
  @Prop({ default: false })
  isEnabled: boolean;

  @Prop({ default: false })
  is5Enabled: boolean;

  @Prop({ default: false })
  is10Enabled: boolean;

  @Prop({ default: false })
  isBreakoutEnabled: boolean;

  @Prop({ default: false })
  isLiquidityGrabEnabled: boolean;

  @Prop({ type: Object, default: {} })
  lastSides: Record<string, string>;

  @Prop()
  updatedAt: Date;
}

export const AutoTradeControlSchema = SchemaFactory.createForClass(AutoTradeControl);
