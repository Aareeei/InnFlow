#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import { DEMO_PASSWORD, InnFlowApiClient, TENANT_CREDENTIALS } from '../lib/api-client.js';

async function main() {
  const client = new InnFlowApiClient();
  await client.login(TENANT_CREDENTIALS['sierra-vista'].admin, DEMO_PASSWORD);

  console.log('=== Crash Recovery Demo ===\n');
  console.log('Injecting browser crash-before-action failure...');

  await client.injectFailure({ browserCrashBeforeAction: true });

  const request = await client.createGuestRequest(
    {
      channel: 'WEB',
      rawText: 'Please fix the AC in room 508, it is not cooling properly.',
      guestName: 'Robert Kim',
      roomNumber: '508',
      priority: 'URGENT',
    },
    randomUUID(),
  );

  console.log(`Created maintenance request: ${request.id}`);
  const firstAttempt = await client.waitForRequestStatus(
    request.id,
    ['FAILED', 'ESCALATED', 'EXECUTING', 'VERIFYING'],
    120_000,
  );
  console.log(`After crash injection: ${firstAttempt.status}`);

  console.log('Clearing crash injection and triggering manual retry...');
  await client.clearFailureInjection();

  await fetch(
    `${process.env.CONTROL_API_URL ?? 'http://localhost:4000'}/api/v1/guest-requests/${request.id}/retry`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${(client as unknown as { accessToken: string }).accessToken ?? ''}`,
        'Content-Type': 'application/json',
      },
    },
  ).catch(() => console.log('Retry endpoint may require operator permissions'));

  const recovered = await client.waitForRequestStatus(
    request.id,
    ['COMPLETED', 'PARTIALLY_COMPLETED', 'ESCALATED', 'FAILED'],
    180_000,
  );

  console.log(`After recovery attempt: ${recovered.status}`);
  console.log('\nCrash recovery demo complete.');
}

main().catch(async (err) => {
  console.error(err);
  try {
    const client = new InnFlowApiClient();
    await client.clearFailureInjection();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
