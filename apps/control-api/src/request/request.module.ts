import { Module, forwardRef } from '@nestjs/common';
import { RequestController } from './request.controller';
import { ChannelsController } from './channels.controller';
import { RequestService } from './request.service';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { TenantModule } from '../tenant/tenant.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [IdempotencyModule, TenantModule, forwardRef(() => EventsModule)],
  controllers: [RequestController, ChannelsController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {}
