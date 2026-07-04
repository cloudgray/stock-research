import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RecommendationSection, Report, ReportSummary, ReportType } from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// src/db.ts -> backend/data/reports.db (works from both src/ via tsx and dist/ via node)
const DATA_DIR = path.resolve(here, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'reports.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('daily','weekly','monthly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  recommendations TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_type_created ON reports(type, created_at DESC);
`);

interface ReportRow {
  id: number;
  type: ReportType;
  period_start: string;
  period_end: string;
  title: string;
  content: string;
  recommendations: string | null;
  created_at: string;
}

/** SQLite's datetime('now') stores "YYYY-MM-DD HH:MM:SS" in UTC — convert to ISO 8601. */
function toIso(sqliteDatetime: string): string {
  if (sqliteDatetime.includes('T')) return sqliteDatetime;
  return sqliteDatetime.replace(' ', 'T') + 'Z';
}

function rowToReport(row: ReportRow): Report {
  let recommendations: RecommendationSection[] | null = null;
  if (row.recommendations) {
    try {
      recommendations = JSON.parse(row.recommendations) as RecommendationSection[];
    } catch {
      recommendations = null;
    }
  }
  return {
    id: row.id,
    type: row.type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    title: row.title,
    content: row.content,
    recommendations,
    createdAt: toIso(row.created_at),
  };
}

function rowToSummary(row: Omit<ReportRow, 'content' | 'recommendations'>): ReportSummary {
  return {
    id: row.id,
    type: row.type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    title: row.title,
    createdAt: toIso(row.created_at),
  };
}

export interface InsertReportInput {
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  title: string;
  content: string;
  recommendations: RecommendationSection[] | null;
}

export function insertReport(input: InsertReportInput): Report {
  const stmt = db.prepare(`
    INSERT INTO reports (type, period_start, period_end, title, content, recommendations)
    VALUES (@type, @periodStart, @periodEnd, @title, @content, @recommendations)
  `);
  const result = stmt.run({
    type: input.type,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    title: input.title,
    content: input.content,
    recommendations: input.recommendations ? JSON.stringify(input.recommendations) : null,
  });
  return getReportById(Number(result.lastInsertRowid))!;
}

export function getReportById(id: number): Report | null {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
  return row ? rowToReport(row) : null;
}

export function getLatestReport(type: ReportType): Report | null {
  const row = db
    .prepare('SELECT * FROM reports WHERE type = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .get(type) as ReportRow | undefined;
  return row ? rowToReport(row) : null;
}

export function listReports(options: {
  type?: ReportType;
  limit: number;
  offset: number;
}): { reports: ReportSummary[]; total: number } {
  const { type, limit, offset } = options;
  const where = type ? 'WHERE type = ?' : '';
  const params: unknown[] = type ? [type] : [];

  const total = (
    db.prepare(`SELECT COUNT(*) AS cnt FROM reports ${where}`).get(...params) as { cnt: number }
  ).cnt;

  const rows = db
    .prepare(
      `SELECT id, type, period_start, period_end, title, created_at
       FROM reports ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Omit<ReportRow, 'content' | 'recommendations'>[];

  return { reports: rows.map(rowToSummary), total };
}

/** Reports of a given type whose created_at falls within [sinceIso, now]. Ascending order (oldest first) for LLM context. */
export function getReportsSince(type: ReportType, sinceIso: string): Report[] {
  const rows = db
    .prepare(
      `SELECT * FROM reports WHERE type = ? AND created_at >= ? ORDER BY created_at ASC, id ASC`,
    )
    .all(type, sinceIso.replace('T', ' ').replace('Z', '')) as ReportRow[];
  return rows.map(rowToReport);
}
