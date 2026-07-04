// docs/API.md 의 타입 계약을 그대로 정의한다.

export type ReportType = 'daily' | 'weekly' | 'monthly';
export type Market = 'KR' | 'US' | 'JP' | 'CN' | 'GLOBAL';

export interface RecommendationItem {
  ticker: string; // 예: "005930.KS", "AAPL", "7203.T"
  name: string; // 종목명
  market: Market;
  sector: string; // 예: "반도체", "자동차"
  rationale: string; // 추천 근거 (한국어)
  metrics?: Record<string, string>; // 예: { "PER": "8.2", "3년 매출 CAGR": "12%" }
}

export interface RecommendationSection {
  criterion: string; // 추천 기준 이름. 예: "3년 연속 매출/순이익 증가"
  description: string; // 기준 설명 (한국어)
  items: RecommendationItem[];
}

export interface Report {
  id: number;
  type: ReportType;
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string; // "YYYY-MM-DD"
  title: string; // 한국어 제목
  content: string; // 마크다운 본문 (한국어)
  recommendations: RecommendationSection[] | null; // weekly/monthly만 채워짐, daily는 null
  createdAt: string; // ISO 8601
}

export interface ReportSummary {
  id: number;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  title: string;
  createdAt: string;
}

export interface ReportListResponse {
  reports: ReportSummary[];
  total: number;
}

export interface GenerateStartResponse {
  status: 'started';
  type: ReportType;
}

export interface GenerateStatus {
  running: boolean;
  type: ReportType | null;
  startedAt: string | null;
  lastError: string | null;
}
