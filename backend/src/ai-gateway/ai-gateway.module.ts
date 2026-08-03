import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiGatewayLog } from './entities/ai-log.entity';
import { AIGatewayService } from './ai-gateway.service';
import { AiProxyController } from './ai-proxy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiGatewayLog])],
  controllers: [AiProxyController],
  providers: [AIGatewayService],
  exports: [AIGatewayService],
})
export class AiGatewayModule {}

