# API 계약 (Backend ↔ Frontend)

백엔드는 `http://localhost:3001`에서 실행되며 모든 엔드포인트는 `/api` prefix를 가진다.
프론트엔드 dev 서버(5173)는 `/api`를 3001로 프록시한다.

## 타입

```ts
type ReportType = 'daily' | 'weekly' | 'monthly';
type Market = 'KR' | 'US' | 'JP' | 'CN' | 'GLOBAL';

interface RecommendationItem {
  ticker: string;        // 예: "005930.KS", "AAPL", "7203.T"
  name: string;          // 종목명
  market: Market;
  sector: string;        // 예: "반도체", "자동차"
  rationale: string;     // 추천 근거 (한국어)
  metrics?: Record<string, string>; // 예: { "PER": "8.2", "3년 매출 CAGR": "12%" }
}

interface RecommendationSection {
  criterion: string;     // 추천 기준 이름. 예: "3년 연속 매출/순이익 증가"
  description: string;   // 기준 설명 (한국어)
  items: RecommendationItem[];
}

interface Report {
  id: number;
  type: ReportType;
  periodStart: string;   // "YYYY-MM-DD"
  periodEnd: string;     // "YYYY-MM-DD"
  title: string;         // 한국어 제목
  content: string;       // 마크다운 본문 (한국어)
  recommendations: RecommendationSection[] | null; // weekly/monthly만 채워짐, daily는 null
  createdAt: string;     // ISO 8601
}

interface ReportSummary {   // 목록 조회용 (content 제외)
  id: number;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  title: string;
  createdAt: string;
}
```

## 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/reports?type={ReportType}&limit={n}&offset={n}` | 리포트 목록 (최신순). 응답: `{ reports: ReportSummary[], total: number }`. `type` 생략 시 전체 |
| GET | `/api/reports/latest?type={ReportType}` | 해당 타입 최신 리포트 1건. 응답: `Report`. 없으면 404 |
| GET | `/api/reports/:id` | 리포트 상세. 응답: `Report`. 없으면 404 |
| POST | `/api/reports/generate` | 수동 생성 트리거. body: `{ "type": ReportType }`. 응답 202: `{ "status": "started", "type": ... }` (생성은 비동기, 수 분 소요 가능) |
| GET | `/api/reports/generate/status` | 생성 진행 상태. 응답: `{ running: boolean, type: ReportType \| null, startedAt: string \| null, lastError: string \| null }` |
| GET | `/api/health` | 헬스체크. 응답: `{ ok: true }` |

## 에러 형식

```json
{ "error": "메시지" }
```

## 추천 기준 (weekly/monthly 리포트의 recommendations에 포함)

1. **꾸준한 성장**: 최근 3년간 매출과 당기순이익이 꾸준히 증가하는 종목
2. **저평가 가치주**: PER이 업종 평균 대비 저평가된 종목
3. **글로벌 섹터 리더**: 섹터 내 글로벌 상위 5위권 종목 (섹터별 추천)
4. **연금저축 적합 펀드/ETF**: 연금저축 계좌에서 매매 가능한 펀드·ETF

각 기준은 KR/US/JP/CN 시장을 고루 고려한다.
