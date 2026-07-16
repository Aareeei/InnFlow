import { Module } from '@nestjs/common';
import { FailureInjectionController } from './failure-injection.controller';
import { FailureInjectionDashboardController } from './failure-injection-dashboard.controller';
import { FailureInjectionService } from './failure-injection.service';

@Module({
  controllers: [FailureInjectionController, FailureInjectionDashboardController],
  providers: [FailureInjectionService],
  exports: [FailureInjectionService],
})
export class FailureInjectionModule {}
