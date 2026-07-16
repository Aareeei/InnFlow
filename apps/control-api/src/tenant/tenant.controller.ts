import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { TenantService } from './tenant.service';
import { FailureInjectionService } from '../failure-injection/failure-injection.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard, requireTenantId } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { TENANT_ID_KEY } from '../common/types';

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenants: TenantService,
    private readonly failureInjection: FailureInjectionService,
  ) {}

  @Get('current')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get current tenant settings' })
  async current(@Req() req: Request & { [TENANT_ID_KEY]?: string }) {
    const tenantId = requireTenantId(req);
    const tenant = await this.tenants.requireTenant(tenantId);
    const failureInjection = await this.failureInjection.getConfig(tenantId);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      failureInjection,
    };
  }

  @Patch('current')
  @RequirePermissions('requests:write')
  @ApiOperation({ summary: 'Update current tenant settings' })
  async updateCurrent(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Body() body: UpdateTenantDto,
  ) {
    const tenantId = requireTenantId(req);
    const tenant = await this.tenants.updateTenant(tenantId, body);
    const failureInjection = await this.failureInjection.getConfig(tenantId);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      failureInjection,
    };
  }
}
