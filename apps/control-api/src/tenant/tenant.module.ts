import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { FailureInjectionModule } from '../failure-injection/failure-injection.module';

@Module({
  imports: [FailureInjectionModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
