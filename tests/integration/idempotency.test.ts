import { randomUUID } from 'node:crypto';
import { apiUrl } from './setup';

const DEMO_PASSWORD = 'InnFlow2025!';

describe('Idempotency', () => {
  it('returns the same resource for duplicate idempotency keys', async () => {
    const loginResponse = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@harbor-grand.innflow.local',
        password: DEMO_PASSWORD,
      }),
    });
    const { accessToken } = (await loginResponse.json()) as { accessToken: string };

    const idempotencyKey = randomUUID();
    const payload = {
      channel: 'WEB',
      rawText: 'Idempotency integration test',
      guestName: 'Test Guest',
      roomNumber: '999',
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    };

    const first = await fetch(`${apiUrl}/api/v1/guest-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const second = await fetch(`${apiUrl}/api/v1/guest-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBeLessThanOrEqual(201);

    const firstBody = (await first.json()) as { id: string };
    const secondBody = (await second.json()) as { id: string };
    expect(secondBody.id).toBe(firstBody.id);
  });
});
