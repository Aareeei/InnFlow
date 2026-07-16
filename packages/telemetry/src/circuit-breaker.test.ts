import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    const breaker = new CircuitBreaker('pms');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('opens after reaching the failure threshold', async () => {
    const breaker = new CircuitBreaker('pms', { failureThreshold: 2 });

    await expect(
      breaker.execute(async () => {
        throw new Error('dependency failed');
      }),
    ).rejects.toThrow('dependency failed');

    await expect(
      breaker.execute(async () => {
        throw new Error('dependency failed');
      }),
    ).rejects.toThrow('dependency failed');

    expect(breaker.getState()).toBe('OPEN');
  });

  it('rejects calls while OPEN', async () => {
    const breaker = new CircuitBreaker('pms', { failureThreshold: 1 });

    await expect(
      breaker.execute(async () => {
        throw new Error('dependency failed');
      }),
    ).rejects.toThrow('dependency failed');

    await expect(
      breaker.execute(async () => {
        return 'ok';
      }),
    ).rejects.toThrow('pms circuit breaker is open');
  });

  it('transitions to HALF_OPEN after reset timeout', async () => {
    const breaker = new CircuitBreaker('pms', {
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    await expect(
      breaker.execute(async () => {
        throw new Error('dependency failed');
      }),
    ).rejects.toThrow('dependency failed');

    expect(breaker.getState()).toBe('OPEN');

    jest.advanceTimersByTime(1_000);

    expect(breaker.getState()).toBe('HALF_OPEN');
  });

  it('closes after a successful call in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker('pms', {
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    await expect(
      breaker.execute(async () => {
        throw new Error('dependency failed');
      }),
    ).rejects.toThrow('dependency failed');

    jest.advanceTimersByTime(1_000);

    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('reopens when HALF_OPEN probe fails', async () => {
    const breaker = new CircuitBreaker('pms', {
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    await expect(
      breaker.execute(async () => {
        throw new Error('dependency failed');
      }),
    ).rejects.toThrow('dependency failed');

    jest.advanceTimersByTime(1_000);

    await expect(
      breaker.execute(async () => {
        throw new Error('still failing');
      }),
    ).rejects.toThrow('still failing');

    expect(breaker.getState()).toBe('OPEN');
  });
});
