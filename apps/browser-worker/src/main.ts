import { NativeConnection, Worker } from '@temporalio/worker';
import { loadConfig, TASK_QUEUES } from '@innflow/config';
import { createLogger, initTracing, shutdownTracing } from '@innflow/telemetry';
import * as activities from './activities/index.js';

const logger = createLogger('browser-worker');

async function run(): Promise<void> {
  initTracing('browser-worker');
  const config = loadConfig();

  logger.info({ taskQueue: TASK_QUEUES.BROWSER }, 'Starting browser automation worker');

  const connection = await NativeConnection.connect({
    address: config.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: config.TEMPORAL_NAMESPACE,
    taskQueue: TASK_QUEUES.BROWSER,
    activities,
  });

  const shutdown = async () => {
    logger.info('Shutting down browser worker');
    worker.shutdown();
    await shutdownTracing();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await worker.run();
}

run().catch((error) => {
  logger.error({ err: error }, 'Browser worker failed');
  process.exit(1);
});
