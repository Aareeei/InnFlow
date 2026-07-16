import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsOverviewService } from './metrics-overview.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsOverviewService],
  exports: [MetricsOverviewService],
})
export class MetricsModule {}
