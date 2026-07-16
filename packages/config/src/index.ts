import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('innflow'),
  S3_SECRET_KEY: z.string().default('innflowsecret'),
  S3_BUCKET: z.string().default('innflow-artifacts'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CONTROL_API_URL: z.string().default('http://localhost:4000'),
  DASHBOARD_URL: z.string().default('http://localhost:3000'),
  MOCK_PMS_URL: z.string().default('http://localhost:3001'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().default('innflow'),
  PORT_CONTROL_API: z.coerce.number().default(4000),
  PORT_DASHBOARD: z.coerce.number().default(3000),
  PORT_MOCK_PMS: z.coerce.number().default(3001),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  if (cachedConfig) return cachedConfig;
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  cachedConfig = parsed.data;
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export const TASK_QUEUES = {
  ORCHESTRATION: 'innflow-orchestration',
  BROWSER: 'innflow-browser-automation',
} as const;

export const WORKFLOW_NAMES = {
  HOTEL_GUEST_REQUEST: 'HotelGuestRequestWorkflow',
} as const;

export const SIGNALS = {
  APPROVAL_DECISION: 'approvalDecision',
  CANCEL: 'cancel',
  MANUAL_RETRY: 'manualRetry',
} as const;

export const QUERIES = {
  PROGRESS: 'progress',
} as const;
