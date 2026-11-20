import { describe, it, expect } from 'vitest';
import { itemImagePath } from '../../src/utils/itemImage';

describe('itemImagePath', () => {
  it('addresses the thumbnail with the version stamp', () => {
    expect(itemImagePath({ id: 'abc', image: '18f3a2' }, 'thumb')).toBe(
      '/api/simple_inventory/image/abc?thumb=1&v=18f3a2',
    );
  });

  it('addresses the tile with the version stamp', () => {
    expect(itemImagePath({ id: 'abc', image: '18f3a2' }, 'tile')).toBe(
      '/api/simple_inventory/image/abc?tile=1&v=18f3a2',
    );
  });

  it('addresses the full image without a size parameter', () => {
    expect(itemImagePath({ id: 'abc', image: '18f3a2' }, 'full')).toBe(
      '/api/simple_inventory/image/abc?v=18f3a2',
    );
  });

  it('encodes the id and the stamp', () => {
    expect(itemImagePath({ id: 'a/b c', image: 'x&y' }, 'thumb')).toBe(
      '/api/simple_inventory/image/a%2Fb%20c?thumb=1&v=x%26y',
    );
  });

  it('is null without an image or without an id', () => {
    expect(itemImagePath({ id: 'abc', image: '' }, 'thumb')).toBeNull();
    expect(itemImagePath({ id: 'abc' }, 'full')).toBeNull();
    expect(itemImagePath({ image: '18f3a2' }, 'tile')).toBeNull();
  });
});
