import { defineQuery } from '@temporalio/workflow';
import type { WorkflowProgress } from '@innflow/domain';
import { QUERIES } from '@innflow/config';

export const PROGRESS_QUERY = QUERIES.PROGRESS;

export const progressQuery = defineQuery<WorkflowProgress>(PROGRESS_QUERY);
