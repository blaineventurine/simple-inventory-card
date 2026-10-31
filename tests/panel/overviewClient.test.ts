import { describe, it, expect, vi } from 'vitest';
import { fetchOverview } from '../../src/panel/home/overviewClient';
import { WS_COMMANDS } from '../../src/utils/constants';
import { createMockHomeAssistant } from '../testHelpers';
import { overview, summary } from './overviewFixtures';

describe('fetchOverview', () => {
  it('returns the overview the integration reports', async () => {
    const hass = createMockHomeAssistant({});
    const answer = overview({ inventories: [summary({ id: 'k', name: 'Kitchen' })] });
    hass.callWS = vi.fn().mockResolvedValue(answer);

    await expect(fetchOverview(hass)).resolves.toEqual({ status: 'ok', overview: answer });
    expect(hass.callWS).toHaveBeenCalledWith({ type: WS_COMMANDS.OVERVIEW });
  });

  it('maps a top-level error', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockRejectedValue({ code: 'unknown_error', message: 'Boom' });

    await expect(fetchOverview(hass)).resolves.toEqual({ status: 'error', message: 'Boom' });
  });

  it('maps the nested error of a HAWS result message', async () => {
    const hass = createMockHomeAssistant({});
    hass.callWS = vi.fn().mockRejectedValue({
      type: 'result',
      success: false,
      error: { code: 3, message: 'Connection lost' },
    });

    await expect(fetchOverview(hass)).resolves.toEqual({
      status: 'error',
      message: 'Connection lost',
    });
  });
});
