import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchReports } from '../api';
import GeneratePanel from '../components/GeneratePanel';
import Spinner from '../components/Spinner';
import { formatDateTime, formatPeriod, REPORT_TYPE_LABEL } from '../format';
import type { ReportSummary, ReportType } from '../types';

interface ReportListPageProps {
  type: ReportType;
}

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; isNetwork: boolean }
  | { kind: 'loaded'; reports: ReportSummary[]; total: number };

export default function ReportListPage({ type }: ReportListPageProps) {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { reports, total } = await fetchReports({ type, limit: 50 });
      setState({ kind: 'loaded', reports, total });
    } catch (err) {
      if (err instanceof ApiError) {
        setState({ kind: 'error', message: err.message, isNetwork: err.isNetworkError });
      } else {
        setState({ kind: 'error', message: '알 수 없는 오류가 발생했습니다.', isNetwork: false });
      }
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="list-page">
      <div className="list-toolbar">
        <h1 className="page-title">{REPORT_TYPE_LABEL[type]} 리포트</h1>
        <GeneratePanel type={type} onCompleted={() => void load()} />
      </div>

      {state.kind === 'loading' && <Spinner label="리포트를 불러오는 중..." />}

      {state.kind === 'error' && (
        <div className="notice notice-error" role="alert">
          <strong>{state.isNetwork ? '백엔드 서버에 연결할 수 없습니다.' : '오류가 발생했습니다.'}</strong>
          <p>
            {state.isNetwork
              ? '백엔드(포트 3001)가 실행 중인지 확인해 주세요. 실행 후 다시 시도하면 됩니다.'
              : state.message}
          </p>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            다시 시도
          </button>
        </div>
      )}

      {state.kind === 'loaded' && state.reports.length === 0 && (
        <div className="notice notice-empty">
          <p>아직 리포트가 없습니다. 리포트 생성 버튼을 눌러 첫 리포트를 만들어 보세요.</p>
        </div>
      )}

      {state.kind === 'loaded' && state.reports.length > 0 && (
        <>
          <p className="list-count">총 {state.total}건</p>
          <ul className="report-list">
            {state.reports.map((report) => (
              <li key={report.id}>
                <Link className="report-card" to={`/reports/${report.id}`}>
                  <div className="report-card-top">
                    <span className={`type-badge type-${report.type}`}>
                      {REPORT_TYPE_LABEL[report.type]}
                    </span>
                    <span className="report-period">
                      {formatPeriod(report.periodStart, report.periodEnd)}
                    </span>
                  </div>
                  <h2 className="report-title">{report.title}</h2>
                  <time className="report-created" dateTime={report.createdAt}>
                    생성일 {formatDateTime(report.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
