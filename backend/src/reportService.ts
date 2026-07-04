import { getReportsSince, insertReport } from './db.js';
import { generateRecommendations, generateText, researchWithWebSearch } from './claude.js';
import type { GenerationStatus, Report, ReportType } from './types.js';

// ---------------------------------------------------------------------------
// KST date helpers
// ---------------------------------------------------------------------------

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the given instant in Asia/Seoul. */
function kstDateString(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// In-memory generation lock / status
// ---------------------------------------------------------------------------

const status: GenerationStatus = {
  running: false,
  type: null,
  startedAt: null,
  lastError: null,
};

export function getGenerationStatus(): GenerationStatus {
  return { ...status };
}

/**
 * Try to start a generation job. Returns false if another job is already
 * running (only one generation runs at a time). The job itself runs
 * asynchronously; errors are recorded in status.lastError.
 */
export function startGeneration(type: ReportType): boolean {
  if (status.running) return false;
  status.running = true;
  status.type = type;
  status.startedAt = new Date().toISOString();

  void (async () => {
    try {
      const report = await generateReport(type);
      status.lastError = null;
      console.log(`[report] generated ${type} report #${report.id}: ${report.title}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      status.lastError = message;
      console.error(`[report] ${type} generation failed:`, message);
    } finally {
      status.running = false;
      status.type = null;
      status.startedAt = null;
    }
  })();

  return true;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = [
  '너는 개인 투자자를 위한 주식 시장 리서치 애널리스트다.',
  '대상 독자는 근로소득으로 투자하며, 국내 개별 종목과 연금저축 계좌의 펀드/ETF를 병행 매매하고,',
  '한국뿐 아니라 미국/일본/중국 등 해외 종목에도 관심이 있다.',
  '모든 응답은 한국어 마크다운으로 작성한다. 제목(#)은 넣지 말고 본문(## 이하 섹션)만 작성한다.',
  '사실에 근거해 작성하고, 확인되지 않은 정보는 추측임을 명시한다. 수치에는 출처 시점을 밝힌다.',
].join('\n');

async function generateReport(type: ReportType): Promise<Report> {
  switch (type) {
    case 'daily':
      return generateDaily();
    case 'weekly':
      return generateWeekly();
    case 'monthly':
      return generateMonthly();
  }
}

async function generateDaily(): Promise<Report> {
  const today = kstDateString(new Date());

  const content = await researchWithWebSearch({
    system: SYSTEM_PROMPT,
    prompt: [
      `오늘(${today}, KST 기준)의 주식 시장 뉴스와 시황을 웹 검색으로 리서치해서 데일리 리포트를 작성해줘.`,
      '',
      '반드시 다룰 내용:',
      '- 한국 시장 (KOSPI/KOSDAQ): 지수 동향, 주요 이슈, 수급',
      '- 미국 시장 (S&P500/나스닥/다우): 전일 마감 동향, 주요 이슈',
      '- 일본 시장 (닛케이) / 중국 시장 (상해종합/항셍): 주요 동향',
      '- 환율 (원/달러, 엔/달러 등) 및 금리 (미 국채, 한국 기준금리 관련 이슈)',
      '- 주요 섹터 이슈 (반도체, AI, 2차전지, 바이오 등 주목할 만한 섹터)',
      '',
      '투자자가 주목할 만한 정보 위주로 간결하게 요약하고, 마크다운 섹션(##)으로 구분해줘.',
    ].join('\n'),
  });

  return insertReport({
    type: 'daily',
    periodStart: today,
    periodEnd: today,
    title: `데일리 시황 리포트 (${today})`,
    content,
    recommendations: null,
  });
}

async function generateWeekly(): Promise<Report> {
  const periodEnd = kstDateString(new Date());
  const periodStart = kstDateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

  const dailies = getReportsSince('daily', daysAgoIso(7));

  let content: string;
  let researchContext: string;

  if (dailies.length > 0) {
    const dailyContext = dailies
      .map((r) => `### ${r.title} (${r.periodStart})\n\n${r.content}`)
      .join('\n\n---\n\n');

    content = await generateText({
      system: SYSTEM_PROMPT,
      prompt: [
        `아래는 지난 7일간(${periodStart} ~ ${periodEnd})의 데일리 시황 리포트들이다.`,
        '이를 종합해서 주간 리포트를 작성해줘.',
        '',
        '다룰 내용: 한 주간 한국/미국/일본/중국 시장 흐름, 환율·금리 동향, 주요 섹터 이슈,',
        '그리고 다음 주에 주목할 포인트. 마크다운 섹션(##)으로 구분해줘.',
        '',
        '--- 데일리 리포트 ---',
        dailyContext,
      ].join('\n'),
    });
    researchContext = dailyContext;
  } else {
    // No daily reports accumulated — fall back to web research
    content = await researchWithWebSearch({
      system: SYSTEM_PROMPT,
      prompt: [
        `지난 일주일(${periodStart} ~ ${periodEnd}, KST 기준)의 주식 시장 동향을 웹 검색으로 리서치해서 주간 리포트를 작성해줘.`,
        '',
        '다룰 내용: 한국/미국/일본/중국 시장 흐름, 환율·금리 동향, 주요 섹터 이슈,',
        '그리고 다음 주에 주목할 포인트. 마크다운 섹션(##)으로 구분해줘.',
      ].join('\n'),
    });
    researchContext = content;
  }

  const recommendations = await buildRecommendations('주간', periodStart, periodEnd, researchContext);

  return insertReport({
    type: 'weekly',
    periodStart,
    periodEnd,
    title: `주간 시황 리포트 (${periodStart} ~ ${periodEnd})`,
    content,
    recommendations,
  });
}

async function generateMonthly(): Promise<Report> {
  const periodEnd = kstDateString(new Date());
  const periodStart = kstDateString(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

  const weeklies = getReportsSince('weekly', daysAgoIso(31));
  const dailies = weeklies.length > 0 ? [] : getReportsSince('daily', daysAgoIso(31));

  let content: string;
  let researchContext: string;

  if (weeklies.length > 0 || dailies.length > 0) {
    const sourceLabel = weeklies.length > 0 ? '주간 리포트' : '데일리 리포트';
    const sources = weeklies.length > 0 ? weeklies : dailies;
    const sourceContext = sources
      .map((r) => `### ${r.title} (${r.periodStart} ~ ${r.periodEnd})\n\n${r.content}`)
      .join('\n\n---\n\n');

    content = await generateText({
      system: SYSTEM_PROMPT,
      prompt: [
        `아래는 지난 한 달(${periodStart} ~ ${periodEnd})의 ${sourceLabel}들이다.`,
        '이를 종합해서 월간 리포트를 작성해줘.',
        '',
        '다룰 내용: 한 달간 한국/미국/일본/중국 시장 흐름, 환율·금리 동향, 주요 섹터 이슈,',
        '그리고 다음 달에 주목할 포인트. 마크다운 섹션(##)으로 구분해줘.',
        '',
        `--- ${sourceLabel} ---`,
        sourceContext,
      ].join('\n'),
    });
    researchContext = sourceContext;
  } else {
    content = await researchWithWebSearch({
      system: SYSTEM_PROMPT,
      prompt: [
        `지난 한 달(${periodStart} ~ ${periodEnd}, KST 기준)의 주식 시장 동향을 웹 검색으로 리서치해서 월간 리포트를 작성해줘.`,
        '',
        '다룰 내용: 한 달간 한국/미국/일본/중국 시장 흐름, 환율·금리 동향, 주요 섹터 이슈,',
        '그리고 다음 달에 주목할 포인트. 마크다운 섹션(##)으로 구분해줘.',
      ].join('\n'),
    });
    researchContext = content;
  }

  const recommendations = await buildRecommendations('월간', periodStart, periodEnd, researchContext);

  return insertReport({
    type: 'monthly',
    periodStart,
    periodEnd,
    title: `월간 시황 리포트 (${periodStart} ~ ${periodEnd})`,
    content,
    recommendations,
  });
}

/**
 * Research recommendation candidates with web search, then produce structured
 * RecommendationSection[] via a separate structured-output call.
 */
async function buildRecommendations(
  periodLabel: string,
  periodStart: string,
  periodEnd: string,
  marketContext: string,
) {
  const research = await researchWithWebSearch({
    system: SYSTEM_PROMPT,
    prompt: [
      `${periodLabel} 리포트(${periodStart} ~ ${periodEnd})에 실을 추천 종목을 웹 검색으로 조사해줘.`,
      '',
      '다음 4가지 기준별로 후보 종목을 찾고, 각 종목의 근거(실적 추이, PER, 섹터 내 위치, 연금저축 매매 가능 여부 등)를 조사해줘:',
      '1. 꾸준한 성장: 최근 3년간 매출과 당기순이익이 꾸준히 증가하는 종목',
      '2. 저평가 가치주: PER이 업종 평균 대비 저평가된 종목',
      '3. 글로벌 섹터 리더: 섹터 내 글로벌 상위 5위권 종목 (섹터별 추천)',
      '4. 연금저축 적합 펀드/ETF: 한국 연금저축 계좌에서 매매 가능한 펀드·ETF',
      '',
      '각 기준은 KR/US/JP/CN 시장을 고루 고려해줘.',
      '종목별로 정확한 티커(예: "005930.KS", "AAPL", "7203.T"), 종목명, 시장, 섹터, 근거 수치를 정리해줘.',
      '',
      '참고용 최근 시황 요약:',
      '--- 시황 요약 ---',
      marketContext.slice(0, 20000),
    ].join('\n'),
  });

  return generateRecommendations(research);
}
