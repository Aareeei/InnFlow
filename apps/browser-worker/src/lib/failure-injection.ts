import { prisma } from '@innflow/database';
import { FailureInjectionConfigSchema, type FailureInjectionConfig } from '@innflow/domain';

export async function getBrowserFailureConfig(hotelId: string): Promise<FailureInjectionConfig> {
  const record = await prisma.failureConfiguration.findUnique({
    where: { hotelId },
  });

  if (!record) {
    return FailureInjectionConfigSchema.parse({});
  }

  return FailureInjectionConfigSchema.parse(record.configJson);
}

export async function applyBrowserFailureInjection(config: FailureInjectionConfig): Promise<void> {
  if (config.slowBrowserActivity) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  if (config.browserCrashBeforeAction) {
    throw new Error('Injected browser crash before action');
  }
}

export function shouldInjectVerificationMismatch(config: FailureInjectionConfig): boolean {
  return config.verificationMismatch;
}

export async function crashAfterActionIfConfigured(config: FailureInjectionConfig): Promise<void> {
  if (config.browserCrashAfterAction) {
    throw new Error('Injected browser crash after action');
  }
}
