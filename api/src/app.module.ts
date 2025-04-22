import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BallotsController } from './ballots/ballots.controller';

@Module({
  imports: [],
  controllers: [AppController, BallotsController],
  providers: [AppService],
})
export class AppModule {}
