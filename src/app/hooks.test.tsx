// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAntiguedad } from './hooks';

describe('useAntiguedad', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve null sin datos y se actualiza cada 500 ms', () => {
    let reloj = 10_000;
    const { result, rerender } = renderHook(
      ({ ultimo }: { ultimo: number | null }) => useAntiguedad(ultimo, () => reloj),
      { initialProps: { ultimo: null as number | null } },
    );
    expect(result.current).toBeNull();

    rerender({ ultimo: 10_000 });
    expect(result.current).toBe(0);

    reloj = 12_500;
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(2500);
  });
});
