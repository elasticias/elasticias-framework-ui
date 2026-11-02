import { describe, expect, it } from 'vitest';
import { PhoneUtils } from './phone.utils';

describe('PhoneUtils.toE164', () => {
  it('turns a Moroccan national number into E.164 with the default calling code', () => {
    expect(PhoneUtils.toE164('0612345678', '212')).toBe('+212612345678');
    expect(PhoneUtils.toE164('06 12-34-56-78', '+212')).toBe('+212612345678');
  });

  it('turns a French national number into E.164 with the default calling code', () => {
    expect(PhoneUtils.toE164('06 12 34 56 78', '33')).toBe('+33612345678');
    expect(PhoneUtils.toE164('01.23.45.67.89', '+33')).toBe('+33123456789');
  });

  it('keeps an already-international number, whatever the default', () => {
    expect(PhoneUtils.toE164('+212 6 12-34-56-78', '33')).toBe('+212612345678');
    expect(PhoneUtils.toE164('00212 612 345 678', '33')).toBe('+212612345678');
    expect(PhoneUtils.toE164('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(PhoneUtils.toE164('212612345678', '212')).toBe('+212612345678');
  });

  it('replaces a single trunk 0 only, never an international 00', () => {
    expect(PhoneUtils.toE164('0033612345678', '212')).toBe('+33612345678');
  });

  it('cannot make a national number international without a default calling code', () => {
    expect(PhoneUtils.toE164('0612345678')).toBeNull();
    expect(PhoneUtils.toE164('0612345678', '')).toBeNull();
    expect(PhoneUtils.toE164('0612345678', 'abc')).toBeNull();
  });

  it('returns null for junk', () => {
    expect(PhoneUtils.toE164(null, '212')).toBeNull();
    expect(PhoneUtils.toE164(undefined, '212')).toBeNull();
    expect(PhoneUtils.toE164('', '212')).toBeNull();
    expect(PhoneUtils.toE164('   ', '212')).toBeNull();
    expect(PhoneUtils.toE164('+ - ( )', '212')).toBeNull();
    expect(PhoneUtils.toE164('abc', '212')).toBeNull();
    expect(PhoneUtils.toE164('0', '212')).toBeNull();
    expect(PhoneUtils.toE164('123', '212')).toBeNull();
    // E.164 allows at most 15 digits.
    expect(PhoneUtils.toE164('+1234567890123456', '212')).toBeNull();
  });
});
