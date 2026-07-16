#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import { DEMO_PASSWORD, InnFlowApiClient, TENANT_CREDENTIALS } from '../lib/api-client.js';

async function main() {
  const client = new InnFlowApiClient();
  await client.login(TENANT_CREDENTIALS['harbor-grand'].operator, DEMO_PASSWORD);

  console.log('=== Idempotency / Duplicate Demo ===\n');

  const idempotencyKey = randomUUID();
  const payload = {
    channel: 'WEB',
    rawText: 'Please send room service menu to room 110.',
    guestName: 'Anna Becker',
    roomNumber: '110',
  };

  const first = await client.createGuestRequest(payload, idempotencyKey);
  console.log(`First request: ${first.id}`);

  const second = await client.createGuestRequest(payload, idempotencyKey);
  console.log(`Duplicate request: ${second.id}`);

  if (first.id === second.id) {
    console.log('Idempotency verified: duplicate key returned same resource.');
  } else {
    console.log('Warning: duplicate key returned different resource IDs.');
  }

  console.log('\nDuplicate demo complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
