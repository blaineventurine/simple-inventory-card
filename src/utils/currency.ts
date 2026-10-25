/**
 * HA's currency format for `currency` (the instance's currency) in `language`; a plain number
 * with 2 decimals when there is no currency or it is not a valid currency code.
 */
export function valueFormatter(
  language: string,
  currency: string | undefined,
): (value: number) => string {
  if (currency) {
    try {
      const format = new Intl.NumberFormat(language, { style: 'currency', currency });
      return (value) => format.format(value);
    } catch {
      // An invalid currency code: the plain format below.
    }
  }
  const plain = new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (value) => plain.format(value);
}
