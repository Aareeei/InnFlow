import { Module, forwardRef } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => EventsModule)],
  controllers: [ApprovalController],
  providers: [ApprovalService],
})
export class ApprovalModule {}
