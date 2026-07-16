import { Connection, Client } from '@temporalio/client';
import { loadConfig } from '@innflow/config';

let cachedClient: Client | null = null;

export async function createTemporalClient(): Promise<Client> {
  if (cachedClient) {
    return cachedClient;
  }

  const config = loadConfig();
  const connection = await Connection.connect({
    address: config.TEMPORAL_ADDRESS,
  });

  cachedClient = new Client({
    connection,
    namespace: config.TEMPORAL_NAMESPACE,
  });

  return cachedClient;
}

export function resetTemporalClientCache(): void {
  cachedClient = null;
}
