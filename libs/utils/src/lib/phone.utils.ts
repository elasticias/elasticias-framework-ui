/** E.164 caps a number at 15 digits; anything under 8 is not a callable number. */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export class PhoneUtils {
  /**
   * A phone number as typed (spaces, dots, dashes, brackets) in E.164 form,
   * `+` followed by digits, or null when it cannot be one.
   *
   * - An international prefix is kept: a leading `+` or `00`.
   * - A single leading national trunk `0` is replaced by `defaultCallingCode`
   *   (`'212'` or `'+212'`): Moroccan `0612345678` becomes `+212612345678`,
   *   French `01 23 45 67 89` with `'33'` becomes `+33123456789`.
   * - Digits without a prefix or trunk `0` are read as already international.
   * - A national number with no usable default, or junk, gives null.
   *
   * wa.me and other links that need the international number take the
   * result without its `+`.
   */
  static toE164(phone: string | null | undefined, defaultCallingCode?: string | null): string | null {
    const raw = (phone ?? '').trim();
    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;

    if (raw.startsWith('+')) {
      // already international
    } else if (digits.startsWith('00')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
      const code = (defaultCallingCode ?? '').replace(/\D/g, '');
      if (!code) return null;
      digits = code + digits.slice(1);
    }

    if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
    return `+${digits}`;
  }
}
