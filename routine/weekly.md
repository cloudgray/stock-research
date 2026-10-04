# Weekly report

1. `routine/CONTEXT.md`를 먼저 읽고 그 규칙을 따른다.
2. 기간 계산 (KST, 오늘 포함 7일):
   ```bash
   END=$(TZ=Asia/Seoul date +%F)
   START=$(TZ=Asia/Seoul date -d '6 days ago' +%F)
   PREV=$(ls reports/weekly/*.json 2>/dev/null | grep -v "/$END.json" | sort | tail -1)
   ```

## A. 주간 시황
3. `reports/daily/`에서 파일명 날짜가 START~END 범위인 파일을 모두 읽는다.
   - 하나라도 있으면: 그 데일리 리포트들만 종합한다. 이 단계에서는 웹 검색을 하지 않는다.
   - 하나도 없으면: START~END 기간의 주식 시장 동향을 웹 검색으로 리서치한다.
4. 주간 시황 본문을 작성한다. 다룰 내용:
   한 주간 한국/미국/일본/중국 시장 흐름, 환율·금리 동향, 주요 섹터 이슈, 다음 주에 주목할 포인트.
   `##` 섹션으로 구분한다.

## B. 추천 종목 스크리닝 (웹 검색)
5. 아래 5가지 기준별로 후보를 웹 검색으로 찾고, **공통 필터 → 기준별 조건** 순서로 걸러낸다.
   필터를 통과했는지 확인하지 못한 항목은 "미확인"으로 남기고, 핵심 조건이 미확인인 종목은 넣지 않는다.

### 공통 필터 (개별 종목, 기준 1·2·3·5)
- 규모·유동성: 시가총액 약 US$10억 이상, 거래가 활발한 종목
- 이익의 질: 최근 3년 영업현금흐름 흑자
- 재무 건전성: 부채비율 200% 이하 또는 순부채/EBITDA 3배 이하 (금융업은 자본비율 등 업종 지표로 대체)
- 수익성: 최근 연도 ROE 8% 이상
- 제외: 관리종목·투자경고, 감사의견 비적정, 최근 1년 내 대규모 유상증자·CB 발행 반복

### 기준별 조건
1. **꾸준한 성장**: 최근 3년간 매출과 당기순이익이 매년 증가
   - 영업이익률이 유지되거나 개선될 것
   - PEG 2 이하 (성장 대비 과열 제외)
2. **저평가 가치주**: PER이 업종 평균 대비 저평가
   - 업종 평균 대비 할인율을 수치로 제시할 것 (비교 대상 명시)
   - 가치 함정 배제: 최근 2년 이익이 추세적으로 감소 중이면 제외, PBR과 ROE도 함께 제시
   - 가점: 배당 확대, 자사주 소각, 밸류업 공시 등 주주환원
3. **글로벌 섹터 리더**: 섹터 내 글로벌 상위 5위권 (섹터별 추천)
   - 순위 근거(매출·점유율·시가총액)를 출처와 함께 명시
   - 같은 섹터는 최대 2종목
4. **연금저축 적합 펀드/ETF**: 한국 연금저축 계좌에서 매매 가능한 상품
   - 국내 상장 ETF/펀드만 (해외 상장 ETF는 연금저축 불가)
   - 레버리지·인버스 제외 (연금저축 매매 불가)
   - 순자산 1,000억 원 이상, 총보수(%)와 추종 지수를 명시
   - market은 상장 시장이 아니라 **투자 대상 지역**으로 쓴다 (예: TIGER 미국S&P500 → `US`)
5. **배당 성장**: 근로소득 투자자의 장기 보유용
   - 최근 5년 연속 주당배당금 유지 또는 증가
   - 배당성향 70% 이하 (지속 가능성), 배당수익률 2% 이상

### 선정 규칙
- 각 기준은 KR/US/JP/CN 시장을 고루 고려하고, 기준별로 3~6개 종목을 담는다.
- 같은 종목은 여러 기준에 중복해서 넣지 않는다. 불가피하면 1회까지만 허용하고 이유를 쓴다.
- A에서 정리한 시황을 참고하되, 조사 결과에 근거가 있는 종목만 포함한다.
- 정확한 티커를 쓴다. 예: `"005930.KS"`, `"AAPL"`, `"7203.T"`
- 수치마다 기준 시점과 출처를 밝힌다. 공시·IR·거래소 자료를 우선하고, 추정치나 역산한 값은 표시한다.
- 전주 대비: `$PREV`가 있으면 읽고, 각 종목에 `신규`/`유지`를 표시한다. 전주에 있었지만 이번에 빠진 종목은 제외 사유를 정리한다.
  근거가 바뀌지 않았다면 매주 종목을 크게 바꾸지 않는다.

## C. 출력
6. `reports/weekly/$END.json` — `routine/recommendations.schema.json`을 따르는 RecommendationSection 배열 (기준 5개).
   - criterion, description, rationale, thesis, catalysts, risks는 한국어로 쓴다.
   - rationale: 기준·필터를 통과한 근거를 수치로 정리
   - thesis: 한두 문장의 핵심 투자 포인트
   - catalysts / risks: 각각 2~3개 항목
   - status: `신규` 또는 `유지`
   - 작성 후 아래 명령으로 형식을 검증하고, 실패하면 고친다:
     ```bash
     jq -e 'type=="array" and length==5 and all(.[]; (.criterion|type=="string") and (.description|type=="string") and (.items|length>=3 and length<=6) and all(.items[]; (.ticker|type=="string") and (.name|type=="string") and (.market|IN("KR","US","JP","CN","GLOBAL")) and (.sector|type=="string") and (.rationale|type=="string") and ((.metrics // {})|type=="object") and (.thesis|type=="string") and (.catalysts|type=="array") and (.risks|type=="array") and (.status|IN("신규","유지"))))' reports/weekly/$END.json
     ```
7. `reports/weekly/$END.md`
   - 첫 줄: `# 주간 시황 리포트 ($START ~ $END)`
   - A의 본문
   - `## 추천 종목`
     - 맨 앞에 적용한 공통 필터를 한 문단으로 요약한다.
     - 기준별 `###` 소제목과 description, 그리고 요약 표 (`티커 | 종목명 | 시장 | 섹터 | 상태 | 한 줄 포인트 | 주요 지표`)
     - 표 아래에 종목마다 `####` 소제목(`종목명 (티커)`)을 두고 다음 항목으로 리즈닝을 쓴다:
       - **투자 포인트**: 왜 지금 이 종목인가 (thesis를 풀어서)
       - **스크리닝 근거**: 이 기준과 공통 필터를 어떻게 통과했는지 수치로
       - **밸류에이션**: PER/PBR/PEG 등을 업종·과거 평균과 비교
       - **성장 동인·카탈리스트**: 향후 주가에 영향을 줄 이벤트·일정
       - **리스크**: 이 판단이 틀릴 수 있는 시나리오
       - **체크포인트**: 다음 주에 무엇이 바뀌면 추천을 재검토할지
       - **계좌**: 일반 계좌 / 연금저축 가능 여부
   - `## 전주 대비 변화`: 신규 편입·제외 종목과 사유 (첫 주라 `$PREV`가 없으면 생략)
8. 커밋 & push:
   ```bash
   git add reports/weekly/$END.md reports/weekly/$END.json
   git commit -m "report: weekly $START~$END"
   git push origin main
   ```
9. PushNotification 도구로 휴대폰에 알림을 보낸다 (`status: "proactive"`):
   - 이번 주 시황 한 줄과 기준별 신규 편입 종목명, 그리고 `reports/weekly/$END.md` 경로
   - push에 실패했으면 실패 사실과 원인을 알린다.
