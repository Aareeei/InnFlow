#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import {
  DEMO_PASSWORD,
  InnFlowApiClient,
  TENANT_CREDENTIALS,
} from '../lib/api-client.js';

async function main() {
  const client = new InnFlowApiClient();
  const creds = TENANT_CREDENTIALS['harbor-grand'];

  console.log('=== Housekeeping Demo ===\n');
  await client.login(creds.operator, DEMO_PASSWORD);
  console.log('Logged in as operator@harbor-grand');

  const idempotencyKey = randomUUID();
  const request = await client.createGuestRequest(
    {
      channel: 'WEB',
      rawText: 'Please send extra towels and pillows to room 305. We have 3 guests staying.',
      guestName: 'Sarah Chen',
      roomNumber: '305',
      priority: 'NORMAL',
    },
    idempotencyKey,
  );

  console.log(`Created guest request: ${request.id}`);
  console.log('Waiting for workflow completion...');

  const completed = await client.waitForRequestStatus(
    request.id,
    ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'ESCALATED'],
    180_000,
  );

  console.log(`Final status: ${completed.status}`);
  console.log(`Request type: ${completed.requestType ?? 'pending classification'}`);
  console.log('\nDemo complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
