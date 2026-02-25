import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('단일 클래스를 반환한다', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('여러 클래스를 병합한다', () => {
    expect(cn('p-4', 'mt-2')).toBe('p-4 mt-2');
  });

  it('Tailwind 충돌 클래스를 후자 우선으로 병합한다', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('falsy 값을 무시한다', () => {
    expect(cn('p-4', undefined, null, false, 'mt-2')).toBe('p-4 mt-2');
  });

  it('조건부 클래스를 처리한다', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('빈 입력은 빈 문자열을 반환한다', () => {
    expect(cn()).toBe('');
  });
});
