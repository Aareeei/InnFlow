import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IncomingRequestSchema } from '@innflow/domain';
import { RequestService } from './request.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard, requireTenantId } from '../common/guards/tenant.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IdempotencyService } from '../idempotency/idempotency.service';
import type { AuthUser } from '../common/types';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('requests')
export class RequestController {
  constructor(
    private readonly requests: RequestService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @RequirePermissions('requests:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create a guest request and start workflow' })
  async create(
    @Req() req: Request & { [TENANT_ID_KEY]?: string; user?: AuthUser },
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(IncomingRequestSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const tenantId = requireTenantId(req);
    const parsed = IncomingRequestSchema.parse(body);

    const result = await this.idempotency.execute({
      tenantId,
      idempotencyKey,
      requestBody: parsed,
      handler: async () => {
        const created = await this.requests.createRequest({
          tenantId,
          idempotencyKey,
          body: parsed,
          createdBy: user.sub,
        });
        return { status: 201, body: created, resourceId: created.id };
      },
    });

    res.status(result.status);
    return result.body;
  }

  @Get()
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'List guest requests' })
  list(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = req[TENANT_ID_KEY];
    return this.requests.listRequests(tenantId, {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get guest request by ID' })
  get(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.requests.getRequest(req[TENANT_ID_KEY], id);
  }

  @Post(':id/cancel')
  @RequirePermissions('requests:write')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a guest request workflow' })
  cancel(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.requests.cancelRequest(req[TENANT_ID_KEY], id);
  }

  @Post(':id/retry')
  @RequirePermissions('workflows:retry')
  @HttpCode(200)
  @ApiOperation({ summary: 'Signal workflow manual retry' })
  retry(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.requests.retryRequest(req[TENANT_ID_KEY], id);
  }

  @Get(':id/timeline')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get request timeline' })
  timeline(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.requests.getTimeline(req[TENANT_ID_KEY], id);
  }

  @Get(':id/artifacts')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get request execution artifacts' })
  artifacts(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.requests.getArtifacts(req[TENANT_ID_KEY], id);
  }
}
