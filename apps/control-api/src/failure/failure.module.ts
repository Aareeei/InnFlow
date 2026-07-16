import { Module } from '@nestjs/common';
import { FailureController } from './failure.controller';
import { FailureService } from './failure.service';

@Module({
  controllers: [FailureController],
  providers: [FailureService],
})
export class FailureModule {}
