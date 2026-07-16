import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  httpErrorsTotal,
} from '@innflow/telemetry';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = process.hrtime.bigint();
    const route = request.route?.path ?? request.path;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(method, route, response.statusCode, start);
        },
        error: () => {
          this.record(method, route, response.statusCode || 500, start);
        },
      }),
    );
  }

  private record(method: string, route: string, statusCode: number, start: bigint): void {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = { method, route, status: String(statusCode) };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe({ method, route }, durationSeconds);

    if (statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  }
}
