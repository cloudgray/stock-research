# Daily report

1. `routine/CONTEXT.md`를 먼저 읽고 그 규칙을 따른다.
2. `TODAY=$(TZ=Asia/Seoul date +%F)`
3. 오늘(TODAY, KST 기준)의 주식 시장 뉴스와 시황을 웹 검색으로 리서치한다. 검색은 8회 안팎으로 제한한다.
   반드시 다룰 내용:
   - 한국 시장 (KOSPI/KOSDAQ): 지수 동향, 주요 이슈, 수급
   - 미국 시장 (S&P500/나스닥/다우): 전일 마감 동향, 주요 이슈
   - 일본 시장 (닛케이) / 중국 시장 (상해종합/항셍): 주요 동향
   - 환율 (원/달러, 엔/달러 등) 및 금리 (미 국채, 한국 기준금리 관련 이슈)
   - 주요 섹터 이슈 (반도체, AI, 2차전지, 바이오 등 주목할 만한 섹터)
4. 투자자가 주목할 만한 정보 위주로 간결하게 요약해서 `reports/daily/$TODAY.md`에 저장한다.
   - 첫 줄: `# 데일리 시황 리포트 ($TODAY)`
   - 본문은 `##` 섹션으로 구분한다.
5. 커밋 & push:
   ```bash
   git add reports/daily/$TODAY.md
   git commit -m "report: daily $TODAY"
   git push origin main
   ```
