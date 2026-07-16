import { Module } from '@nestjs/common';
import { AgentRunController } from './agent-run.controller';
import { AgentRunService } from './agent-run.service';

@Module({
  controllers: [AgentRunController],
  providers: [AgentRunService],
  exports: [AgentRunService],
})
export class AgentRunModule {}
