import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { ValidationError } from '@innflow/domain';

@Injectable()
export class TenantService {
  async findById(tenantId: string) {
    return prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async requireTenant(tenantId: string) {
    const tenant = await this.findById(tenantId);
    if (!tenant) {
      throw new ValidationError('Tenant not found', { tenantId });
    }
    return tenant;
  }

  async listTenants() {
    return prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, timezone: true, createdAt: true },
    });
  }

  async updateTenant(tenantId: string, data: { name?: string; timezone?: string }) {
    await this.requireTenant(tenantId);

    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      },
    });
  }
}
