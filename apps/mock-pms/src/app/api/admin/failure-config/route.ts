import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { FailureInjectionConfigSchema } from '@innflow/domain';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection, getFailureConfig } from '@/lib/failure-injection';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const config = await getFailureConfig(session.hotelId);
    return jsonOk({ data: config });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const body = await request.json();
    const config = FailureInjectionConfigSchema.parse(body);

    const saved = await prisma.failureConfiguration.upsert({
      where: { hotelId: session.hotelId },
      create: {
        hotelId: session.hotelId,
        configJson: config,
      },
      update: {
        configJson: config,
      },
    });

    return jsonOk({
      data: FailureInjectionConfigSchema.parse(saved.configJson),
      message: 'Failure injection settings saved successfully',
    });
  } catch (error) {
    return jsonError(error);
  }
}
