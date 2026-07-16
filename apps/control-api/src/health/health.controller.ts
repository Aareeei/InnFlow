import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermissions } from '../common/decorators';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return this.health.live();
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready() {
    return this.health.ready();
  }

  @Get('system/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('system:health')
  @ApiOperation({ summary: 'System status with circuit breakers' })
  systemStatus() {
    return this.health.systemStatus();
  }

  @Get('health/system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('system:health')
  @ApiOperation({ summary: 'Dashboard system health view' })
  dashboardHealth() {
    return this.health.dashboardHealth();
  }
}
