import { Controller, Get, Param, Post, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FailureService } from './failure.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('failures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('failures')
export class FailureController {
  constructor(private readonly failures: FailureService) {}

  @Get()
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'List failure queue items' })
  list(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.failures.listFailures(req[TENANT_ID_KEY], {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get failure queue item' })
  get(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.failures.getFailure(req[TENANT_ID_KEY], id);
  }

  @Post(':id/requeue')
  @RequirePermissions('failures:requeue')
  @HttpCode(200)
  @ApiOperation({ summary: 'Requeue failed workflow' })
  requeue(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.failures.requeue(req[TENANT_ID_KEY], id);
  }

  @Post(':id/resolve')
  @RequirePermissions('failures:resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resolve failure queue item' })
  resolve(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.failures.resolve(req[TENANT_ID_KEY], id);
  }
}
