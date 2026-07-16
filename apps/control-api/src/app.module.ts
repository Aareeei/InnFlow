import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { createLogger } from '@innflow/telemetry';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { RequestModule } from './request/request.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ApprovalModule } from './approval/approval.module';
import { FailureModule } from './failure/failure.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { EventsModule } from './events/events.module';
import { FailureInjectionModule } from './failure-injection/failure-injection.module';
import { AgentRunModule } from './agent-run/agent-run.module';
import { RedisModule } from './redis/redis.module';
import { TemporalModule } from './temporal/temporal.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { InnFlowExceptionFilter } from './common/filters/innflow-exception.filter';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        logger: createLogger('control-api'),
        autoLogging: true,
      },
    }),
    RedisModule,
    TemporalModule,
    IdempotencyModule,
    AuthModule,
    TenantModule,
    UserModule,
    RequestModule,
    WorkflowModule,
    ApprovalModule,
    FailureModule,
    AuditModule,
    HealthModule,
    MetricsModule,
    EventsModule,
    FailureInjectionModule,
    AgentRunModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: InnFlowExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
