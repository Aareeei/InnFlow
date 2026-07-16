import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { getMetricsText } from '@innflow/telemetry';
import { MetricsOverviewService } from './metrics-overview.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('metrics')
@Controller()
export class MetricsController {
  constructor(private readonly overviewService: MetricsOverviewService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics' })
  async metrics(): Promise<string> {
    return getMetricsText();
  }

  @Get('metrics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @RequirePermissions('requests:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard overview metrics' })
  getOverview(@Req() req: Request & { [TENANT_ID_KEY]?: string }) {
    return this.overviewService.getOverview(req[TENANT_ID_KEY]);
  }
}
