import {
  AIProviderMalformedResponseError,
  AIProviderTimeoutError,
  ClassificationResultSchema,
} from '@innflow/domain';
import {
  MockAIProvider,
  classifyByPattern,
  resetMockFailureInjection,
  setMockFailureInjection,
} from './mock-provider';

const tenant = { tenantId: '00000000-0000-4000-8000-000000000001', timezone: 'America/Los_Angeles' };
const guestContext = { guestName: 'Alex Guest', roomNumber: '407', reservationId: 'res-123' };

describe('classifyByPattern', () => {
  it('classifies towels as HOUSEKEEPING', () => {
    expect(classifyByPattern('Please send 2 towels to room 407')).toBe('HOUSEKEEPING');
  });

  it('classifies housekeeping keyword as HOUSEKEEPING', () => {
    expect(classifyByPattern('Need housekeeping for room 407')).toBe('HOUSEKEEPING');
  });

  it('classifies wake-up call as WAKE_UP_CALL', () => {
    expect(classifyByPattern('Please schedule a wake-up call at 6:30 am')).toBe('WAKE_UP_CALL');
  });

  it('classifies wake up phrasing as WAKE_UP_CALL', () => {
    expect(classifyByPattern('Can you wake me up at 7 am?')).toBe('WAKE_UP_CALL');
  });

  it('classifies towels plus wake-up as MULTI_ACTION', () => {
    expect(
      classifyByPattern('Please send towels and schedule a wake-up call at 6:30 am'),
    ).toBe('MULTI_ACTION');
  });

  it('classifies reservation cancellation', () => {
    expect(classifyByPattern('Please cancel my reservation for tomorrow')).toBe(
      'RESERVATION_CANCELLATION',
    );
  });

  it('classifies helicopter as UNSUPPORTED', () => {
    expect(classifyByPattern('Book a helicopter to the airport')).toBe('UNSUPPORTED');
  });

  it('classifies maintenance issues', () => {
    expect(classifyByPattern('The shower is broken in room 407')).toBe('MAINTENANCE');
  });

  it('classifies restaurant booking', () => {
    expect(classifyByPattern('Book a table at the restaurant for dinner')).toBe(
      'RESTAURANT_BOOKING',
    );
  });

  it('classifies dinner requests as RESTAURANT_BOOKING', () => {
    expect(classifyByPattern('I would like dinner at 7 pm')).toBe('RESTAURANT_BOOKING');
  });

  it('classifies reservation modification', () => {
    expect(classifyByPattern('Modify my reservation to add one night')).toBe(
      'RESERVATION_MODIFICATION',
    );
  });
});

describe('MockAIProvider.classifyRequest', () => {
  const provider = new MockAIProvider({ latencyMs: 0 });

  afterEach(() => {
    resetMockFailureInjection();
  });

  it('returns schema-valid classification results', async () => {
    const result = await provider.classifyRequest({
      tenant,
      channel: 'WEB',
      rawText: 'Please send towels to room 407',
      guestContext,
    });

    expect(() => ClassificationResultSchema.parse(result)).not.toThrow();
    expect(result.requestType).toBe('HOUSEKEEPING');
    expect(result.priority).toBe('NORMAL');
  });

  it('records deterministic token usage', async () => {
    const usageProvider = new MockAIProvider({ latencyMs: 0 });

    await usageProvider.classifyRequest({
      tenant,
      channel: 'WEB',
      rawText: 'Please send towels to room 407',
      guestContext,
    });

    const records = usageProvider.getUsageRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.operation).toBe('classifyRequest');
    expect(records[0]?.tokenInput).toBeGreaterThan(0);
    expect(records[0]?.tokenOutput).toBeGreaterThan(0);
    expect(records[0]?.estimatedCostUsd).toBeGreaterThan(0);
    expect(records[0]?.provider).toBe('mock');
  });

  it('throws timeout when failure injection is enabled', async () => {
    setMockFailureInjection({ timeout: true });

    await expect(
      provider.classifyRequest({
        tenant,
        channel: 'WEB',
        rawText: 'Please send towels to room 407',
        guestContext,
      }),
    ).rejects.toBeInstanceOf(AIProviderTimeoutError);
  });

  it('throws malformed response when failure injection is enabled', async () => {
    setMockFailureInjection({ malformedResponse: true });

    await expect(
      provider.classifyRequest({
        tenant,
        channel: 'WEB',
        rawText: 'Please send towels to room 407',
        guestContext,
      }),
    ).rejects.toBeInstanceOf(AIProviderMalformedResponseError);
  });
});
