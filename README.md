# Stock Research

주식 종목 리서치 웹앱. Claude API로 시황을 리서치하여 daily / weekly / monthly report를 자동 생성하고, weekly/monthly report에는 기준별 주식 종목 추천 섹션이 포함됩니다.

## 대상 사용자

- 근로소득으로 주식투자를 하는 투자자
- 개별 종목 + 연금저축 계좌 펀드 매매 병행
- 국내 주식뿐 아니라 미국 / 일본 / 중국 등 해외 종목에도 관심
- 매달 자신이 정한 원칙에 따라 투자
- 매주 투자할 만한 종목 목록을 받아보고 싶은 사용자

## 구성

| 디렉토리 | 설명 |
|---|---|
| `backend/` | Node.js + TypeScript + Express + SQLite. 리포트 생성(Claude API + 웹 검색), 스케줄링, REST API |
| `frontend/` | React + Vite + TypeScript. 리포트 조회 UI |
| `docs/` | API 계약 등 문서 |

## 실행 (로컬)

```bash
# 백엔드 (포트 3001)
cd backend
npm install
ANTHROPIC_API_KEY=... npm run dev

# 프론트엔드 (포트 5173, /api → 3001 프록시)
cd frontend
npm install
npm run dev
```

## 리포트 생성 흐름

- **daily**: 매일 06:00 KST — 당일 뉴스·시황을 웹 검색으로 리서치하여 요약 저장
- **weekly**: 매주 일요일 07:00 KST — 그 주의 daily report들을 종합 + 종목 추천 섹션
- **monthly**: 매월 1일 08:00 KST — 그 달의 weekly report들을 종합 + 종목 추천 섹션
- 수동 트리거: `POST /api/reports/generate`

API 상세는 [docs/API.md](docs/API.md) 참고.
