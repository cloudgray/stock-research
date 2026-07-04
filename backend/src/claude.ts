import Anthropic from '@anthropic-ai/sdk';
import type { Market, RecommendationSection } from './types.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
const MAX_TOKENS = 64000;
const MAX_PAUSE_TURN_CONTINUATIONS = 5;

// Credentials resolved from environment (ANTHROPIC_API_KEY) automatically.
const client = new Anthropic();

const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209' as const,
  name: 'web_search' as const,
  max_uses: 8,
};

function extractText(message: Anthropic.Message): string {
  // content is a union array — must check block type
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) {
    return `Claude API rate limited (429): ${err.message}`;
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return `Claude API authentication failed (401) — check ANTHROPIC_API_KEY: ${err.message}`;
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Claude API bad request (400): ${err.message}`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return `Claude API connection error: ${err.message}`;
  }
  if (err instanceof Anthropic.APIError) {
    return `Claude API error (${err.status}): ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

export class ClaudeError extends Error {
  constructor(cause: unknown) {
    super(describeError(cause));
    this.name = 'ClaudeError';
  }
}

/**
 * Run a research prompt with the server-side web search tool, streaming the
 * response and continuing across pause_turn stops. Returns the final text.
 */
export async function researchWithWebSearch(options: {
  system?: string;
  prompt: string;
}): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: options.prompt }];

  try {
    for (let attempt = 0; attempt <= MAX_PAUSE_TURN_CONTINUATIONS; attempt++) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        ...(options.system ? { system: options.system } : {}),
        tools: [WEB_SEARCH_TOOL],
        messages,
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === 'pause_turn') {
        // Server-side tool loop paused — append assistant content and continue
        messages.push({ role: 'assistant', content: message.content });
        continue;
      }
      return extractText(message);
    }
    throw new Error(
      `Claude did not finish within ${MAX_PAUSE_TURN_CONTINUATIONS} pause_turn continuations`,
    );
  } catch (err) {
    if (err instanceof ClaudeError) throw err;
    throw new ClaudeError(err);
  }
}

/**
 * Summarize / generate text without web search (used when prior reports
 * already provide the context). Streaming, adaptive thinking.
 */
export async function generateText(options: { system?: string; prompt: string }): Promise<string> {
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      ...(options.system ? { system: options.system } : {}),
      messages: [{ role: 'user', content: options.prompt }],
    });
    const message = await stream.finalMessage();
    return extractText(message);
  } catch (err) {
    throw new ClaudeError(err);
  }
}

// ---------------------------------------------------------------------------
// Structured recommendations
// ---------------------------------------------------------------------------

// JSON-schema-friendly shape: metrics as an array of pairs (structured outputs
// require additionalProperties: false on every object, so a free-form
// Record<string, string> cannot be expressed directly).
interface RawRecommendationItem {
  ticker: string;
  name: string;
  market: Market;
  sector: string;
  rationale: string;
  metrics: { name: string; value: string }[];
}

interface RawRecommendationSection {
  criterion: string;
  description: string;
  items: RawRecommendationItem[];
}

interface RawRecommendationsOutput {
  sections: RawRecommendationSection[];
}

const RECOMMENDATIONS_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string', description: '추천 기준 이름 (한국어)' },
          description: { type: 'string', description: '기준 설명 (한국어)' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: '티커. 예: "005930.KS", "AAPL", "7203.T"',
                },
                name: { type: 'string', description: '종목명' },
                market: {
                  type: 'string',
                  enum: ['KR', 'US', 'JP', 'CN', 'GLOBAL'],
                },
                sector: { type: 'string', description: '섹터. 예: "반도체", "자동차"' },
                rationale: { type: 'string', description: '추천 근거 (한국어)' },
                metrics: {
                  type: 'array',
                  description: '주요 지표. 예: {name: "PER", value: "8.2"}',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      value: { type: 'string' },
                    },
                    required: ['name', 'value'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['ticker', 'name', 'market', 'sector', 'rationale', 'metrics'],
              additionalProperties: false,
            },
          },
        },
        required: ['criterion', 'description', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['sections'],
  additionalProperties: false,
} as const;

/**
 * Generate structured RecommendationSection[] from prior research text.
 * Separate call with output_config.format (json_schema) — no web search tool
 * here (citations and output_config.format cannot be combined), and no
 * assistant prefill (rejected with 400 on this model).
 */
export async function generateRecommendations(researchContext: string): Promise<RecommendationSection[]> {
  const prompt = [
    '아래 리서치 결과를 바탕으로, 다음 4가지 기준별 추천 종목 목록을 JSON으로 생성해줘.',
    '',
    '기준:',
    '1. 꾸준한 성장: 최근 3년간 매출과 당기순이익이 꾸준히 증가하는 종목',
    '2. 저평가 가치주: PER이 업종 평균 대비 저평가된 종목',
    '3. 글로벌 섹터 리더: 섹터 내 글로벌 상위 5위권 종목 (섹터별 추천)',
    '4. 연금저축 적합 펀드/ETF: 연금저축 계좌에서 매매 가능한 펀드·ETF',
    '',
    '각 기준은 KR/US/JP/CN 시장을 고루 고려하고, 기준별로 3~6개 종목을 담아줘.',
    'criterion, description, rationale은 한국어로 작성하고, 리서치 결과에 근거가 있는 종목만 포함해줘.',
    'metrics에는 PER, 매출 성장률 등 근거가 되는 수치를 name/value 쌍으로 담아줘.',
    '',
    '--- 리서치 결과 ---',
    researchContext,
  ].join('\n');

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: {
        format: {
          type: 'json_schema',
          schema: RECOMMENDATIONS_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [{ role: 'user', content: prompt }],
    });
    const message = await stream.finalMessage();
    const text = extractText(message);
    const parsed = JSON.parse(text) as RawRecommendationsOutput;

    return parsed.sections.map((section) => ({
      criterion: section.criterion,
      description: section.description,
      items: section.items.map((item) => {
        const metrics: Record<string, string> = {};
        for (const m of item.metrics) metrics[m.name] = m.value;
        return {
          ticker: item.ticker,
          name: item.name,
          market: item.market,
          sector: item.sector,
          rationale: item.rationale,
          ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
        };
      }),
    }));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ClaudeError(new Error(`Failed to parse structured recommendations JSON: ${err.message}`));
    }
    throw new ClaudeError(err);
  }
}
