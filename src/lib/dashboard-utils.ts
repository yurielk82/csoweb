export interface DeltaResult {
  value: number;
  percent: number | null;
}

/** 이번 달과 전월의 차이를 계산한다 */
export function calculateDelta(
  current: number,
  previous: number | undefined,
): DeltaResult | null {
  if (previous === undefined) return null;
  const value = current - previous;
  const percent = previous === 0 ? null : Math.round((value / previous) * 100);
  return { value, percent };
}

/** 증감 퍼센트를 포맷한다: ▲ 20%, ▼ 15%, —, '' */
export function formatDelta(percent: number | null): string {
  if (percent === null) return '';
  if (percent === 0) return '—';
  if (percent > 0) return `▲ ${percent}%`;
  return `▼ ${Math.abs(percent)}%`;
}

/** 증감 방향에 따른 CSS 클래스 */
export function getDeltaColor(percent: number | null): string {
  if (percent === null || percent === 0) return 'text-muted-foreground';
  return percent > 0 ? 'text-success' : 'text-destructive';
}
