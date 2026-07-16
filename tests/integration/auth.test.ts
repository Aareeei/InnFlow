import { apiUrl } from './setup';

const DEMO_PASSWORD = 'InnFlow2025!';

describe('Authentication', () => {
  it('logs in tenant operator with valid credentials', async () => {
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@harbor-grand.innflow.local',
        password: DEMO_PASSWORD,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      accessToken: string;
      user: { role: string; tenantId: string };
    };
    expect(body.accessToken).toBeTruthy();
    expect(body.user.role).toBe('OPERATOR');
    expect(body.user.tenantId).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@harbor-grand.innflow.local',
        password: 'wrong-password',
      }),
    });

    expect(response.status).toBeGreaterThanOrEqual(401);
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const response = await fetch(`${apiUrl}/api/v1/guest-requests`);
    expect(response.status).toBe(401);
  });
});
