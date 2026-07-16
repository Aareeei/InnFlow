import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface WorkflowEventPayload {
  type: string;
  requestId?: string;
  workflowId?: string;
  approvalId?: string;
  status?: string;
  [key: string]: unknown;
}

@Injectable()
export class EventsService {
  private readonly emitter = new EventEmitter();

  subscribe(tenantId: string | undefined, listener: (event: WorkflowEventPayload) => void): () => void {
    const channel = tenantId ?? '*';
    const handler = (payload: WorkflowEventPayload & { tenantId: string }) => {
      if (!tenantId || payload.tenantId === tenantId) {
        listener(payload);
      }
    };

    this.emitter.on(channel, handler);
    return () => this.emitter.off(channel, handler);
  }

  emitWorkflowUpdate(tenantId: string, payload: WorkflowEventPayload): void {
    const event = { ...payload, tenantId, timestamp: new Date().toISOString() };
    this.emitter.emit(tenantId, event);
    this.emitter.emit('*', event);
  }
}
