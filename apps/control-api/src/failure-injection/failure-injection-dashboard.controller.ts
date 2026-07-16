import { Body, Controller, Get, Patch, Post, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FailureInjectionConfigSchema } from '@innflow/domain';
import type { Request } from 'express';
import { FailureInjectionService } from '../failure-injection/failure-injection.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types';
import { AUTH_USER_KEY, TENANT_ID_KEY } from '../common/types';

@ApiTags('failure-injection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('failure-injection')
export class FailureInjectionDashboardController {
  constructor(private readonly failureInjection: FailureInjectionService) {}

  @Get('config')
  @RequirePermissions('failure-injection:tenant', 'failure-injection:system')
  @ApiOperation({ summary: 'Get failure injection configuration (dashboard)' })
  get(@Req() req: Request & { [AUTH_USER_KEY]: AuthUser; [TENANT_ID_KEY]?: string }, @Query('tenantId') tenantId?: string) {
    const user = req[AUTH_USER_KEY];
    const scopeTenantId = user.role === 'SYSTEM_ADMIN' ? (tenantId ?? null) : (user.tenantId ?? null);
    return this.failureInjection.getConfig(scopeTenantId);
  }

  @Patch('config')
  @RequirePermissions('failure-injection:tenant', 'failure-injection:system')
  @ApiOperation({ summary: 'Update failure injection configuration (dashboard)' })
  update(
    @Req() req: Request & { [AUTH_USER_KEY]: AuthUser; [TENANT_ID_KEY]?: string },
    @Query('tenantId') tenantId: string | undefined,
    @Body(new ZodValidationPipe(FailureInjectionConfigSchema.partial())) body: Partial<unknown>,
  ) {
    const user = req[AUTH_USER_KEY];
    const scopeTenantId = user.role === 'SYSTEM_ADMIN' ? (tenantId ?? null) : (user.tenantId ?? null);
    return this.failureInjection.updateConfig(scopeTenantId, body as never);
  }

  @Post('config/reset')
  @RequirePermissions('failure-injection:tenant', 'failure-injection:system')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset failure injection configuration (dashboard)' })
  reset(@Req() req: Request & { [AUTH_USER_KEY]: AuthUser }, @Query('tenantId') tenantId?: string) {
    const user = req[AUTH_USER_KEY];
    const scopeTenantId = user.role === 'SYSTEM_ADMIN' ? (tenantId ?? null) : (user.tenantId ?? null);
    return this.failureInjection.resetConfig(scopeTenantId);
  }
}
