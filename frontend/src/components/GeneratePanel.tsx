import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchGenerateStatus, startGenerate } from '../api';
import { REPORT_TYPE_LABEL } from '../format';
import type { ReportType } from '../types';

const POLL_INTERVAL_MS = 5000;

type PanelState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'running'; type: ReportType | null }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

interface GeneratePanelProps {
  /** 이 페이지에서 생성할 리포트 타입 */
  type: ReportType;
  /** 생성 완료 시 목록 새로고침 콜백 */
  onCompleted: () => void;
}

/**
 * "리포트 생성" 버튼 + 진행 상태 배지.
 * POST /api/reports/generate 호출 후 GET /api/reports/generate/status 를
 * 5초 간격으로 폴링하여 진행 상태를 표시한다.
 */
export default function GeneratePanel({ type, onCompleted }: GeneratePanelProps) {
  const [state, setState] = useState<PanelState>({ kind: 'idle' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const poll = useCallback(async (wasRunning: boolean) => {
    let status;
    try {
      status = await fetchGenerateStatus();
    } catch {
      // 상태 조회 실패(백엔드 일시 중단 등) 시 잠시 후 재시도
      timerRef.current = setTimeout(() => void poll(wasRunning), POLL_INTERVAL_MS);
      return;
    }

    if (status.running) {
      setState({ kind: 'running', type: status.type });
      timerRef.current = setTimeout(() => void poll(true), POLL_INTERVAL_MS);
      return;
    }

    // running: false — 직전까지 실행 중이었다면 완료(또는 실패) 처리
    if (wasRunning) {
      if (status.lastError) {
        setState({ kind: 'error', message: status.lastError });
      } else {
        setState({ kind: 'done' });
        onCompletedRef.current();
      }
    } else {
      setState({ kind: 'idle' });
    }
  }, []);

  // 마운트 시 이미 생성이 진행 중인지 1회 확인 (실패해도 무시)
  useEffect(() => {
    let cancelled = false;
    fetchGenerateStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.running) {
          setState({ kind: 'running', type: status.type });
          timerRef.current = setTimeout(() => void poll(true), POLL_INTERVAL_MS);
        }
      })
      .catch(() => {
        // 백엔드 미기동 등 — 버튼은 그대로 노출
      });
    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [poll]);

  const handleClick = async () => {
    clearTimer();
    setState({ kind: 'starting' });
    try {
      await startGenerate(type);
      setState({ kind: 'running', type });
      timerRef.current = setTimeout(() => void poll(true), POLL_INTERVAL_MS);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '리포트 생성 요청에 실패했습니다.';
      setState({ kind: 'error', message });
    }
  };

  const busy = state.kind === 'starting' || state.kind === 'running';

  return (
    <div className="generate-panel">
      {state.kind === 'running' && (
        <span className="gen-badge gen-running">
          <span className="gen-dot" aria-hidden="true" />
          {state.type ? `${REPORT_TYPE_LABEL[state.type]} 리포트 ` : ''}생성 중...
        </span>
      )}
      {state.kind === 'done' && <span className="gen-badge gen-done">생성 완료</span>}
      {state.kind === 'error' && (
        <span className="gen-badge gen-error" title={state.message}>
          생성 실패: {state.message}
        </span>
      )}
      <button
        type="button"
        className="btn-primary"
        onClick={() => void handleClick()}
        disabled={busy}
      >
        {busy ? '생성 중...' : `${REPORT_TYPE_LABEL[type]} 리포트 생성`}
      </button>
    </div>
  );
}
