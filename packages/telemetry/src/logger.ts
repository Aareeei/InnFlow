import { trace } from '@opentelemetry/api';
import pino, { type Logger } from 'pino';
import { loadConfig } from '@innflow/config';

export function createLogger(serviceName: string): Logger {
  const config = loadConfig();

  return pino({
    name: serviceName,
    level: config.LOG_LEVEL,
    mixin(): Record<string, string> {
      const span = trace.getActiveSpan();
      if (!span) {
        return {};
      }

      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    },
  });
}
