/**
 * A string field of a `callWS` rejection: top-level (`{code, message}`), or nested in a HAWS
 * result message (`{type: 'result', success: false, error: {code, message}}`, e.g. a dropped
 * connection).
 */
export function wsErrorField(error: unknown, field: 'code' | 'message'): string {
  if (error === null || typeof error !== 'object') return '';
  const nested: unknown = Reflect.get(error, 'error');
  for (const source of [error, nested]) {
    if (source !== null && typeof source === 'object') {
      const value: unknown = Reflect.get(source, field);
      if (typeof value === 'string') return value;
    }
  }
  return '';
}
