import { describe, it, expect } from 'vitest';
import { calculateDelta, formatDelta, getDeltaColor } from './dashboard-utils';

describe('calculateDelta', () => {
  it('양수 증감을 계산한다', () => {
    expect(calculateDelta(120, 100)).toEqual({ value: 20, percent: 20 });
  });

  it('음수 증감을 계산한다', () => {
    expect(calculateDelta(80, 100)).toEqual({ value: -20, percent: -20 });
  });

  it('전월이 0이면 percent는 null', () => {
    expect(calculateDelta(50, 0)).toEqual({ value: 50, percent: null });
  });

  it('동일하면 0%', () => {
    expect(calculateDelta(100, 100)).toEqual({ value: 0, percent: 0 });
  });

  it('전월이 undefined면 null 반환', () => {
    expect(calculateDelta(100, undefined)).toBeNull();
  });
});

describe('formatDelta', () => {
  it('양수면 ▲ 접두사', () => {
    expect(formatDelta(20)).toBe('▲ 20%');
  });

  it('음수면 ▼ 접두사', () => {
    expect(formatDelta(-15)).toBe('▼ 15%');
  });

  it('0이면 — 표시', () => {
    expect(formatDelta(0)).toBe('—');
  });

  it('null이면 빈 문자열', () => {
    expect(formatDelta(null)).toBe('');
  });
});

describe('getDeltaColor', () => {
  it('양수면 text-success', () => {
    expect(getDeltaColor(20)).toBe('text-success');
  });

  it('음수면 text-destructive', () => {
    expect(getDeltaColor(-15)).toBe('text-destructive');
  });

  it('0이면 text-muted-foreground', () => {
    expect(getDeltaColor(0)).toBe('text-muted-foreground');
  });

  it('null이면 text-muted-foreground', () => {
    expect(getDeltaColor(null)).toBe('text-muted-foreground');
  });
});
