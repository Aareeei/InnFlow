import { Controller, Get, Param, Post, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  @Get()
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'List workflow executions' })
  list(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.workflows.listWorkflows(req[TENANT_ID_KEY], {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get workflow execution by ID' })
  get(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.workflows.getWorkflow(req[TENANT_ID_KEY], id);
  }

  @Get(':id/status')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get live workflow status from Temporal' })
  status(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.workflows.getWorkflowStatus(req[TENANT_ID_KEY], id);
  }

  @Post(':id/signal/cancel')
  @RequirePermissions('workflows:retry')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send cancel signal to workflow' })
  cancel(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.workflows.cancelWorkflow(req[TENANT_ID_KEY], id);
  }
}
