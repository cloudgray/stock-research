import type { Market } from '../types';

const MARKET_LABEL: Record<Market, string> = {
  KR: '한국',
  US: '미국',
  JP: '일본',
  CN: '중국',
  GLOBAL: '글로벌',
};

interface MarketBadgeProps {
  market: Market;
}

export default function MarketBadge({ market }: MarketBadgeProps) {
  return (
    <span className={`market-badge market-${market.toLowerCase()}`}>
      {market} · {MARKET_LABEL[market]}
    </span>
  );
}
