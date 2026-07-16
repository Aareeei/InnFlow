import { loadConfig, type EnvConfig } from '@innflow/config';
import { MockAIProvider } from './mock-provider.js';
import { isOpenAIProviderEnabled, OpenAICompatibleProvider } from './openai-provider.js';
import type { AIProvider } from './types.js';

export function createAIProvider(config?: EnvConfig): AIProvider {
  const env = config ?? loadConfig();

  if (isOpenAIProviderEnabled(env.AI_PROVIDER, env.OPENAI_API_KEY)) {
    return new OpenAICompatibleProvider({
      apiKey: env.OPENAI_API_KEY!,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL,
    });
  }

  return new MockAIProvider();
}
