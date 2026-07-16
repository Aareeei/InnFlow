import { Badge, type BadgeVariant } from './Badge';

export type StatusCategory =
  | 'request'
  | 'workflow'
  | 'approval'
  | 'failure'
  | 'agent'
  | 'generic';

const requestStatusVariants: Record<string, BadgeVariant> = {
  RECEIVED: 'info',
  CLASSIFYING: 'info',
  PLANNING: 'info',
  POLICY_REVIEW: 'warning',
  WAITING_APPROVAL: 'warning',
  EXECUTING: 'accent',
  VERIFYING: 'accent',
  COMPLETED: 'success',
  PARTIALLY_COMPLETED: 'warning',
  FAILED: 'danger',
  ESCALATED: 'danger',
  CANCELLED: 'default',
};

const workflowStatusVariants: Record<string, BadgeVariant> = {
  RUNNING: 'accent',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'default',
  TIMED_OUT: 'warning',
};

const approvalStatusVariants: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  TIMED_OUT: 'default',
};

const failureStatusVariants: Record<string, BadgeVariant> = {
  OPEN: 'danger',
  INVESTIGATING: 'warning',
  REQUEUED: 'info',
  RESOLVED: 'success',
  IGNORED: 'default',
};

const agentStatusVariants: Record<string, BadgeVariant> = {
  COMPLETED: 'success',
  FAILED: 'danger',
  RUNNING: 'accent',
  TIMEOUT: 'warning',
};

function getVariant(status: string, category: StatusCategory): BadgeVariant {
  const maps: Record<StatusCategory, Record<string, BadgeVariant>> = {
    request: requestStatusVariants,
    workflow: workflowStatusVariants,
    approval: approvalStatusVariants,
    failure: failureStatusVariants,
    agent: agentStatusVariants,
    generic: {},
  };
  return maps[category][status] ?? 'default';
}

export type StatusBadgeProps = {
  status: string;
  category?: StatusCategory;
  className?: string;
};

export function StatusBadge({ status, category = 'generic', className }: StatusBadgeProps) {
  const variant = getVariant(status, category);
  const label = status.replace(/_/g, ' ');

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
