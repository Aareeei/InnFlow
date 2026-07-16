#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import { DEMO_PASSWORD, InnFlowApiClient, TENANT_CREDENTIALS } from '../lib/api-client.js';

async function main() {
  const client = new InnFlowApiClient();
  await client.login(TENANT_CREDENTIALS['sierra-vista'].operator, DEMO_PASSWORD);

  console.log('=== Multi-Action Demo ===\n');

  const request = await client.createGuestRequest(
    {
      channel: 'EMAIL',
      rawText:
        'Hi, I need extra towels for room 412, please schedule a wake-up call for 6:30 AM tomorrow, and book dinner for 2 at 7 PM in the restaurant.',
      guestName: 'Michael Torres',
      roomNumber: '412',
      priority: 'HIGH',
    },
    randomUUID(),
  );

  console.log(`Created multi-action request: ${request.id}`);
  const result = await client.waitForRequestStatus(
    request.id,
    ['COMPLETED', 'PARTIALLY_COMPLETED', 'ESCALATED', 'FAILED'],
    240_000,
  );

  console.log(`Final status: ${result.status}`);
  console.log('\nMulti-action demo complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
