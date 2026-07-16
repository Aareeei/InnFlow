import { defineSignal } from '@temporalio/workflow';
import type { ApprovalDecisionSignal } from '@innflow/domain';
import { SIGNALS } from '@innflow/config';

export const APPROVAL_DECISION_SIGNAL = SIGNALS.APPROVAL_DECISION;
export const CANCEL_SIGNAL = SIGNALS.CANCEL;
export const MANUAL_RETRY_SIGNAL = SIGNALS.MANUAL_RETRY;

export interface ManualRetrySignalPayload {
  taskIds?: string[];
}

export const approvalDecisionSignal =
  defineSignal<[ApprovalDecisionSignal]>(APPROVAL_DECISION_SIGNAL);

export const cancelSignal = defineSignal(CANCEL_SIGNAL);

export const manualRetrySignal =
  defineSignal<[ManualRetrySignalPayload?]>(MANUAL_RETRY_SIGNAL);
