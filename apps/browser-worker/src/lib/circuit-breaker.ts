import { CircuitBreaker } from '@innflow/telemetry';

let pmsCircuitBreaker: CircuitBreaker | null = null;

export function getPmsCircuitBreaker(): CircuitBreaker {
  if (!pmsCircuitBreaker) {
    pmsCircuitBreaker = new CircuitBreaker('mock-pms', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      halfOpenMaxAttempts: 1,
    });
  }

  return pmsCircuitBreaker;
}
