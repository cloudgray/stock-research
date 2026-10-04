# Weekly report

1. `routine/CONTEXT.md`를 먼저 읽고 그 규칙을 따른다.
2. 기간 계산 (KST, 오늘 포함 7일):
   ```bash
   END=$(TZ=Asia/Seoul date +%F)
   START=$(TZ=Asia/Seoul date -d '6 days ago' +%F)
   ```

## A. 주간 시황
3. `reports/daily/`에서 파일명 날짜가 START~END 범위인 파일을 모두 읽는다.
   - 하나라도 있으면: 그 데일리 리포트들만 종합한다. 이 단계에서는 웹 검색을 하지 않는다.
   - 하나도 없으면: START~END 기간의 주식 시장 동향을 웹 검색으로 리서치한다.
4. 주간 시황 본문을 작성한다. 다룰 내용:
   한 주간 한국/미국/일본/중국 시장 흐름, 환율·금리 동향, 주요 섹터 이슈, 다음 주에 주목할 포인트.
   `##` 섹션으로 구분한다.

## B. 추천 종목 스크리닝 (웹 검색)
5. 다음 4가지 기준별로 후보 종목을 웹 검색으로 찾고, 각 종목의 근거
   (실적 추이, PER, 섹터 내 위치, 연금저축 매매 가능 여부 등)를 조사한다.
   1. 꾸준한 성장: 최근 3년간 매출과 당기순이익이 꾸준히 증가하는 종목
   2. 저평가 가치주: PER이 업종 평균 대비 저평가된 종목
   3. 글로벌 섹터 리더: 섹터 내 글로벌 상위 5위권 종목 (섹터별 추천)
   4. 연금저축 적합 펀드/ETF: 한국 연금저축 계좌에서 매매 가능한 펀드·ETF
   - 각 기준은 KR/US/JP/CN 시장을 고루 고려하고, 기준별로 3~6개 종목을 담는다.
   - A에서 정리한 시황을 참고하되, 조사 결과에 근거가 있는 종목만 포함한다.
   - 정확한 티커를 쓴다. 예: `"005930.KS"`, `"AAPL"`, `"7203.T"`
   - metrics에는 PER, 매출 성장률 등 근거가 되는 수치를 담고, 수치의 기준 시점을 rationale에 밝힌다.

## C. 출력
6. `reports/weekly/$END.json` — `routine/recommendations.schema.json`을 따르는 RecommendationSection 배열.
   - criterion, description, rationale은 한국어로 쓴다.
   - market은 `KR` / `US` / `JP` / `CN` / `GLOBAL` 중 하나만 쓴다.
   - 작성 후 아래 명령으로 형식을 검증하고, 실패하면 고친다:
     ```bash
     jq -e 'type=="array" and length==4 and all(.[]; (.criterion|type=="string") and (.description|type=="string") and (.items|length>=3 and length<=6) and all(.items[]; (.ticker|type=="string") and (.name|type=="string") and (.market|IN("KR","US","JP","CN","GLOBAL")) and (.sector|type=="string") and (.rationale|type=="string") and ((.metrics // {})|type=="object")))' reports/weekly/$END.json
     ```
7. `reports/weekly/$END.md`
   - 첫 줄: `# 주간 시황 리포트 ($START ~ $END)`
   - A의 본문
   - `## 추천 종목` 아래에 기준별 `###` 소제목과 description, 그리고 표
     (`티커 | 종목명 | 시장 | 섹터 | 근거 | 주요 지표`)
8. 커밋 & push:
   ```bash
   git add reports/weekly/$END.md reports/weekly/$END.json
   git commit -m "report: weekly $START~$END"
   git push origin main
   ```
