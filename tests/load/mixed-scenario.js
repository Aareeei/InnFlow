import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomUUID } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API_URL = __ENV.CONTROL_API_URL || 'http://localhost:4000';
const PASSWORD = __ENV.DEMO_PASSWORD || 'InnFlow2025!';

const TENANTS = [
  'operator@harbor-grand.innflow.local',
  'operator@sierra-vista.innflow.local',
  'operator@metrostay-downtown.innflow.local',
];

export const options = {
  scenarios: {
    mixed_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

function login(email) {
  const res = http.post(
    `${API_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  check(res, { 'login ok': (r) => r.status === 200 });
  if (res.status !== 200) return null;
  return res.json('accessToken');
}

export default function mixedScenario() {
  const email = TENANTS[Math.floor(Math.random() * TENANTS.length)];
  const token = login(email);
  if (!token) return;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': randomUUID(),
  };

  const createRes = http.post(
    `${API_URL}/api/v1/guest-requests`,
    JSON.stringify({
      channel: 'WEB',
      rawText: `Load test request ${randomUUID()}`,
      roomNumber: `${100 + Math.floor(Math.random() * 400)}`,
      priority: Math.random() > 0.8 ? 'HIGH' : 'NORMAL',
    }),
    { headers: authHeaders, tags: { name: 'create_request' } },
  );

  check(createRes, {
    'create request ok': (r) => r.status === 201 || r.status === 200,
  });

  if (createRes.status === 201 || createRes.status === 200) {
    const requestId = createRes.json('id');
    http.get(`${API_URL}/api/v1/guest-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { name: 'get_request' },
    });
  }

  http.get(`${API_URL}/health/live`, { tags: { name: 'health' } });
  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(data, null, 2),
    'tests/load/results/summary.json': JSON.stringify(data, null, 2),
  };
}
