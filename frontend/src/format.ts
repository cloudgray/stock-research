import type { ReportType } from './types';

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
};

/** "YYYY-MM-DD" → "YYYY.MM.DD" */
export function formatDate(dateStr: string): string {
  return dateStr.split('-').join('.');
}

/** 기간 표시. 시작일과 종료일이 같으면 하루만 표시 */
export function formatPeriod(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

/** ISO 8601 → "YYYY.MM.DD HH:mm" (로컬 시간) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
