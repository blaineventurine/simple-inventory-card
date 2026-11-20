import { describe, it, expect } from 'vitest';
import { NO_CAPABILITIES, capabilitiesFrom } from '../../src/types/cardContext';

describe('capabilitiesFrom', () => {
  it('reports tile images when the integration lists tile_images', () => {
    expect(capabilitiesFrom(['item_images', 'tile_images']).tileImages).toBe(true);
  });

  it('has no tile images without the feature', () => {
    expect(capabilitiesFrom(['item_images']).tileImages).toBe(false);
    expect(NO_CAPABILITIES.tileImages).toBe(false);
  });
});
