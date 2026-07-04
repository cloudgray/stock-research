import { Router, type Request, type Response } from 'express';
import { getLatestReport, getReportById, listReports } from './db.js';
import { getGenerationStatus, startGeneration } from './reportService.js';
import { isReportType } from './types.js';

export const router = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}

// GET /api/reports?type={ReportType}&limit={n}&offset={n}
router.get('/reports', (req: Request, res: Response) => {
  const { type } = req.query;
  if (type !== undefined && !isReportType(type)) {
    res.status(400).json({ error: `유효하지 않은 type: ${String(type)}` });
    return;
  }
  const limit = Math.min(parseNonNegativeInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = parseNonNegativeInt(req.query.offset, 0);

  const result = listReports({ type: type as never, limit, offset });
  res.json(result);
});

// GET /api/reports/latest?type={ReportType}
router.get('/reports/latest', (req: Request, res: Response) => {
  const { type } = req.query;
  if (!isReportType(type)) {
    res.status(400).json({ error: 'type 쿼리 파라미터가 필요합니다 (daily|weekly|monthly)' });
    return;
  }
  const report = getLatestReport(type);
  if (!report) {
    res.status(404).json({ error: `${type} 리포트가 없습니다` });
    return;
  }
  res.json(report);
});

// GET /api/reports/generate/status
router.get('/reports/generate/status', (_req: Request, res: Response) => {
  res.json(getGenerationStatus());
});

// POST /api/reports/generate  body: { "type": ReportType }
router.post('/reports/generate', (req: Request, res: Response) => {
  const type = (req.body ?? {}).type;
  if (!isReportType(type)) {
    res.status(400).json({ error: 'body에 type이 필요합니다 (daily|weekly|monthly)' });
    return;
  }
  const started = startGeneration(type);
  if (!started) {
    res.status(409).json({ error: '이미 다른 리포트 생성 작업이 실행 중입니다' });
    return;
  }
  res.status(202).json({ status: 'started', type });
});

// GET /api/reports/:id
router.get('/reports/:id', (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: '유효하지 않은 리포트 ID입니다' });
    return;
  }
  const report = getReportById(id);
  if (!report) {
    res.status(404).json({ error: `리포트를 찾을 수 없습니다 (id=${id})` });
    return;
  }
  res.json(report);
});

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});
