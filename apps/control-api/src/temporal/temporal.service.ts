import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Client } from '@temporalio/client';
import { createTemporalClient } from '@innflow/workflows';

@Injectable()
export class TemporalService implements OnModuleDestroy {
  private clientPromise: Promise<Client> | null = null;

  async getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = createTemporalClient();
    }
    return this.clientPromise;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.workflowService.getSystemInfo({});
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.clientPromise = null;
  }
}
