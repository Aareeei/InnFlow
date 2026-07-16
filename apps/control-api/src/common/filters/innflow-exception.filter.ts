import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import type { Response } from 'express';
import { InnFlowError, ValidationError } from '@innflow/domain';
import { ZodError } from 'zod';

@Catch()
export class InnFlowExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId;

    if (exception instanceof InnFlowError) {
      response.status(exception.httpStatus).json({
        error: {
          code: exception.code,
          message: exception.message,
          traceId,
          details: exception.details,
        },
      });
      return;
    }

    if (exception instanceof ZodError) {
      const validationError = new ValidationError('Validation failed', {
        issues: exception.issues,
      });
      response.status(validationError.httpStatus).json({
        error: {
          code: validationError.code,
          message: validationError.message,
          traceId,
          details: validationError.details,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ?? exception.message);

      response.status(status).json({
        error: {
          code: HttpStatus[status] ?? 'HTTP_ERROR',
          message: Array.isArray(message) ? message.join(', ') : message,
          traceId,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        traceId,
      },
    });
  }
}
