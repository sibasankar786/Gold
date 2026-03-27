import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AutoTradeModule } from './auto-trade/auto-trade.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/astratrade_nest'),
    AutoTradeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
