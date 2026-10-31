import { describe, it, expect, vi } from 'vitest';
import {
  MIN_API_VERSION,
  checkBackendCompatibility,
  createCompatibilityBanner,
} from '../../src/utils/backendCompatibility';
import { Services } from '../../src/services/services';

function servicesWith(getInfo: () => Promise<unknown>): Services {
  // Test seam: only getInfo is exercised by checkBackendCompatibility.
  return { getInfo: vi.fn(getInfo) } as unknown as Services;
}

describe('checkBackendCompatibility', () => {
  it('is ok when the backend reports the minimum api_version', async () => {
    const info = { version: '0.7.0', api_version: MIN_API_VERSION, features: ['batches'] };
    const result = await checkBackendCompatibility(servicesWith(async () => info));

    expect(result).toEqual({ status: 'ok', info });
  });

  it('is outdated when the backend reports a lower api_version', async () => {
    const result = await checkBackendCompatibility(
      servicesWith(async () => ({ version: '0.6.5', api_version: 1, features: [] })),
    );

    expect(result).toEqual({ status: 'outdated', version: '0.6.5' });
  });

  it('is outdated with unknown version when get_info does not exist (backend < 0.7.0)', async () => {
    const result = await checkBackendCompatibility(
      servicesWith(async () => {
        throw { code: 'unknown_command', message: 'Unknown command.' };
      }),
    );

    expect(result).toEqual({ status: 'outdated', version: null });
  });

  it('is unknown (no banner) for other failures such as a dropped connection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await checkBackendCompatibility(
      servicesWith(async () => {
        throw { code: 3, message: 'Connection lost' };
      }),
    );

    expect(result).toEqual({ status: 'unknown' });
    expect(createCompatibilityBanner(result, {})).toBe('');
    warn.mockRestore();
  });
});

describe('createCompatibilityBanner', () => {
  const translations = {
    compatibility: {
      backend_outdated:
        'Simple Inventory integration {version} is too old for this card; update to {minimum} or newer.',
      unknown_version: 'older than {minimum}',
    },
  };

  it('renders nothing when compatible', () => {
    const info = { version: '0.7.0', api_version: MIN_API_VERSION, features: [] };
    expect(createCompatibilityBanner({ status: 'ok', info }, translations)).toBe('');
  });

  it('names the reported version and the minimum', () => {
    const html = createCompatibilityBanner({ status: 'outdated', version: '0.6.5' }, translations);

    expect(html).toContain('id="compat-banner"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      'Simple Inventory integration 0.6.5 is too old for this card; update to 0.7.0 or newer.',
    );
  });

  it('describes an unknown version', () => {
    const html = createCompatibilityBanner({ status: 'outdated', version: null }, translations);

    expect(html).toContain('integration older than 0.7.0 is too old');
  });

  it('escapes the backend-reported version', () => {
    const html = createCompatibilityBanner(
      { status: 'outdated', version: '<img src=x onerror=alert(1)>' },
      translations,
    );

    expect(html).not.toContain('<img');
  });

  it('accepts a newer api_version (0.8.0 with batches) and an older one without features', async () => {
    const batches = { version: '0.8.0', api_version: 3, features: ['batches'] };
    const plain = { version: '0.7.0', api_version: 2, features: [] };

    expect(await checkBackendCompatibility(servicesWith(async () => batches))).toEqual({
      status: 'ok',
      info: batches,
    });
    expect(await checkBackendCompatibility(servicesWith(async () => plain))).toEqual({
      status: 'ok',
      info: plain,
    });
    expect(MIN_API_VERSION).toBe(2);
  });
});
