import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';

const ACTIVE_STATUSES = [
  'RECEIVED',
  'CLASSIFYING',
  'PLANNING',
  'POLICY_REVIEW',
  'WAITING_APPROVAL',
  'EXECUTING',
  'VERIFYING',
] as const;

@Injectable()
export class MetricsOverviewService {
  async getOverview(tenantId: string | undefined) {
    const tenantFilter = tenantId ? { tenantId } : {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      activeRequests,
      completedToday,
      pendingApprovals,
      openFailures,
      completedCount,
      failedCount,
      avgDuration,
      recentRequests,
      statusGroups,
      recentAudits,
    ] = await Promise.all([
      prisma.guestRequest.count({
        where: { ...tenantFilter, status: { in: [...ACTIVE_STATUSES] } },
      }),
      prisma.guestRequest.count({
        where: {
          ...tenantFilter,
          status: 'COMPLETED',
          updatedAt: { gte: todayStart },
        },
      }),
      prisma.humanApproval.count({
        where: { ...tenantFilter, status: 'PENDING' },
      }),
      prisma.failureQueueItem.count({
        where: { ...tenantFilter, status: { in: ['OPEN', 'INVESTIGATING'] } },
      }),
      prisma.workflowExecution.count({
        where: { ...tenantFilter, status: 'COMPLETED' },
      }),
      prisma.workflowExecution.count({
        where: { ...tenantFilter, status: { in: ['FAILED', 'ESCALATED'] } },
      }),
      prisma.workflowExecution.aggregate({
        where: { ...tenantFilter, status: 'COMPLETED', totalDurationMs: { not: null } },
        _avg: { totalDurationMs: true },
      }),
      prisma.guestRequest.findMany({
        where: { ...tenantFilter, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.guestRequest.groupBy({
        by: ['status'],
        where: tenantFilter,
        _count: { _all: true },
      }),
      prisma.auditEvent.findMany({
        where: tenantFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

    const totalFinished = completedCount + failedCount;
    const successRate = totalFinished > 0 ? completedCount / totalFinished : 1;

    const volumeByDate = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      volumeByDate.set(date.toISOString().slice(0, 10), 0);
    }

    for (const request of recentRequests) {
      const key = request.createdAt.toISOString().slice(0, 10);
      volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + 1);
    }

    return {
      kpis: {
        activeRequests,
        completedToday,
        pendingApprovals,
        openFailures,
        avgCompletionMs: Math.round(avgDuration._avg.totalDurationMs ?? 0),
        successRate,
      },
      requestVolume: [...volumeByDate.entries()].map(([date, count]) => ({ date, count })),
      statusDistribution: statusGroups.map((group) => ({
        status: group.status,
        count: group._count._all,
      })),
      recentActivity: recentAudits.map((event) => ({
        id: event.id,
        type: event.action,
        message: `${event.action} on ${event.resourceType}`,
        timestamp: event.createdAt.toISOString(),
        resourceId: event.resourceId,
      })),
    };
  }
}
