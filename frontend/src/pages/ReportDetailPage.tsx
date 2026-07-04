import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import { ApiError, fetchReport } from '../api';
import Recommendations from '../components/Recommendations';
import Spinner from '../components/Spinner';
import { formatDateTime, formatPeriod, REPORT_TYPE_LABEL } from '../format';
import type { Report } from '../types';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; isNetwork: boolean; notFound: boolean }
  | { kind: 'loaded'; report: Report };

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<DetailState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!id) return;
    setState({ kind: 'loading' });
    try {
      const report = await fetchReport(id);
      setState({ kind: 'loaded', report });
    } catch (err) {
      if (err instanceof ApiError) {
        setState({
          kind: 'error',
          message: err.message,
          isNetwork: err.isNetworkError,
          notFound: err.status === 404,
        });
      } else {
        setState({
          kind: 'error',
          message: '알 수 없는 오류가 발생했습니다.',
          isNetwork: false,
          notFound: false,
        });
      }
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return <Spinner label="리포트를 불러오는 중..." />;
  }

  if (state.kind === 'error') {
    return (
      <div className="notice notice-error" role="alert">
        <strong>
          {state.notFound
            ? '리포트를 찾을 수 없습니다.'
            : state.isNetwork
              ? '백엔드 서버에 연결할 수 없습니다.'
              : '오류가 발생했습니다.'}
        </strong>
        <p>
          {state.isNetwork
            ? '백엔드(포트 3001)가 실행 중인지 확인해 주세요.'
            : state.message}
        </p>
        <div className="notice-actions">
          {!state.notFound && (
            <button type="button" className="btn-secondary" onClick={() => void load()}>
              다시 시도
            </button>
          )}
          <Link className="btn-secondary" to="/">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const { report } = state;

  return (
    <article className="detail-page">
      <nav className="detail-back">
        <Link to={`/${report.type}`}>← {REPORT_TYPE_LABEL[report.type]} 리포트 목록</Link>
      </nav>

      <header className="detail-header">
        <div className="detail-meta">
          <span className={`type-badge type-${report.type}`}>
            {REPORT_TYPE_LABEL[report.type]}
          </span>
          <span className="report-period">
            {formatPeriod(report.periodStart, report.periodEnd)}
          </span>
        </div>
        <h1 className="detail-title">{report.title}</h1>
        <time className="report-created" dateTime={report.createdAt}>
          생성일 {formatDateTime(report.createdAt)}
        </time>
      </header>

      <div className="markdown-body">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>

      {report.recommendations && report.recommendations.length > 0 && (
        <Recommendations sections={report.recommendations} />
      )}
    </article>
  );
}
