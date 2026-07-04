import type {
  GenerateStartResponse,
  GenerateStatus,
  Report,
  ReportListResponse,
  ReportType,
} from './types';

/** API 호출 실패를 나타내는 에러. 네트워크 단절(백엔드 미기동)은 status = 0 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  /** 백엔드에 연결 자체가 안 되는 경우 (미기동 등) */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(0, '백엔드 서버에 연결할 수 없습니다.');
  }

  if (!res.ok) {
    let message = `요청이 실패했습니다. (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // 본문이 JSON이 아니면 기본 메시지 사용
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

export function fetchReports(params: {
  type?: ReportType;
  limit?: number;
  offset?: number;
}): Promise<ReportListResponse> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const qs = query.toString();
  return request<ReportListResponse>(`/api/reports${qs ? `?${qs}` : ''}`);
}

export function fetchReport(id: number | string): Promise<Report> {
  return request<Report>(`/api/reports/${id}`);
}

export function fetchLatestReport(type: ReportType): Promise<Report> {
  return request<Report>(`/api/reports/latest?type=${type}`);
}

export function startGenerate(type: ReportType): Promise<GenerateStartResponse> {
  return request<GenerateStartResponse>('/api/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

export function fetchGenerateStatus(): Promise<GenerateStatus> {
  return request<GenerateStatus>('/api/reports/generate/status');
}
