import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TENANT_ID_KEY } from '../common/types';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('stream')
  @ApiOperation({ summary: 'SSE stream for workflow updates' })
  stream(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Res() res: Response): void {
    const tenantId = req[TENANT_ID_KEY];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send({ type: 'connected', tenantId: tenantId ?? null });

    const unsubscribe = this.events.subscribe(tenantId, (event) => {
      send(event);
    });

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }
}
