import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('audit')
export class AuditAliasController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List audit events (dashboard alias)' })
  list(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const resolvedLimit = limit ? Number(limit) : pageSize ? Number(pageSize) : undefined;
    return this.audit.listEvents(req[TENANT_ID_KEY], {
      resourceType,
      resourceId,
      limit: resolvedLimit,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
