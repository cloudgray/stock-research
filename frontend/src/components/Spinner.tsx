interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label = '불러오는 중...' }: SpinnerProps) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
