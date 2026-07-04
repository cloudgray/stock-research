import type { RecommendationSection } from '../types';
import MarketBadge from './MarketBadge';

interface RecommendationsProps {
  sections: RecommendationSection[];
}

/** 기준(criterion)별로 그룹핑된 종목 추천 섹션 */
export default function Recommendations({ sections }: RecommendationsProps) {
  if (sections.length === 0) return null;

  return (
    <section className="reco" aria-label="종목 추천">
      <h2 className="reco-heading">종목 추천</h2>
      {sections.map((section) => (
        <div className="reco-section" key={section.criterion}>
          <h3 className="reco-criterion">{section.criterion}</h3>
          <p className="reco-description">{section.description}</p>
          {section.items.length === 0 ? (
            <p className="reco-empty">이 기준에 해당하는 추천 종목이 없습니다.</p>
          ) : (
            <div className="reco-grid">
              {section.items.map((item) => (
                <article className="reco-card" key={`${section.criterion}-${item.ticker}`}>
                  <header className="reco-card-head">
                    <div className="reco-name-wrap">
                      <span className="reco-name">{item.name}</span>
                      <span className="reco-ticker">{item.ticker}</span>
                    </div>
                    <MarketBadge market={item.market} />
                  </header>
                  <div className="reco-sector">{item.sector}</div>
                  <p className="reco-rationale">{item.rationale}</p>
                  {item.metrics && Object.keys(item.metrics).length > 0 && (
                    <dl className="reco-metrics">
                      {Object.entries(item.metrics).map(([key, value]) => (
                        <div className="reco-metric" key={key}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
