const apiUrl = process.env.CONTROL_API_URL ?? 'http://localhost:4000';

jest.setTimeout(60_000);

beforeAll(async () => {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${apiUrl}/health/live`);
      if (response.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  console.warn(`Control API not reachable at ${apiUrl}; integration tests may fail.`);
});

export { apiUrl };
