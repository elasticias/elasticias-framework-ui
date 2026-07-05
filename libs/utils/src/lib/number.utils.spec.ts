import { describe, expect, it } from 'vitest';
import { NumberUtils } from './number.utils';

describe('NumberUtils.compact', () => {
  it('formats thousands with the "k" unit', () => {
    expect(NumberUtils.compact(1000)).toBe('1 k');
  });

  it('formats millions with the "M" unit, comma decimal', () => {
    expect(NumberUtils.compact(2_500_000)).toBe('2,5 M');
  });

  it('rounds to maxDecimals (default 2) and strips trailing zeros', () => {
    expect(NumberUtils.compact(4_181_078.55)).toBe('4,18 M');
  });

  it('leaves values below 1000 as a plain localized number', () => {
    expect(NumberUtils.compact(999)).toBe('999');
  });

  it('re-scales to the next unit when rounding at the boundary would overflow', () => {
    expect(NumberUtils.compact(999_999.9, { maxDecimals: 1 })).toBe('1 M');
  });

  it('keeps the sign for negative values', () => {
    expect(NumberUtils.compact(-2_500_000)).toBe('-2,5 M');
  });

  it('formats zero as "0"', () => {
    expect(NumberUtils.compact(0)).toBe('0');
  });

  it('formats 1250 as 1,25 k', () => {
    expect(NumberUtils.compact(1_250)).toBe('1,25 k');
  });

  it('formats billions with the "Md" unit', () => {
    expect(NumberUtils.compact(3_000_000_000)).toBe('3 Md');
  });

  it('returns an empty string for NaN', () => {
    expect(NumberUtils.compact(NaN)).toBe('');
  });

  it('returns an empty string for Infinity', () => {
    expect(NumberUtils.compact(Infinity)).toBe('');
    expect(NumberUtils.compact(-Infinity)).toBe('');
  });

  it('strips a trailing zero after scaling (2.50 -> "2,5")', () => {
    expect(NumberUtils.compact(2_500)).toBe('2,5 k');
  });

  it('strips all decimals when the scaled value is a whole number (1.00 -> "1")', () => {
    expect(NumberUtils.compact(1_000_000)).toBe('1 M');
  });

  it('respects a custom maxDecimals', () => {
    expect(NumberUtils.compact(4_181_078.55, { maxDecimals: 3 })).toBe('4,181 M');
  });

  it('respects a custom locale', () => {
    expect(NumberUtils.compact(2_500_000, { locale: 'en-US' })).toBe('2.5 M');
  });
});
