import { createStorageProvider } from '@innflow/storage';

export async function uploadScreenshot(input: {
  workflowExecutionId: string;
  taskId: string;
  phase: 'before' | 'after' | 'verify';
  buffer: Buffer;
}): Promise<string> {
  const storage = createStorageProvider();
  const key = `browser-evidence/${input.workflowExecutionId}/${input.taskId}/${input.phase}-${Date.now()}.png`;

  await storage.uploadArtifact({
    key,
    body: input.buffer,
    contentType: 'image/png',
    metadata: {
      taskId: input.taskId,
      phase: input.phase,
    },
  });

  return key;
}
