import { createOrchestrationWorker } from '@innflow/workflows';
import { createLogger, initTracing, shutdownTracing } from '@innflow/telemetry';
import type { Worker } from '@temporalio/worker';

async function main(): Promise<void> {
  initTracing('workflow-worker');
  const logger = createLogger('workflow-worker');

  let worker: Worker | undefined;
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down workflow worker');

    try {
      worker?.shutdown();
      await shutdownTracing();
      logger.info('Workflow worker stopped');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during workflow worker shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  worker = await createOrchestrationWorker();
  logger.info('Workflow worker started on innflow-orchestration queue');
  await worker.run();
}

main().catch((error: unknown) => {
  console.error('Failed to start workflow worker', error);
  process.exit(1);
});
