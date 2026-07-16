import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IncomingRequestSchema, type RequestChannel } from '@innflow/domain';
import { RequestService } from './request.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard, requireTenantId } from '../common/guards/tenant.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IdempotencyService } from '../idempotency/idempotency.service';
import type { AuthUser } from '../common/types';
import { TENANT_ID_KEY } from '../common/types';

const channelBodySchema = IncomingRequestSchema.omit({ channel: true });

@ApiTags('channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('channels')
export class ChannelsController {
  constructor(
    private readonly requests: RequestService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post('web')
  @RequirePermissions('requests:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Ingest web channel request' })
  web(@Req() req: Request, @CurrentUser() user: AuthUser, @Headers('idempotency-key') key: string | undefined, @Body(new ZodValidationPipe(channelBodySchema)) body: unknown, @Res({ passthrough: true }) res: Response) {
    return this.ingest(req, user, key, 'WEB', body, res);
  }

  @Post('sms')
  @RequirePermissions('requests:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Ingest SMS channel request' })
  sms(@Req() req: Request, @CurrentUser() user: AuthUser, @Headers('idempotency-key') key: string | undefined, @Body(new ZodValidationPipe(channelBodySchema)) body: unknown, @Res({ passthrough: true }) res: Response) {
    return this.ingest(req, user, key, 'SMS', body, res);
  }

  @Post('email')
  @RequirePermissions('requests:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Ingest email channel request' })
  email(@Req() req: Request, @CurrentUser() user: AuthUser, @Headers('idempotency-key') key: string | undefined, @Body(new ZodValidationPipe(channelBodySchema)) body: unknown, @Res({ passthrough: true }) res: Response) {
    return this.ingest(req, user, key, 'EMAIL', body, res);
  }

  @Post('voice-transcript')
  @RequirePermissions('requests:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Ingest voice transcript channel request' })
  voice(@Req() req: Request, @CurrentUser() user: AuthUser, @Headers('idempotency-key') key: string | undefined, @Body(new ZodValidationPipe(channelBodySchema)) body: unknown, @Res({ passthrough: true }) res: Response) {
    return this.ingest(req, user, key, 'VOICE_TRANSCRIPT', body, res);
  }

  private async ingest(
    req: Request & { [TENANT_ID_KEY]?: string },
    user: AuthUser,
    idempotencyKey: string | undefined,
    channel: RequestChannel,
    body: unknown,
    res: Response,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const tenantId = requireTenantId(req);
    const parsed = this.requests.createChannelRequest(channel, channelBodySchema.parse(body));

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
}
