import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import ReportDetailPage from './pages/ReportDetailPage';
import ReportListPage from './pages/ReportListPage';
import type { ReportType } from './types';

const TABS: { type: ReportType; path: string; label: string }[] = [
  { type: 'daily', path: '/daily', label: '일간' },
  { type: 'weekly', path: '/weekly', label: '주간' },
  { type: 'monthly', path: '/monthly', label: '월간' },
];

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-brand">
            <span className="app-brand-mark" aria-hidden="true">
              ↗
            </span>
            주식 리서치
          </Link>
          <nav className="app-tabs" aria-label="리포트 종류">
            {TABS.map((tab) => (
              <NavLink
                key={tab.type}
                to={tab.path}
                className={({ isActive }) =>
                  `app-tab${isActive || (tab.type === 'daily' && pathname === '/') ? ' active' : ''}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<ReportListPage type="daily" />} />
          <Route path="/daily" element={<ReportListPage type="daily" />} />
          <Route path="/weekly" element={<ReportListPage type="weekly" />} />
          <Route path="/monthly" element={<ReportListPage type="monthly" />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route
            path="*"
            element={
              <div className="notice notice-empty">
                <p>페이지를 찾을 수 없습니다.</p>
                <Link className="btn-secondary" to="/">
                  홈으로 돌아가기
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>본 리포트는 자동 생성된 참고 자료이며, 투자 판단의 책임은 투자자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
