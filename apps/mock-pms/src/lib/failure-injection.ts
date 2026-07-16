import { prisma } from '@innflow/database';
import { FailureInjectionConfigSchema, type FailureInjectionConfig } from '@innflow/domain';

const failNextByHotel = new Map<string, boolean>();

export async function getFailureConfig(hotelId: string): Promise<FailureInjectionConfig> {
  const record = await prisma.failureConfiguration.findUnique({
    where: { hotelId },
  });

  if (!record) {
    return FailureInjectionConfigSchema.parse({});
  }

  return FailureInjectionConfigSchema.parse(record.configJson);
}

export async function applyFailureInjection(hotelId: string): Promise<void> {
  const config = await getFailureConfig(hotelId);

  if (config.pmsMaintenanceMode) {
    throw new Error('PMS is in maintenance mode');
  }

  if (config.pmsLatencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.pmsLatencyMs));
  }

  if (config.pmsFailNext) {
    const shouldFail = failNextByHotel.get(hotelId) ?? true;
    if (shouldFail) {
      failNextByHotel.set(hotelId, false);
      await prisma.failureConfiguration.update({
        where: { hotelId },
        data: {
          configJson: {
            ...config,
            pmsFailNext: false,
          },
        },
      });
      throw new Error('Injected PMS failure (fail next request)');
    }
  } else {
    failNextByHotel.delete(hotelId);
  }

  if (config.pmsErrorRate > 0 && Math.random() < config.pmsErrorRate) {
    throw new Error('Injected random PMS error');
  }
}

export function resetFailNextCache(): void {
  failNextByHotel.clear();
}
