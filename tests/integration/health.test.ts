import { apiUrl } from './setup';

describe('Health endpoints', () => {
  it('returns live status', async () => {
    const response = await fetch(`${apiUrl}/health/live`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toMatch(/ok|alive|up/i);
  });

  it('returns ready status with dependency checks', async () => {
    const response = await fetch(`${apiUrl}/health/ready`);
    expect([200, 503]).toContain(response.status);
    const body = (await response.json()) as { status: string; checks?: Record<string, string> };
    expect(body.status).toBeTruthy();
    if (body.checks) {
      expect(Object.keys(body.checks).length).toBeGreaterThan(0);
    }
  });
});
