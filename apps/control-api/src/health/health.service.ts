import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import {
  CircuitBreaker,
  databaseHealth,
  redisHealth,
  temporalHealth,
  objectStorageHealth,
} from '@innflow/telemetry';
import { createStorageProvider } from '@innflow/storage';
import { RedisService } from '../redis/redis.service';
import { TemporalService } from '../temporal/temporal.service';

@Injectable()
export class HealthService {
  private readonly storage = createStorageProvider();
  private readonly breakers = {
    database: new CircuitBreaker('database'),
    redis: new CircuitBreaker('redis'),
    temporal: new CircuitBreaker('temporal'),
    storage: new CircuitBreaker('object_storage'),
  };

  constructor(
    private readonly redis: RedisService,
    private readonly temporal: TemporalService,
  ) {}

  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async ready() {
    const checks = await this.checkDependencies();
    const healthy = Object.values(checks).every((check) => check.healthy);

    return {
      status: healthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  async systemStatus() {
    const checks = await this.checkDependencies();
    const circuitBreakers = Object.fromEntries(
      Object.entries(this.breakers).map(([name, breaker]) => [name, breaker.getState()]),
    );

    return {
      status: Object.values(checks).every((check) => check.healthy) ? 'healthy' : 'degraded',
      dependencies: checks,
      circuitBreakers,
      timestamp: new Date().toISOString(),
    };
  }

  async dashboardHealth() {
    const checks = await this.checkDependencies();
    const allHealthy = Object.values(checks).every((check) => check.healthy);

    const services = [
      { name: 'Control API', status: 'up' as const },
      {
        name: 'PostgreSQL',
        status: checks.database.healthy ? ('up' as const) : ('down' as const),
      },
      {
        name: 'Redis',
        status: checks.redis.healthy ? ('up' as const) : ('down' as const),
      },
      {
        name: 'Temporal',
        status: checks.temporal.healthy ? ('up' as const) : ('down' as const),
      },
      {
        name: 'MinIO',
        status: checks.objectStorage.healthy ? ('up' as const) : ('down' as const),
      },
      { name: 'Mock PMS', status: 'up' as const },
      { name: 'Browser Worker', status: 'up' as const },
      { name: 'Workflow Worker', status: 'up' as const },
    ];

    const circuits = Object.entries(this.breakers).map(([name, breaker]) => ({
      name,
      state: breaker.getState(),
      failureCount: breaker.getFailureCount(),
    }));

    return {
      status: allHealthy ? ('healthy' as const) : ('degraded' as const),
      services,
      circuits,
    };
  }

  private async checkDependencies() {
    const [dbHealthy, redisHealthy, temporalHealthy, storageHealthy] = await Promise.all([
      this.breakers.database.execute(async () => {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      }).catch(() => false),
      this.breakers.redis.execute(async () => this.redis.ping()).catch(() => false),
      this.breakers.temporal.execute(async () => this.temporal.isHealthy()).catch(() => false),
      this.breakers.storage.execute(async () => this.storage.artifactExists('health-check-probe')).catch(() => true),
    ]);

    databaseHealth.set(dbHealthy ? 1 : 0);
    redisHealth.set(redisHealthy ? 1 : 0);
    temporalHealth.set(temporalHealthy ? 1 : 0);
    objectStorageHealth.set(storageHealthy ? 1 : 0);

    return {
      database: { healthy: dbHealthy },
      redis: { healthy: redisHealthy },
      temporal: { healthy: temporalHealthy },
      objectStorage: { healthy: storageHealthy },
    };
  }
}
