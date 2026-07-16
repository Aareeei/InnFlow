import { loadConfig } from '@innflow/config';
import { MinioStorageProvider } from './minio-adapter.js';
import type { StorageProvider } from './types.js';

export function createStorageProvider(): StorageProvider {
  const config = loadConfig();
  return new MinioStorageProvider(config);
}
