import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Journal } from './entities/journal.entity';
import { GamificationState } from '../gamification/entities/gamification-state.entity';
import { JournalsService } from './journals.service';
import { JournalsController } from './journals.controller';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Journal, GamificationState]),
    AiGatewayModule,
  ],
  providers: [JournalsService],
  controllers: [JournalsController],
})
export class JournalsModule {}
