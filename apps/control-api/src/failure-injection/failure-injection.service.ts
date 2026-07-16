import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import {
  FailureInjectionConfigSchema,
  type FailureInjectionConfig,
} from '@innflow/domain';

const FAILURE_INJECTION_KEY = 'failure_injection';

@Injectable()
export class FailureInjectionService {
  private defaultConfig(): FailureInjectionConfig {
    return FailureInjectionConfigSchema.parse({});
  }

  private configWhere(tenantId: string | null) {
    return {
      tenantId,
      key: FAILURE_INJECTION_KEY,
    };
  }

  async getConfig(tenantId: string | null): Promise<FailureInjectionConfig> {
    const record = await prisma.systemConfiguration.findFirst({
      where: this.configWhere(tenantId),
    });

    if (!record) {
      return this.defaultConfig();
    }

    return FailureInjectionConfigSchema.parse(record.valueJson);
  }

  async updateConfig(
    tenantId: string | null,
    config: Partial<FailureInjectionConfig>,
  ): Promise<FailureInjectionConfig> {
    const current = await this.getConfig(tenantId);
    const merged = FailureInjectionConfigSchema.parse({ ...current, ...config });
    const existing = await prisma.systemConfiguration.findFirst({
      where: this.configWhere(tenantId),
    });

    if (existing) {
      await prisma.systemConfiguration.update({
        where: { id: existing.id },
        data: { valueJson: merged },
      });
    } else {
      await prisma.systemConfiguration.create({
        data: {
          tenantId,
          key: FAILURE_INJECTION_KEY,
          valueJson: merged,
        },
      });
    }

    return merged;
  }

  async resetConfig(tenantId: string | null): Promise<FailureInjectionConfig> {
    const defaults = this.defaultConfig();
    const existing = await prisma.systemConfiguration.findFirst({
      where: this.configWhere(tenantId),
    });

    if (existing) {
      await prisma.systemConfiguration.update({
        where: { id: existing.id },
        data: { valueJson: defaults },
      });
    } else {
      await prisma.systemConfiguration.create({
        data: {
          tenantId,
          key: FAILURE_INJECTION_KEY,
          valueJson: defaults,
        },
      });
    }

    return defaults;
  }
}
