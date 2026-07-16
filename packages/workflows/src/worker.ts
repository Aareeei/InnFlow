import { join } from 'node:path';
import { NativeConnection, Worker } from '@temporalio/worker';
import { loadConfig, TASK_QUEUES } from '@innflow/config';
import * as orchestrationActivities from './activities/orchestration.activities.js';

export async function createOrchestrationWorker(): Promise<Worker> {
  const config = loadConfig();
  const connection = await NativeConnection.connect({
    address: config.TEMPORAL_ADDRESS,
  });

  const workflowsPath = join(__dirname, 'workflows');

  return Worker.create({
    connection,
    namespace: config.TEMPORAL_NAMESPACE,
    taskQueue: TASK_QUEUES.ORCHESTRATION,
    workflowsPath,
    activities: orchestrationActivities,
  });
}
