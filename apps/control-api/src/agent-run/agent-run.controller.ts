import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AgentRunService } from './agent-run.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('agent-runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('agent-runs')
export class AgentRunController {
  constructor(private readonly agentRuns: AgentRunService) {}

  @Get()
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'List AI agent runs' })
  list(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Query('guestRequestId') guestRequestId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const resolvedLimit = limit ? Number(limit) : pageSize ? Number(pageSize) : undefined;
    return this.agentRuns.listAgentRuns(req[TENANT_ID_KEY], {
      guestRequestId,
      limit: resolvedLimit,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get agent run by ID' })
  get(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.agentRuns.getAgentRun(req[TENANT_ID_KEY], id);
  }
}
