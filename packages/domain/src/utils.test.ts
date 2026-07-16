import { hashRequestBody, estimateTokenCost } from './utils';

describe('hashRequestBody', () => {
  it('produces deterministic hashes', () => {
    const body = { a: 1, b: 'test' };
    expect(hashRequestBody(body)).toBe(hashRequestBody(body));
  });

  it('produces different hashes for different bodies', () => {
    expect(hashRequestBody({ a: 1 })).not.toBe(hashRequestBody({ a: 2 }));
  });
});

describe('estimateTokenCost', () => {
  it('calculates cost from tokens', () => {
    const cost = estimateTokenCost(1000, 500);
    expect(cost).toBeGreaterThan(0);
  });
});
