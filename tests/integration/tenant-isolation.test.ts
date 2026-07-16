import { randomUUID } from 'node:crypto';
import { apiUrl } from './setup';

const DEMO_PASSWORD = 'InnFlow2025!';

async function login(email: string): Promise<string> {
  const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

describe('Tenant isolation', () => {
  it('prevents cross-tenant guest request access', async () => {
    const harborToken = await login('operator@harbor-grand.innflow.local');
    const sierraToken = await login('operator@sierra-vista.innflow.local');

    const createResponse = await fetch(`${apiUrl}/api/v1/guest-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${harborToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        channel: 'WEB',
        rawText: 'Tenant isolation test request',
        roomNumber: '101',
      }),
    });

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const crossTenantResponse = await fetch(`${apiUrl}/api/v1/guest-requests/${created.id}`, {
      headers: { Authorization: `Bearer ${sierraToken}` },
    });

    expect([403, 404]).toContain(crossTenantResponse.status);
  });

  it('scopes list results to authenticated tenant', async () => {
    const token = await login('viewer@metrostay-downtown.innflow.local');
    const response = await fetch(`${apiUrl}/api/v1/guest-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { tenantId?: string }[] };
    const tenantIds = new Set(body.items.map((item) => item.tenantId).filter(Boolean));
    expect(tenantIds.size).toBeLessThanOrEqual(1);
  });
});
