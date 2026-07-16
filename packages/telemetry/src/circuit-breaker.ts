import type { CircuitState } from '@innflow/domain';
import { CircuitOpenError } from '@innflow/domain';
import { setCircuitBreakerMetric } from './metrics.js';

export type CircuitBreakerOptions = {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
};

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private halfOpenAttempts = 0;
  private openedAt: number | null = null;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly dependency: string,
    options: Partial<CircuitBreakerOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    setCircuitBreakerMetric(this.dependency, this.state);
  }

  getState(): CircuitState {
    this.evaluateStateTransition();
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateStateTransition();

    if (this.state === 'OPEN') {
      throw new CircuitOpenError(`${this.dependency} circuit breaker is open`);
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
      this.transitionTo('OPEN');
      throw new CircuitOpenError(`${this.dependency} circuit breaker is open`);
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts += 1;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = null;

    if (this.state !== 'CLOSED') {
      this.transitionTo('CLOSED');
    }
  }

  recordFailure(): void {
    this.failureCount += 1;

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private evaluateStateTransition(): void {
    if (this.state !== 'OPEN' || this.openedAt === null) {
      return;
    }

    const elapsed = Date.now() - this.openedAt;
    if (elapsed >= this.options.resetTimeoutMs) {
      this.transitionTo('HALF_OPEN');
    }
  }

  private transitionTo(nextState: CircuitState): void {
    this.state = nextState;
    setCircuitBreakerMetric(this.dependency, nextState);

    if (nextState === 'OPEN') {
      this.openedAt = Date.now();
      this.halfOpenAttempts = 0;
      return;
    }

    if (nextState === 'HALF_OPEN') {
      this.halfOpenAttempts = 0;
      this.openedAt = null;
      return;
    }

    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = null;
  }
}
