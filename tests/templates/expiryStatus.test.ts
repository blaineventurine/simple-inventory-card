import { describe, it, expect } from 'vitest';
import { expiryTone } from '../../src/templates/expiryStatus';

describe('expiryTone', () => {
  it.each([
    ['expired', 'error'],
    ['expires-today', 'warning'],
    ['expiring-soon', 'warning'],
    ['expiry-safe', undefined],
  ])('maps %s to %s', (statusClass, tone) => {
    expect(expiryTone({ class: statusClass, label: '' })).toBe(tone);
  });
});
