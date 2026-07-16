import type { FailureInjectionConfig } from '@innflow/domain';
import type {
  AgentRunSummary,
  AuditEvent,
  AuthUser,
  FailureQueueItem,
  GuestRequestDetail,
  GuestRequestSummary,
  HumanApproval,
  LoginResponse,
  OverviewMetrics,
  PaginatedResponse,
  SystemHealth,
  TenantSettings,
  WorkflowExecutionDetail,
} from './api-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  params?: Record<string, string | number | undefined>;
};

type ListResponse<T> = { items?: T[]; data?: T[]; total: number };

function normalizePage<T>(
  response: ListResponse<T>,
  page = 1,
  pageSize = 50,
): PaginatedResponse<T> {
  const data = response.data ?? response.items ?? [];
  return {
    data,
    total: response.total,
    page,
    pageSize,
  };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, params } = options;
  const url = new URL(`${API_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText;
    let code: string | undefined;
    try {
      const err = (await response.json()) as { error?: { message?: string; code?: string } };
      message = err.error?.message ?? message;
      code = err.error?.code;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  refresh(refreshToken: string) {
    return request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  me(token: string) {
    return request<AuthUser>('/auth/me', { token });
  },

  getOverview(token: string) {
    return request<OverviewMetrics>('/metrics/overview', { token });
  },

  async listRequests(
    token: string,
    params?: { status?: string; page?: number; pageSize?: number },
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const response = await request<ListResponse<GuestRequestSummary>>('/requests', {
      token,
      params: {
        status: params?.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });
    return normalizePage(response, page, pageSize);
  },

  getRequest(token: string, id: string) {
    return request<GuestRequestDetail>(`/requests/${id}`, { token });
  },

  getWorkflow(token: string, id: string) {
    return request<WorkflowExecutionDetail>(`/workflows/${id}`, { token });
  },

  async listAgentRuns(
    token: string,
    params?: { guestRequestId?: string; page?: number; pageSize?: number },
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const response = await request<ListResponse<AgentRunSummary>>('/agent-runs', {
      token,
      params: {
        guestRequestId: params?.guestRequestId,
        pageSize,
        offset: (page - 1) * pageSize,
      },
    });
    return normalizePage(response, page, pageSize);
  },

  async listApprovals(token: string, params?: { status?: string; page?: number; pageSize?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const response = await request<ListResponse<HumanApproval>>('/approvals', {
      token,
      params: {
        status: params?.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });
    return normalizePage(response, page, pageSize);
  },

  resolveApproval(token: string, id: string, approved: boolean, note?: string) {
    return request<void>(`/approvals/${id}/resolve`, {
      method: 'POST',
      token,
      body: { approved, note },
    });
  },

  async listFailures(token: string, params?: { status?: string; page?: number; pageSize?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const response = await request<ListResponse<FailureQueueItem>>('/failures', {
      token,
      params: {
        status: params?.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });
    return normalizePage(response, page, pageSize);
  },

  requeueFailure(token: string, id: string) {
    return request<void>(`/failures/${id}/requeue`, { method: 'POST', token });
  },

  resolveFailure(token: string, id: string, note?: string) {
    return request<void>(`/failures/${id}/resolve`, {
      method: 'POST',
      token,
      body: { note },
    });
  },

  getFailureInjectionConfig(token: string) {
    return request<FailureInjectionConfig>('/failure-injection/config', { token });
  },

  updateFailureInjectionConfig(token: string, config: Partial<FailureInjectionConfig>) {
    return request<FailureInjectionConfig>('/failure-injection/config', {
      method: 'PATCH',
      token,
      body: config,
    });
  },

  getSystemHealth(token: string) {
    return request<SystemHealth>('/health/system', { token });
  },

  async listAuditEvents(
    token: string,
    params?: { page?: number; pageSize?: number; resourceType?: string },
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const response = await request<ListResponse<AuditEvent>>('/audit', {
      token,
      params: {
        resourceType: params?.resourceType,
        pageSize,
        offset: (page - 1) * pageSize,
      },
    });
    return normalizePage(response, page, pageSize);
  },

  getTenantSettings(token: string) {
    return request<TenantSettings>('/tenants/current', { token });
  },

  updateTenantSettings(
    token: string,
    data: Partial<Pick<TenantSettings, 'name' | 'timezone'>>,
  ) {
    return request<TenantSettings>('/tenants/current', {
      method: 'PATCH',
      token,
      body: data,
    });
  },

  getEventsStreamUrl(token: string) {
    const url = new URL(`${API_URL}/events/stream`);
    url.searchParams.set('token', token);
    return url.toString();
  },
};

export { API_URL };
