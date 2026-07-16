export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
  };
}

export interface GuestRequestResponse {
  id: string;
  status: string;
  requestType?: string;
  idempotencyKey: string;
}

export interface ApiClientOptions {
  baseUrl?: string;
  tenantId?: string;
  accessToken?: string;
}

export class InnFlowApiClient {
  private readonly baseUrl: string;
  private accessToken?: string;
  private tenantId?: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.CONTROL_API_URL ?? 'http://localhost:4000';
    this.accessToken = options.accessToken;
    this.tenantId = options.tenantId;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Login failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as LoginResponse;
    this.accessToken = data.accessToken;
    if (data.user.tenantId) {
      this.tenantId = data.user.tenantId;
    }
    return data;
  }

  async createGuestRequest(
    payload: {
      channel: string;
      rawText: string;
      guestName?: string;
      roomNumber?: string;
      reservationId?: string;
      externalRequestId?: string;
      priority?: string;
    },
    idempotencyKey: string,
  ): Promise<GuestRequestResponse> {
    const response = await this.request('/api/v1/guest-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    return response.json() as Promise<GuestRequestResponse>;
  }

  async getGuestRequest(id: string): Promise<GuestRequestResponse> {
    const response = await this.request(`/api/v1/guest-requests/${id}`);
    return response.json() as Promise<GuestRequestResponse>;
  }

  async listGuestRequests(): Promise<{ items: GuestRequestResponse[] }> {
    const response = await this.request('/api/v1/guest-requests');
    return response.json() as Promise<{ items: GuestRequestResponse[] }>;
  }

  async resolveApproval(
    approvalId: string,
    approved: boolean,
    note?: string,
  ): Promise<void> {
    await this.request(`/api/v1/approvals/${approvalId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, note }),
    });
  }

  async injectFailure(
    config: Record<string, unknown>,
    scope: 'tenant' | 'system' = 'tenant',
  ): Promise<void> {
    const path =
      scope === 'system'
        ? '/api/v1/admin/failure-injection'
        : '/api/v1/failure-injection';
    await this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  async clearFailureInjection(scope: 'tenant' | 'system' = 'tenant'): Promise<void> {
    const path =
      scope === 'system'
        ? '/api/v1/admin/failure-injection'
        : '/api/v1/failure-injection';
    await this.request(path, { method: 'DELETE' });
  }

  async healthLive(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health/live`);
    return response.json() as Promise<{ status: string }>;
  }

  async healthReady(): Promise<{ status: string; checks?: Record<string, string> }> {
    const response = await fetch(`${this.baseUrl}/health/ready`);
    return response.json() as Promise<{ status: string; checks?: Record<string, string> }>;
  }

  async waitForRequestStatus(
    requestId: string,
    targetStatuses: string[],
    timeoutMs = 120_000,
    intervalMs = 2_000,
  ): Promise<GuestRequestResponse> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const request = await this.getGuestRequest(requestId);
      if (targetStatuses.includes(request.status)) {
        return request;
      }
      await sleep(intervalMs);
    }
    throw new Error(
      `Request ${requestId} did not reach status ${targetStatuses.join('|')} within ${timeoutMs}ms`,
    );
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    if (this.tenantId) {
      headers.set('X-Tenant-Id', this.tenantId);
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error ${response.status} ${path}: ${body}`);
    }
    return response;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DEMO_PASSWORD = 'InnFlow2025!';

export const TENANT_CREDENTIALS = {
  'harbor-grand': {
    admin: 'admin@harbor-grand.innflow.local',
    operator: 'operator@harbor-grand.innflow.local',
    viewer: 'viewer@harbor-grand.innflow.local',
  },
  'sierra-vista': {
    admin: 'admin@sierra-vista.innflow.local',
    operator: 'operator@sierra-vista.innflow.local',
    viewer: 'viewer@sierra-vista.innflow.local',
  },
  'metrostay-downtown': {
    admin: 'admin@metrostay-downtown.innflow.local',
    operator: 'operator@metrostay-downtown.innflow.local',
    viewer: 'viewer@metrostay-downtown.innflow.local',
  },
} as const;
