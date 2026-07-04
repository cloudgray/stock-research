import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { startScheduler } from './scheduler.js';

const PORT = Number(process.env.PORT || 3001);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

// 404 for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다' });
});

// Error handler (must have 4 args for Express to treat it as one)
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] unhandled error:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다' });
  },
);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[server] ANTHROPIC_API_KEY is not set — report generation will fail until it is provided');
  }
  startScheduler();
});
