import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ItemActions } from '../../src/services/itemActions';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { HistoryHandler } from '../../src/services/historyHandler';
import { ImageViewer } from '../../src/services/imageViewer';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import { InventoryItem } from '../../src/types/inventory';
import { createMockCardContext } from '../testHelpers';

vi.mock('../../src/utils/inventoryResolver');

const milk: InventoryItem = {
  id: 'm1',
  name: 'Milk',
  quantity: 2,
  unit: '',
  category: '',
  location: '',
  expiry_date: '',
  todo_list: '',
  auto_add_enabled: false,
  auto_add_id_to_description_enabled: false,
  description: '',
  image: 'v1',
};

describe('ItemActions', () => {
  let services: {
    incrementItem: Mock;
    decrementItem: Mock;
    removeItem: Mock;
    transferItem: Mock;
  };
  let refresh: () => void;
  let openEditModal: Mock;
  let showItemHistory: Mock;

  /** Actions with no DOM, as a dashboard tile would build them. */
  const createActions = (imageViewer?: ImageViewer): ItemActions =>
    new ItemActions({
      getContext: () => createMockCardContext({ items: [milk] }),
      services: services as unknown as Services,
      refresh,
      modals: { openEditModal } as unknown as Modals,
      historyHandler: { showItemHistory } as unknown as HistoryHandler,
      imageViewer,
    });

  beforeEach(() => {
    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('inv');
    services = {
      incrementItem: vi.fn().mockResolvedValue({ success: true }),
      decrementItem: vi.fn().mockResolvedValue({ success: true }),
      removeItem: vi.fn().mockResolvedValue({ success: true }),
      transferItem: vi.fn().mockResolvedValue({ success: true }),
    };
    refresh = vi.fn();
    openEditModal = vi.fn();
    showItemHistory = vi.fn().mockResolvedValue(undefined);
    globalThis.confirm = vi.fn().mockReturnValue(true);
  });

  it('increments, decrements and takes from a batch by name, then refreshes', async () => {
    const actions = createActions();

    expect(await actions.increment('Milk')).toEqual({ success: true });
    expect(await actions.decrement('Milk')).toEqual({ success: true });
    expect(await actions.takeFromBatch('Milk', 'b1', 0.5)).toEqual({ success: true });

    expect(services.incrementItem).toHaveBeenCalledWith('inv', 'Milk');
    expect(services.decrementItem).toHaveBeenCalledWith('inv', 'Milk');
    expect(services.decrementItem).toHaveBeenCalledWith('inv', 'Milk', 0.5, { batchId: 'b1' });
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('returns a failed +, −, take-one or remove and still refreshes', async () => {
    const failure = { success: false, error: 'Item not found', errorCode: 'item_not_found' };
    services.incrementItem.mockResolvedValue(failure);
    services.decrementItem.mockResolvedValue(failure);
    services.removeItem.mockResolvedValue(failure);
    const actions = createActions();

    expect(await actions.increment('Milk')).toEqual(failure);
    expect(await actions.decrement('Milk')).toEqual(failure);
    expect(await actions.takeFromBatch('Milk', 'gone', 1)).toEqual(failure);
    expect(await actions.remove('Milk')).toEqual(failure);

    expect(refresh).toHaveBeenCalledTimes(4);
  });

  it('removes only after the user confirms', async () => {
    const actions = createActions();
    vi.mocked(globalThis.confirm).mockReturnValue(false);

    expect(await actions.remove('Milk')).toEqual({ success: false, cancelled: true });
    expect(globalThis.confirm).toHaveBeenCalledWith('Remove Milk from inventory?');
    expect(services.removeItem).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    vi.mocked(globalThis.confirm).mockReturnValue(true);
    expect(await actions.remove('Milk')).toEqual({ success: true });
    expect(services.removeItem).toHaveBeenCalledWith('inv', 'Milk');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('restocks and moves, refreshing on success only and leaving failures to the caller', async () => {
    const actions = createActions();

    await actions.restock('Milk', 2, { location: 'Fridge' });
    await actions.move('Milk', 'b1', 1, 'Garage');
    expect(services.incrementItem).toHaveBeenCalledWith('inv', 'Milk', 2, { location: 'Fridge' });
    expect(services.transferItem).toHaveBeenCalledWith('inv', 'Milk', {
      batchId: 'b1',
      amount: 1,
      toLocation: 'Garage',
    });
    expect(refresh).toHaveBeenCalledTimes(2);

    services.incrementItem.mockResolvedValue({ success: false, error: 'bad' });
    services.transferItem.mockResolvedValue({ success: false, error: 'bad' });
    expect(await actions.restock('Milk', 1, {})).toEqual({ success: false, error: 'bad' });
    expect(await actions.move('Milk', 'b1', 1, 'Garage')).toEqual({
      success: false,
      error: 'bad',
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('opens the edit sheet and the history for the item', async () => {
    const actions = createActions();

    actions.openEdit('Milk');
    await actions.showHistory('Milk');

    expect(openEditModal).toHaveBeenCalledWith('Milk', expect.any(Function), {}, [], []);
    expect(showItemHistory).toHaveBeenCalledWith('Milk');
  });

  it('shows the photo without an opener, and reports when there is nothing to show', () => {
    const open = vi.fn();
    const viewer = { open } as unknown as ImageViewer;

    expect(createActions(viewer).viewImage('Milk')).toBe(true);
    expect(open).toHaveBeenCalledWith(
      { name: 'Milk', fullPath: expect.any(String), thumbPath: expect.any(String) },
      undefined,
      {},
    );
    expect(createActions(viewer).viewImage('Bread')).toBe(false);
    expect(createActions().viewImage('Milk')).toBe(false);
  });
});
