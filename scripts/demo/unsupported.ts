#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import { DEMO_PASSWORD, InnFlowApiClient, TENANT_CREDENTIALS } from '../lib/api-client.js';

async function main() {
  const client = new InnFlowApiClient();
  await client.login(TENANT_CREDENTIALS['metrostay-downtown'].operator, DEMO_PASSWORD);

  console.log('=== Unsupported Request Demo ===\n');

  const request = await client.createGuestRequest(
    {
      channel: 'VOICE_TRANSCRIPT',
      rawText:
        'Can you arrange a helicopter tour of the city and book tickets to a Broadway show for tonight?',
      guestName: 'Guest Unknown',
      priority: 'LOW',
    },
    randomUUID(),
  );

  console.log(`Created unsupported request: ${request.id}`);
  const result = await client.waitForRequestStatus(
    request.id,
    ['ESCALATED', 'FAILED', 'COMPLETED'],
    120_000,
  );

  console.log(`Final status: ${result.status}`);
  console.log(`Request type: ${result.requestType ?? 'unknown'}`);
  console.log('\nUnsupported request demo complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
