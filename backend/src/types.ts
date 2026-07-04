// API contract types — must stay in sync with docs/API.md

export type ReportType = 'daily' | 'weekly' | 'monthly';

export type Market = 'KR' | 'US' | 'JP' | 'CN' | 'GLOBAL';

export interface RecommendationItem {
  ticker: string; // e.g. "005930.KS", "AAPL", "7203.T"
  name: string;
  market: Market;
  sector: string;
  rationale: string; // Korean
  metrics?: Record<string, string>;
}

export interface RecommendationSection {
  criterion: string;
  description: string;
  items: RecommendationItem[];
}

export interface Report {
  id: number;
  type: ReportType;
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string; // "YYYY-MM-DD"
  title: string;
  content: string; // markdown, Korean
  recommendations: RecommendationSection[] | null;
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

export interface GenerationStatus {
  running: boolean;
  type: ReportType | null;
  startedAt: string | null;
  lastError: string | null;
}

export const REPORT_TYPES: ReportType[] = ['daily', 'weekly', 'monthly'];

export function isReportType(value: unknown): value is ReportType {
  return typeof value === 'string' && (REPORT_TYPES as string[]).includes(value);
}
