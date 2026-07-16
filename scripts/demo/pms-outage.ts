#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import { DEMO_PASSWORD, InnFlowApiClient, TENANT_CREDENTIALS } from '../lib/api-client.js';

async function main() {
  const client = new InnFlowApiClient();
  await client.login(TENANT_CREDENTIALS['harbor-grand'].admin, DEMO_PASSWORD);

  console.log('=== PMS Outage Demo ===\n');
  console.log('Injecting PMS maintenance mode failure...');

  await client.injectFailure({ pmsMaintenanceMode: true });

  const request = await client.createGuestRequest(
    {
      channel: 'SMS',
      rawText: 'Need housekeeping for room 201 - extra blankets please.',
      guestName: 'Lisa Wong',
      roomNumber: '201',
    },
    randomUUID(),
  );

  console.log(`Created request during outage: ${request.id}`);
  const result = await client.waitForRequestStatus(
    request.id,
    ['FAILED', 'ESCALATED', 'COMPLETED', 'PARTIALLY_COMPLETED'],
    180_000,
  );

  console.log(`Status during outage: ${result.status}`);
  console.log('Clearing failure injection...');
  await client.clearFailureInjection();

  console.log('\nPMS outage demo complete.');
}

main().catch(async (err) => {
  console.error(err);
  try {
    const client = new InnFlowApiClient();
    await client.clearFailureInjection();
  } catch {
    /* ignore cleanup errors */
  }
  process.exit(1);
});
