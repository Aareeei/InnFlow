#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto';
import { DEMO_PASSWORD, InnFlowApiClient, TENANT_CREDENTIALS } from '../lib/api-client.js';

async function main() {
  const operatorClient = new InnFlowApiClient();
  await operatorClient.login(TENANT_CREDENTIALS['metrostay-downtown'].operator, DEMO_PASSWORD);

  console.log('=== Approval Workflow Demo ===\n');

  const request = await operatorClient.createGuestRequest(
    {
      channel: 'WEB',
      rawText:
        'I need to cancel my reservation for tomorrow. Confirmation code MET-10005. Guest name is David Park.',
      guestName: 'David Park',
      priority: 'HIGH',
    },
    randomUUID(),
  );

  console.log(`Created cancellation request: ${request.id}`);
  console.log('Waiting for approval gate...');

  let pending = await operatorClient.getGuestRequest(request.id);
  const deadline = Date.now() + 120_000;
  while (pending.status !== 'WAITING_APPROVAL' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    pending = await operatorClient.getGuestRequest(request.id);
  }

  if (pending.status !== 'WAITING_APPROVAL') {
    console.log(`Request reached ${pending.status} without approval gate.`);
    return;
  }

  console.log('Request is waiting for human approval.');
  const adminClient = new InnFlowApiClient();
  await adminClient.login(TENANT_CREDENTIALS['metrostay-downtown'].admin, DEMO_PASSWORD);

  const approvalsResponse = await fetch(
    `${process.env.CONTROL_API_URL ?? 'http://localhost:4000'}/api/v1/approvals?status=PENDING`,
    {
      headers: {
        Authorization: `Bearer ${(adminClient as unknown as { accessToken: string }).accessToken ?? ''}`,
      },
    },
  ).catch(() => null);

  if (approvalsResponse?.ok) {
    const { items } = (await approvalsResponse.json()) as { items: { id: string }[] };
    const approval = items.find(() => true);
    if (approval) {
      await adminClient.resolveApproval(approval.id, true, 'Approved via demo script');
      console.log(`Approved request ${approval.id}`);
    }
  }

  const final = await operatorClient.waitForRequestStatus(
    request.id,
    ['COMPLETED', 'FAILED', 'CANCELLED', 'ESCALATED'],
    120_000,
  );
  console.log(`Final status: ${final.status}`);
  console.log('\nApproval demo complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
