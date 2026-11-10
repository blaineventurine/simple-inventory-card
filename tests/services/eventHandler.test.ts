import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventHandler, EventHandlerDeps } from '../../src/services/eventHandler';
import { Services } from '../../src/services/services';
import { Modals } from '../../src/services/modals';
import { Utilities } from '../../src/utils/utilities';
import { InventoryResolver } from '../../src/utils/inventoryResolver';
import {
  ELEMENTS,
  ACTIONS,
  DEFAULTS,
  CSS_CLASSES,
  SORT_METHODS,
  BATCH_FIELDS,
} from '../../src/utils/constants';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import {
  createMockHomeAssistant,
  createMockHassEntity,
  createMockCardContext,
} from '../testHelpers';
import { holdTracker } from '../holdTracker';
import { TranslationData } from '@/types/translatableComponent';
import { State } from '../../src/services/state';
import { ImageLoader } from '../../src/services/imageLoader';
import { createSortOptions } from '../../src/templates/sortOptions';

vi.mock('../../src/services/services');
vi.mock('../../src/services/modals');
vi.mock('../../src/services/filters');
vi.mock('../../src/services/barcodeScanner', () => ({
  startScanner: vi.fn().mockResolvedValue(null),
  stopScanner: vi.fn(),
  isScannerActive: vi.fn().mockReturnValue(false),
}));
vi.mock('../../src/utils/utilities');
vi.mock('../../src/utils/inventoryResolver');

describe('EventHandler', () => {
  let eventHandler: EventHandler;
  let mockConfig: InventoryConfig;
  let mockFilters: any;
  let mockHass: HomeAssistant;
  let mockModals: Modals;
  let mockRenderCallback: () => void;
  let mockRenderRoot: ShadowRoot;
  let mockServices: Services;
  let mockTranslations: TranslationData;
  let state: State;
  let mockUpdateItemsCallback: (items: InventoryItem[], sortMethod: string) => void;
  let holds: ReturnType<typeof holdTracker>;

  const mockInventoryItems: InventoryItem[] = [
    {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      category: 'Food',
      description: 'A test item',
      expiry_date: '2024-12-31',
      location: 'Pantry',
      name: 'Test Item',
      quantity: 5,
      todo_list: 'shopping',
      unit: 'pieces',
    },
  ];

  /** An EventHandler over the test doubles; its context reads them when used. */
  const createHandler = (extra: Partial<EventHandlerDeps> = {}): EventHandler =>
    new EventHandler({
      renderRoot: mockRenderRoot,
      services: mockServices,
      modals: mockModals,
      filters: mockFilters,
      state,
      getContext: () =>
        createMockCardContext({
          hass: mockHass,
          config: mockConfig,
          translations: mockTranslations,
          items: mockInventoryItems,
        }),
      renderCallback: mockRenderCallback,
      updateItemsCallback: mockUpdateItemsCallback,
      hold: holds.hold,
      ...extra,
    });

  /** Puts `html` under the render root and returns its first element. */
  function mount(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const first = template.content.firstElementChild;
    if (!(first instanceof HTMLElement)) {
      throw new Error('nothing to mount');
    }
    mockRenderRoot.append(template.content);
    return first;
  }

  /** The element matching `selector` under `root`. */
  function element(root: ParentNode, selector: string): HTMLElement {
    const found = root.querySelector(selector);
    if (!(found instanceof HTMLElement)) {
      throw new Error(`missing ${selector}`);
    }
    return found;
  }

  /** Lets a dispatched handler run through its awaits on settled promises (no timers). */
  async function settle(): Promise<void> {
    for (let turn = 0; turn < 50; turn += 1) {
      await Promise.resolve();
    }
  }

  /** A real click on `target`, through the render root's listeners. */
  async function click(target: Element): Promise<{ prevented: boolean; stopped: boolean }> {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    const stopPropagation = vi.spyOn(event, 'stopPropagation');
    target.dispatchEvent(event);
    await settle();
    return { prevented: event.defaultPrevented, stopped: stopPropagation.mock.calls.length > 0 };
  }

  /** A real key press on `target`; true when the handler prevented its default. */
  async function press(target: Element, key: string): Promise<boolean> {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    target.dispatchEvent(event);
    await settle();
    return event.defaultPrevented;
  }

  let host: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.appendChild(host);
    mockRenderRoot = host.attachShadow({ mode: 'open' });
    vi.spyOn(mockRenderRoot, 'addEventListener');
    vi.spyOn(mockRenderRoot, 'removeEventListener');
    vi.spyOn(mockRenderRoot, 'querySelector');
    vi.spyOn(mockRenderRoot, 'querySelectorAll');

    mockTranslations = {
      items: {
        no_items: 'No items in inventory',
      },
    };

    mockServices = {
      incrementItem: vi.fn().mockResolvedValue({ success: true }),
      decrementItem: vi.fn().mockResolvedValue({ success: true }),
      removeItem: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Services;

    mockModals = {
      openAddModal: vi.fn(),
      closeAddModal: vi.fn(),
      openEditModal: vi.fn(),
      closeEditModal: vi.fn(),
      addItem: vi.fn(),
      saveEditModal: vi.fn(),
      handleModalClick: vi.fn(),
    } as unknown as Modals;

    mockFilters = {
      getCurrentFilters: vi.fn().mockReturnValue({
        category: [],
        expiry: '',
        location: [],
        quantity: '',
        searchText: '',
        showAdvanced: false,
        sortMethod: 'name',
      }),
      saveFilters: vi.fn(),
      clearFilters: vi.fn(),
      filterItems: vi.fn((items) => items),
      sortItems: vi.fn((items) => items),
      scheduleSearch: vi.fn(),
      updateFilterIndicators: vi.fn(),
    };
    mockHass = createMockHomeAssistant({
      'sensor.test_inventory': createMockHassEntity('sensor.test_inventory', {
        attributes: { items: mockInventoryItems },
      }),
    });

    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockRenderCallback = vi.fn();
    mockUpdateItemsCallback = vi.fn();

    vi.mocked(InventoryResolver.getInventoryId).mockReturnValue('test-inventory-id');
    vi.mocked(Utilities.validateInventoryItems).mockReturnValue(mockInventoryItems);

    globalThis.confirm = vi.fn();
    globalThis.alert = vi.fn();

    state = new State();
    holds = holdTracker();
    eventHandler = createHandler();
  });

  afterEach(() => {
    eventHandler.cleanupEventListeners();
    host.remove();
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(eventHandler['renderRoot']).toBe(mockRenderRoot);
      expect(eventHandler['services']).toBe(mockServices);
      expect(eventHandler['modals']).toBe(mockModals);
      expect(eventHandler['filters']).toBe(mockFilters);
      expect(eventHandler['getContext']().config).toBe(mockConfig);
      expect(eventHandler['getContext']().hass).toBe(mockHass);
      expect(eventHandler['renderCallback']).toBe(mockRenderCallback);
      expect(eventHandler['updateItemsCallback']).toBe(mockUpdateItemsCallback);
    });

    it('should initialize with default state', () => {
      expect(eventHandler['boundClickHandler']).toBe(undefined);
      expect(eventHandler['boundChangeHandler']).toBe(undefined);
      expect(eventHandler['boundKeydownHandler']).toBe(undefined);
      expect(eventHandler['eventListenersSetup']).toBe(false);
    });
  });

  describe('setupEventListeners', () => {
    it('should setup event listeners when not already setup', () => {
      eventHandler.setupEventListeners();

      expect(mockRenderRoot.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockRenderRoot.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockRenderRoot.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockRenderRoot.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(eventHandler['eventListenersSetup']).toBe(true);
    });

    it('should not setup event listeners if already setup', () => {
      eventHandler.setupEventListeners();
      vi.clearAllMocks();

      eventHandler.setupEventListeners();

      expect(mockRenderRoot.addEventListener).not.toHaveBeenCalled();
    });

    it('schedules a live search for typing in whichever search box is rendered', () => {
      eventHandler.setupEventListeners();
      const onInput = vi
        .mocked(mockRenderRoot.addEventListener)
        .mock.calls.find((call) => call[0] === 'input')?.[1];
      if (typeof onInput !== 'function') throw new Error('no input listener');
      const search = document.createElement('input');
      search.id = ELEMENTS.SEARCH_INPUT;
      search.value = 'mil';
      const other = document.createElement('input');
      other.id = 'add-name';

      onInput({ target: other } as unknown as Event);
      expect(mockFilters.scheduleSearch).not.toHaveBeenCalled();

      onInput({ target: search } as unknown as Event);
      expect(mockFilters.scheduleSearch).toHaveBeenCalledWith(
        mockConfig.entity,
        'mil',
        expect.any(Function),
      );
    });
  });

  describe('cleanupEventListeners', () => {
    it('should remove the exact click, change, keydown and input listeners that were added', () => {
      eventHandler.setupEventListeners();

      const addCalls = vi.mocked(mockRenderRoot.addEventListener).mock.calls;
      const clickHandler = addCalls.find((call) => call[0] === 'click')?.[1];
      const changeHandler = addCalls.find((call) => call[0] === 'change')?.[1];
      const keydownHandler = addCalls.find((call) => call[0] === 'keydown')?.[1];
      const inputHandler = addCalls.find((call) => call[0] === 'input')?.[1];

      eventHandler.cleanupEventListeners();

      expect(mockRenderRoot.removeEventListener).toHaveBeenCalledWith('click', clickHandler);
      expect(mockRenderRoot.removeEventListener).toHaveBeenCalledWith('change', changeHandler);
      expect(mockRenderRoot.removeEventListener).toHaveBeenCalledWith('keydown', keydownHandler);
      expect(mockRenderRoot.removeEventListener).toHaveBeenCalledWith('input', inputHandler);
      expect(eventHandler['eventListenersSetup']).toBe(false);
    });

    it('should reset bound handler references to undefined after cleanup', () => {
      eventHandler.setupEventListeners();
      eventHandler.cleanupEventListeners();

      expect(eventHandler['boundClickHandler']).toBe(undefined);
      expect(eventHandler['boundChangeHandler']).toBe(undefined);
      expect(eventHandler['boundKeydownHandler']).toBe(undefined);
      expect(eventHandler['boundInputHandler']).toBe(undefined);
    });

    it('should handle cleanup when no bound handlers exist', () => {
      eventHandler.cleanupEventListeners();

      expect(mockRenderRoot.removeEventListener).not.toHaveBeenCalled();
      expect(eventHandler['eventListenersSetup']).toBe(false);
    });
  });

  describe('context', () => {
    it('reads config and hass at the moment of use', () => {
      mockConfig = { ...mockConfig, entity: 'sensor.new_inventory' };
      mockHass = createMockHomeAssistant({
        'sensor.new_inventory': createMockHassEntity('sensor.new_inventory'),
      });

      eventHandler['handleSearchChange']();

      expect(mockFilters.getCurrentFilters).toHaveBeenCalledWith('sensor.new_inventory');
      expect(mockUpdateItemsCallback).toHaveBeenCalled();
    });
  });

  describe('click dispatch', () => {
    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    describe('button with data-processing attribute', () => {
      it('should prevent event and return early', async () => {
        const button = mount(
          `<button type="button" data-processing="true" data-action="${ACTIONS.INCREMENT}" data-name="Test Item"></button>`,
        );

        const result = await click(button);

        expect(result).toEqual({ prevented: true, stopped: true });
        expect(mockServices.incrementItem).not.toHaveBeenCalled();
      });
    });

    describe('item actions', () => {
      it('should handle item actions', async () => {
        const button = mount(
          `<button type="button" data-action="${ACTIONS.INCREMENT}" data-name="Test Item"><ha-icon></ha-icon></button>`,
        );

        const result = await click(element(button, 'ha-icon'));

        expect(result).toEqual({ prevented: true, stopped: true });
        expect(mockServices.incrementItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });
    });

    describe('modal clicks', () => {
      it('should handle modal clicks and return early if handled', async () => {
        const button = mount(
          `<button type="button" data-action="${ACTIONS.OPEN_ADD_MODAL}"></button>`,
        );
        vi.mocked(mockModals.handleModalClick).mockReturnValue(true);

        const result = await click(button);

        expect(mockModals.handleModalClick).toHaveBeenCalledWith(expect.any(MouseEvent));
        expect(result.prevented).toBe(false);
        expect(mockModals.openAddModal).not.toHaveBeenCalled();
      });

      it('consults the sheet chrome before running an action', async () => {
        mockModals.addBatchRow = vi.fn();
        const order: string[] = [];
        vi.mocked(mockModals.handleModalClick).mockImplementation(() => {
          order.push('modal');
          return false;
        });
        vi.mocked(mockModals.addBatchRow).mockImplementation(() => {
          order.push('action');
        });
        const button = mount(
          `<button type="button" data-action="${ACTIONS.ADD_BATCH_ROW}" data-batch-add></button>`,
        );

        await click(button);

        expect(order).toEqual(['modal', 'action']);
      });

      it('warns about an action nothing handles', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const button = mount(`<button type="button" data-action="unknown"></button>`);

        await click(button);

        expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown action: unknown');
        consoleWarnSpy.mockRestore();
      });
    });

    describe('specific button actions', () => {
      it('should handle open add modal button', async () => {
        const button = mount(
          `<button type="button" id="${ELEMENTS.OPEN_ADD_MODAL}" data-action="${ACTIONS.OPEN_ADD_MODAL}"></button>`,
        );

        const result = await click(button);

        expect(mockModals.openAddModal).toHaveBeenCalled();
        expect(result.prevented).toBe(true);
      });

      it('offers stocked-only batch locations to the add modal', async () => {
        mockInventoryItems.push({
          ...mockInventoryItems[0],
          name: 'Batched',
          stocked_locations: ['Pantry', ' Garage Freezer '],
        });
        const button = mount(
          `<button type="button" data-action="${ACTIONS.OPEN_ADD_MODAL}"></button>`,
        );

        try {
          await click(button);
        } finally {
          mockInventoryItems.pop();
        }

        expect(vi.mocked(mockModals.openAddModal).mock.calls[0][1]).toEqual([
          'Garage Freezer',
          'Pantry',
        ]);
      });

      it('should handle add item button', async () => {
        vi.mocked(mockModals.addItem).mockResolvedValue(true);
        const button = mount(
          `<button type="button" id="${ELEMENTS.ADD_ITEM_BTN}" class="save-btn" data-action="${ACTIONS.ADD_ITEM}"></button>`,
        );

        const result = await click(button);

        expect(mockModals.addItem).toHaveBeenCalledWith(mockConfig);
        expect(result.prevented).toBe(true);
      });

      it('should close modal on successful add', async () => {
        vi.mocked(mockModals.addItem).mockResolvedValue(true);

        await click(mount(`<button type="button" data-action="${ACTIONS.ADD_ITEM}"></button>`));

        expect(mockModals.addItem).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeAddModal).toHaveBeenCalled();
      });

      it('should not close modal on failed add', async () => {
        vi.mocked(mockModals.addItem).mockResolvedValue(false);

        await click(mount(`<button type="button" data-action="${ACTIONS.ADD_ITEM}"></button>`));

        expect(mockModals.addItem).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeAddModal).not.toHaveBeenCalled();
      });

      it('should guard against a rapid double-click on the add item button', async () => {
        const button = mount(
          `<button type="button" id="${ELEMENTS.ADD_ITEM_BTN}" data-action="${ACTIONS.ADD_ITEM}"></button>`,
        );
        let resolveAddItem: (value: boolean) => void = () => {};
        vi.mocked(mockModals.addItem).mockImplementation(
          () =>
            new Promise<boolean>((resolve) => {
              resolveAddItem = resolve;
            }),
        );

        // Two overlapping clicks, as a rapid double-click would fire them.
        const firstClick = click(button);
        const secondClick = click(button);

        resolveAddItem(true);
        await firstClick;
        await secondClick;

        expect(mockModals.addItem).toHaveBeenCalledTimes(1);
      });

      it('should handle advanced search toggle', async () => {
        const filterData = {
          category: [],
          expiry: [],
          location: [],
          quantity: [],
          searchText: '',
          showAdvanced: false,
          sortMethod: 'name',
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);
        const button = mount(
          `<button type="button" id="${ELEMENTS.ADVANCED_SEARCH_TOGGLE}" data-action="${ACTIONS.TOGGLE_ADVANCED_FILTERS}"><ha-icon></ha-icon></button>`,
        );

        const result = await click(button);

        expect(filterData.showAdvanced).toBe(true);
        expect(mockRenderCallback).toHaveBeenCalled();
        expect(result.prevented).toBe(true);
      });

      it('should handle clear filters button', async () => {
        const button = mount(
          `<button type="button" id="${ELEMENTS.CLEAR_FILTERS}" data-action="${ACTIONS.CLEAR_FILTERS}"></button>`,
        );

        const result = await click(button);

        expect(mockFilters.clearFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(result.prevented).toBe(true);
      });

      it('should close the filter panel from the apply button', async () => {
        const filterData = {
          category: [],
          expiry: [],
          location: [],
          quantity: [],
          searchText: '',
          showAdvanced: true,
          sortMethod: 'name',
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);
        const apply = mount(
          `<button type="button" id="${ELEMENTS.APPLY_FILTERS}" data-action="${ACTIONS.TOGGLE_ADVANCED_FILTERS}"><span>Apply</span></button>`,
        );

        const result = await click(element(apply, 'span'));

        expect(filterData.showAdvanced).toBe(false);
        expect(mockFilters.saveFilters).toHaveBeenCalledWith(mockConfig.entity, filterData);
        expect(mockRenderCallback).toHaveBeenCalled();
        expect(result.prevented).toBe(true);
      });

      it('should mirror the overflow menu state in aria-expanded on its trigger', async () => {
        mount(`<div>
          <button type="button" id="${ELEMENTS.OVERFLOW_MENU_BTN}" data-action="${ACTIONS.TOGGLE_OVERFLOW_MENU}" aria-expanded="false"></button>
          <div id="${ELEMENTS.OVERFLOW_MENU}" hidden>
            <button type="button" id="${ELEMENTS.EXPORT_INVENTORY}" data-action="${ACTIONS.EXPORT_INVENTORY}"><span>Export</span></button>
          </div>
        </div>`);
        const trigger = element(mockRenderRoot, `#${ELEMENTS.OVERFLOW_MENU_BTN}`);
        const menu = element(mockRenderRoot, `#${ELEMENTS.OVERFLOW_MENU}`);
        const handleExport = vi
          .spyOn(eventHandler['importExportHandler'], 'handleExport')
          .mockResolvedValue(undefined);

        await click(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');

        await click(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        await click(trigger);
        await click(element(menu, 'span'));
        expect(handleExport).toHaveBeenCalled();
        expect(menu.hidden).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
      });
    });

    describe('active filter chip removal', () => {
      function clickRemove(key: string) {
        const remove = mount(
          `<button type="button" data-action="${ACTIONS.REMOVE_FILTER}" data-filter-remove="${key}"><ha-icon></ha-icon></button>`,
        );
        return click(element(remove, 'ha-icon'));
      }

      it('clears the category filter and re-renders', async () => {
        const filterData = {
          category: ['Food'],
          expiry: [],
          location: ['Pantry'],
          quantity: [],
          searchText: '',
          showAdvanced: false,
          sortMethod: 'name',
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        const result = await clickRemove('category');

        expect(filterData.category).toEqual([]);
        expect(filterData.location).toEqual(['Pantry']);
        expect(mockFilters.saveFilters).toHaveBeenCalledWith(mockConfig.entity, filterData);
        expect(mockRenderCallback).toHaveBeenCalled();
        expect(result.stopped).toBe(true);
      });

      it('clears the search text', async () => {
        const filterData = {
          category: [],
          expiry: ['soon'],
          location: [],
          quantity: [],
          searchText: 'milk',
          showAdvanced: false,
          sortMethod: 'name',
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        await clickRemove('search');

        expect(filterData.searchText).toBe('');
        expect(filterData.expiry).toEqual(['soon']);
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('ignores unknown filter keys', async () => {
        await clickRemove('sortMethod');

        expect(mockFilters.saveFilters).not.toHaveBeenCalled();
        expect(mockRenderCallback).not.toHaveBeenCalled();
      });
    });

    describe('header expiry chips', () => {
      it.each([
        [ELEMENTS.HEADER_EXPIRED_BADGE, 'expired'],
        [ELEMENTS.HEADER_EXPIRING_BADGE, 'soon'],
      ])('%s filters by expiry %s, and a second tap clears it', async (id, value) => {
        const filterData = {
          category: [],
          expiry: [] as string[],
          location: [],
          quantity: [],
          searchText: '',
          showAdvanced: false,
          sortMethod: 'name',
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);
        const chip = mount(
          `<button type="button" id="${id}" data-action="${ACTIONS.FILTER_EXPIRY}" data-expiry="${value}"><ha-icon></ha-icon><span class="si-chip__label">2</span></button>`,
        );

        await click(element(chip, 'ha-icon'));
        expect(filterData.expiry).toEqual([value]);
        expect(mockUpdateItemsCallback).toHaveBeenCalled();

        await click(chip);
        expect(filterData.expiry).toEqual([]);
      });
    });

    describe('add and edit sheet buttons', () => {
      it('should handle save button in edit modal', async () => {
        vi.mocked(mockModals.saveEditModal).mockResolvedValue(true);
        const button = mount(
          `<button type="button" class="${CSS_CLASSES.SAVE_BTN}" data-action="${ACTIONS.SAVE_EDIT}">Save</button>`,
        );

        const result = await click(button);

        expect(mockModals.saveEditModal).toHaveBeenCalledWith(mockConfig);
        expect(result.prevented).toBe(true);
      });

      it('should close modal on successful save', async () => {
        vi.mocked(mockModals.saveEditModal).mockResolvedValue(true);

        await click(mount(`<button type="button" data-action="${ACTIONS.SAVE_EDIT}"></button>`));

        expect(mockModals.saveEditModal).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeEditModal).toHaveBeenCalled();
      });

      it('should not close modal on failed save', async () => {
        vi.mocked(mockModals.saveEditModal).mockResolvedValue(false);

        await click(mount(`<button type="button" data-action="${ACTIONS.SAVE_EDIT}"></button>`));

        expect(mockModals.saveEditModal).toHaveBeenCalledWith(mockConfig);
        expect(mockModals.closeEditModal).not.toHaveBeenCalled();
      });

      it('should guard against a rapid double-click on the save button', async () => {
        const button = mount(
          `<button type="button" class="${CSS_CLASSES.SAVE_BTN}" data-action="${ACTIONS.SAVE_EDIT}">Save</button>`,
        );
        let resolveSaveEdit: (value: boolean) => void = () => {};
        vi.mocked(mockModals.saveEditModal).mockImplementation(
          () =>
            new Promise<boolean>((resolve) => {
              resolveSaveEdit = resolve;
            }),
        );

        const firstClick = click(button);
        const secondClick = click(button);

        resolveSaveEdit(true);
        await firstClick;
        await secondClick;

        expect(mockModals.saveEditModal).toHaveBeenCalledTimes(1);
      });

      it('closes the add sheet from its Cancel', async () => {
        const sheet = mount(
          `<div id="${ELEMENTS.ADD_MODAL}"><button type="button" class="${CSS_CLASSES.CANCEL_BTN}" data-action="${ACTIONS.CLOSE_ADD_MODAL}">Cancel</button></div>`,
        );

        const result = await click(element(sheet, 'button'));

        expect(mockModals.closeAddModal).toHaveBeenCalled();
        expect(result.prevented).toBe(true);
      });

      it('should handle cancel button in edit modal', async () => {
        const sheet = mount(
          `<div id="${ELEMENTS.EDIT_MODAL}"><button type="button" class="${CSS_CLASSES.CANCEL_BTN}" data-action="${ACTIONS.CLOSE_EDIT_MODAL}">Cancel</button></div>`,
        );

        const result = await click(element(sheet, 'button'));

        expect(mockModals.closeEditModal).toHaveBeenCalled();
        expect(mockModals.closeAddModal).not.toHaveBeenCalled();
        expect(result.prevented).toBe(true);
      });
    });
  });

  describe('handleKeydown', () => {
    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    function rowOpener(attrs: string): HTMLElement {
      return mount(`<div class="si-row__open" ${attrs} tabindex="0"><span>Test Item</span></div>`);
    }

    it('should trigger the item action on Enter for a role="button" element', async () => {
      const opener = rowOpener(
        `role="button" data-action="${ACTIONS.OPEN_EDIT_MODAL}" data-name="Test Item"`,
      );

      expect(await press(opener, 'Enter')).toBe(true);
      expect(mockModals.openEditModal).toHaveBeenCalledTimes(1);
      expect(vi.mocked(mockModals.openEditModal).mock.calls[0][0]).toBe('Test Item');
    });

    it('should trigger the item action on Space for a role="button" element', async () => {
      const opener = rowOpener(
        `role="button" data-action="${ACTIONS.OPEN_EDIT_MODAL}" data-name="Test Item"`,
      );

      expect(await press(opener, ' ')).toBe(true);
      expect(mockModals.openEditModal).toHaveBeenCalledTimes(1);
      expect(vi.mocked(mockModals.openEditModal).mock.calls[0][0]).toBe('Test Item');
    });

    it('should ignore keys other than Enter and Space', async () => {
      const opener = rowOpener(
        `role="button" data-action="${ACTIONS.OPEN_EDIT_MODAL}" data-name="Test Item"`,
      );

      expect(await press(opener, 'Tab')).toBe(false);
      expect(mockModals.openEditModal).not.toHaveBeenCalled();
    });

    it('should ignore Enter on elements without role="button" (avoids double-firing on real buttons)', async () => {
      const button = mount(
        `<button type="button" data-action="${ACTIONS.OPEN_EDIT_MODAL}" data-name="Test Item"></button>`,
      );

      await press(button, 'Enter');

      expect(mockModals.openEditModal).not.toHaveBeenCalled();
    });

    it('should ignore Enter when data-action or data-name is missing', async () => {
      await press(rowOpener('role="button"'), 'Enter');
      await press(rowOpener(`role="button" data-action="${ACTIONS.OPEN_EDIT_MODAL}"`), 'Enter');

      expect(mockModals.openEditModal).not.toHaveBeenCalled();
    });
  });

  describe('handleChange', () => {
    let mockTarget: HTMLElement;
    let mockEvent: Event;

    describe('filter selects', () => {
      it('should handle sort method change', () => {
        const filterData = {
          category: [''],
          expiry: '',
          location: [''],
          quantity: '',
          searchText: 'test',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        };

        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        mockTarget = {
          id: ELEMENTS.SORT_METHOD,
        } as unknown as HTMLElement;

        mockEvent = { target: mockTarget } as unknown as Event;

        eventHandler['handleChange'](mockEvent);

        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('saves the sort method picked in the sort chip select', () => {
        const filterData = {
          category: [],
          expiry: [],
          location: [],
          quantity: [],
          searchText: '',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);
        const host = document.createElement('div');
        host.innerHTML = createSortOptions(SORT_METHODS.NAME, mockTranslations);
        const select = host.querySelector('.si-sort-chip select');
        if (!(select instanceof HTMLSelectElement)) {
          throw new Error('sort chip select missing');
        }
        select.value = SORT_METHODS.EXPIRY;

        eventHandler['handleChange']({ target: select } as unknown as Event);

        expect(filterData.sortMethod).toBe(SORT_METHODS.EXPIRY);
        expect(mockFilters.saveFilters).toHaveBeenCalledWith(mockConfig.entity, filterData);
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle auto-add checkbox change', () => {
        vi.useFakeTimers();

        const mockControls = document.createElement('div');
        mockControls.className = 'auto-add-controls';
        mockControls.hidden = true;

        const mockParent = document.createElement('div');
        mockParent.append(mockControls);

        const inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = 'auto-add-enabled';
        inputElement.checked = true;
        Object.defineProperty(inputElement, 'parentElement', {
          value: mockParent,
          writable: true,
        });

        mockEvent = { target: inputElement } as unknown as Event;

        eventHandler['handleChange'](mockEvent);

        vi.advanceTimersByTime(0);

        expect(mockControls.hidden).toBe(false);

        vi.useRealTimers();
      });
    });

    describe('handleSearchChange', () => {
      beforeEach(() => {
        const filterData = {
          category: [''],
          expiry: '',
          location: [''],
          quantity: '',
          searchText: 'test',
          showAdvanced: false,
          sortMethod: SORT_METHODS.NAME,
        };

        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);
        vi.mocked(mockFilters.filterItems).mockReturnValue(mockInventoryItems);
        vi.mocked(mockFilters.sortItems).mockReturnValue(mockInventoryItems);

        const mockSortSelect = document.createElement('select');
        mockSortSelect.value = 'name';
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(mockSortSelect);
      });

      it('should filter and sort items', () => {
        eventHandler['handleSearchChange']();

        expect(mockFilters.getCurrentFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(Utilities.validateInventoryItems).toHaveBeenCalledWith(mockInventoryItems);
        expect(mockFilters.filterItems).toHaveBeenCalled();
        expect(mockFilters.sortItems).toHaveBeenCalled();
        expect(mockUpdateItemsCallback).toHaveBeenCalledWith(mockInventoryItems, 'name');
        expect(mockFilters.updateFilterIndicators).toHaveBeenCalled();
      });

      it('should handle missing entity state', () => {
        mockHass = createMockHomeAssistant({});

        eventHandler['handleSearchChange']();

        expect(mockUpdateItemsCallback).not.toHaveBeenCalled();
      });

      it('should use default sort method when sort element not found', () => {
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

        eventHandler['handleSearchChange']();

        expect(mockFilters.sortItems).toHaveBeenCalledWith(
          mockInventoryItems,
          DEFAULTS.SORT_METHOD,
          mockTranslations,
        );
      });

      describe('with the list sorted by category', () => {
        beforeEach(() => {
          vi.mocked(mockFilters.getCurrentFilters).mockReturnValue({
            category: [],
            expiry: [],
            location: [],
            quantity: [],
            searchText: 'mil',
            showAdvanced: false,
            sortMethod: SORT_METHODS.CATEGORY,
          });
          // The real card: the sort chip's select is #sort-method, showing the saved method.
          const host = document.createElement('div');
          host.innerHTML = createSortOptions(SORT_METHODS.CATEGORY, mockTranslations);
          vi.mocked(mockRenderRoot.querySelector).mockImplementation((selector: string) =>
            host.querySelector(selector),
          );
        });

        it('keeps the sort (and its grouping) while typing a search', () => {
          eventHandler['handleSearchChange']();

          expect(mockFilters.sortItems).toHaveBeenCalledWith(
            mockInventoryItems,
            SORT_METHODS.CATEGORY,
            mockTranslations,
          );
          expect(mockUpdateItemsCallback).toHaveBeenCalledWith(
            mockInventoryItems,
            SORT_METHODS.CATEGORY,
          );
        });

        it('keeps the sort when the search field commits (blur or Enter)', () => {
          const searchInput = document.createElement('input');
          searchInput.id = ELEMENTS.SEARCH_INPUT;
          searchInput.value = 'milk';

          eventHandler['handleChange']({ target: searchInput } as unknown as Event);

          expect(mockUpdateItemsCallback).toHaveBeenCalledWith(
            mockInventoryItems,
            SORT_METHODS.CATEGORY,
          );
        });
      });
    });

    describe('item row actions', () => {
      beforeEach(() => {
        eventHandler.setupEventListeners();
      });

      function itemButton(action: string, name = 'Test Item', extra = ''): HTMLElement {
        return mount(
          `<button type="button" data-action="${action}" data-name="${name}" ${extra}><ha-icon></ha-icon></button>`,
        );
      }

      it('should return early if button is disabled', async () => {
        await click(itemButton(ACTIONS.INCREMENT, 'Test Item', 'disabled'));

        expect(mockServices.incrementItem).not.toHaveBeenCalled();
      });

      it('should return early if button is aria-disabled', async () => {
        await click(itemButton(ACTIONS.INCREMENT, 'Test Item', 'aria-disabled="true"'));

        expect(mockServices.incrementItem).not.toHaveBeenCalled();
      });

      it('should handle increment action', async () => {
        const button = itemButton(ACTIONS.INCREMENT);

        await click(button);

        expect(button.getAttribute('data-processing')).toBe('true');
        expect(button.getAttribute('disabled')).toBe('true');
        expect(mockServices.incrementItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });

      it('should handle decrement action', async () => {
        await click(itemButton(ACTIONS.DECREMENT));

        expect(mockServices.decrementItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });

      it('should handle remove action with confirmation', async () => {
        vi.mocked(globalThis.confirm).mockReturnValue(true);

        await click(itemButton(ACTIONS.REMOVE));

        expect(globalThis.confirm).toHaveBeenCalledWith('Remove Test Item from inventory?');
        expect(mockServices.removeItem).toHaveBeenCalledWith('test-inventory-id', 'Test Item');
      });

      it('should not remove item without confirmation', async () => {
        vi.mocked(globalThis.confirm).mockReturnValue(false);

        await click(itemButton(ACTIONS.REMOVE));

        expect(mockServices.removeItem).not.toHaveBeenCalled();
      });

      it('should handle open edit modal action', async () => {
        const opener = mount(
          `<div class="si-row__open" data-action="${ACTIONS.OPEN_EDIT_MODAL}" data-name="Test Item" role="button" tabindex="0"><span class="si-row__name">Test Item</span></div>`,
        );

        await click(element(opener, 'span'));

        expect(mockModals.openEditModal).toHaveBeenCalledTimes(1);

        const calls = vi.mocked(mockModals.openEditModal).mock.calls[0];
        expect(calls[0]).toBe('Test Item');

        expect(typeof calls[1]).toBe('function');
        const getContext = calls[1];
        const result = getContext();
        expect(result).toEqual(
          createMockCardContext({
            hass: mockHass,
            config: mockConfig,
            translations: mockTranslations,
            items: mockInventoryItems,
          }),
        );
      });

      it('offers stocked-only batch locations to the edit modal', async () => {
        mockInventoryItems.push({
          ...mockInventoryItems[0],
          name: 'Batched',
          location: '',
          stocked_locations: [' Garage Freezer ', ''],
        });
        try {
          await click(itemButton(ACTIONS.OPEN_EDIT_MODAL, 'Batched'));
        } finally {
          mockInventoryItems.pop();
        }

        expect(vi.mocked(mockModals.openEditModal).mock.calls[0][3]).toEqual([
          'Garage Freezer',
          'Pantry',
        ]);
      });

      it('should handle unknown action', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await click(itemButton('unknown'));

        expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown action: unknown');
        consoleWarnSpy.mockRestore();
      });

      it('should handle service errors gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockServices.incrementItem).mockRejectedValue(new Error('Service error'));

        await click(itemButton(ACTIONS.INCREMENT));

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error performing increment on Test Item:',
          expect.any(Error),
        );
        consoleErrorSpy.mockRestore();
      });

      it('should restore button state after action', async () => {
        const button = itemButton(ACTIONS.INCREMENT);

        await click(button);

        vi.advanceTimersByTime(200);

        expect(button.hasAttribute('disabled')).toBe(false);
        expect(button.hasAttribute('data-processing')).toBe(false);
        expect(button.hasAttribute('aria-busy')).toBe(false);
        expect(button.classList.contains('si-busy')).toBe(false);
      });
    });

    describe('multi-select filter delegation', () => {
      function buildMultiSelect(id: string, values: [string, boolean][]) {
        const container = document.createElement('div');
        container.className = 'multi-select-container';
        const trigger = document.createElement('div');
        trigger.className = 'multi-select-trigger';
        trigger.id = `${id}-trigger`;
        trigger.dataset.action = ACTIONS.TOGGLE_FILTER_DROPDOWN;
        const label = document.createElement('span');
        label.className = 'multi-select-label';
        label.dataset.placeholder = 'All Categories';
        label.textContent = 'All Categories';
        trigger.appendChild(label);
        const dropdown = document.createElement('div');
        dropdown.className = 'multi-select-dropdown';
        dropdown.id = `${id}-dropdown`;
        dropdown.hidden = true;
        for (const [value, checked] of values) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = value;
          checkbox.checked = checked;
          dropdown.appendChild(checkbox);
        }
        container.appendChild(trigger);
        container.appendChild(dropdown);
        return { container, trigger, dropdown, label };
      }

      it('should apply checked values to the category filter on change', () => {
        const { dropdown, label } = buildMultiSelect('filter-category', [
          ['Food', true],
          ['Cleaning', false],
        ]);
        const filterData = {
          category: [],
          expiry: [],
          location: [],
          quantity: [],
          searchText: '',
          showAdvanced: true,
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        const event = { target: dropdown.querySelector('input') } as unknown as Event;
        eventHandler['handleChange'](event);

        expect(filterData.category).toEqual(['Food']);
        expect(mockFilters.saveFilters).toHaveBeenCalledWith(mockConfig.entity, filterData);
        expect(mockFilters.updateFilterIndicators).toHaveBeenCalled();
        expect(label.textContent).toBe('1 selected');
      });

      it('should reset trigger label to placeholder when nothing is selected', () => {
        const { dropdown, label } = buildMultiSelect('filter-location', [['Pantry', false]]);
        label.textContent = '1 selected';
        const filterData = {
          category: [],
          expiry: [],
          location: ['Pantry'],
          quantity: [],
          searchText: '',
          showAdvanced: true,
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        const event = { target: dropdown.querySelector('input') } as unknown as Event;
        eventHandler['handleChange'](event);

        expect(filterData.location).toEqual([]);
        expect(label.textContent).toBe('All Categories');
      });

      it('should ignore checkboxes from unknown dropdowns', () => {
        const { dropdown } = buildMultiSelect('not-a-filter', [['x', true]]);

        const event = { target: dropdown.querySelector('input') } as unknown as Event;
        eventHandler['handleChange'](event);

        expect(mockFilters.saveFilters).not.toHaveBeenCalled();
      });

      it('should toggle the dropdown on trigger click', async () => {
        eventHandler.setupEventListeners();
        const { container, label, dropdown } = buildMultiSelect('filter-category', [
          ['Food', false],
        ]);
        mockRenderRoot.append(container);

        await click(label);
        expect(dropdown.hidden).toBe(false);

        await click(label);
        expect(dropdown.hidden).toBe(true);
      });

      it('keeps the dropdown open for clicks inside it', async () => {
        eventHandler.setupEventListeners();
        const { container, trigger, dropdown } = buildMultiSelect('filter-category', [
          ['Food', false],
        ]);
        mockRenderRoot.append(container);

        await click(trigger);
        await click(element(dropdown, 'input'));

        expect(dropdown.hidden).toBe(false);
      });

      it('should close open dropdowns when clicking outside', async () => {
        eventHandler.setupEventListeners();
        const { container, dropdown } = buildMultiSelect('filter-category', [['Food', false]]);
        dropdown.hidden = false;
        mockRenderRoot.append(container);
        const outside = mount('<div class="elsewhere"></div>');

        await click(outside);
        expect(dropdown.hidden).toBe(true);
      });
    });

    describe('toggleAdvancedFilters', () => {
      it('should toggle advanced filters', () => {
        const filterData = {
          category: [''],
          expiry: '',
          location: [''],
          quantity: '',
          searchText: '',
          showAdvanced: false,
        };
        vi.mocked(mockFilters.getCurrentFilters).mockReturnValue(filterData);

        eventHandler['toggleAdvancedFilters']();

        expect(filterData.showAdvanced).toBe(true);
        expect(mockFilters.saveFilters).toHaveBeenCalledWith(mockConfig.entity, filterData);
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle errors gracefully', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockFilters.getCurrentFilters).mockImplementation(() => {
          throw new Error('Toggle error');
        });

        eventHandler['toggleAdvancedFilters']();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error toggling advanced filters:',
          expect.any(Error),
        );
        consoleErrorSpy.mockRestore();
      });
    });

    describe('clearFilters', () => {
      it('should clear filters and search input', () => {
        // A real lookup: the selector has to match the rendered search box.
        const host = document.createElement('div');
        host.innerHTML = `<input id="${ELEMENTS.SEARCH_INPUT}" value="test search">`;
        vi.mocked(mockRenderRoot.querySelector).mockImplementation((selector: string) =>
          host.querySelector(selector),
        );
        const mockSearchInput = host.querySelector('input') as HTMLInputElement;

        eventHandler['clearFilters']();

        expect(mockFilters.clearFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(mockSearchInput.value).toBe('');
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle missing search input', () => {
        vi.mocked(mockRenderRoot.querySelector).mockReturnValue(null);

        eventHandler['clearFilters']();

        expect(mockFilters.clearFilters).toHaveBeenCalledWith(mockConfig.entity);
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('should handle errors gracefully', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(mockFilters.clearFilters).mockImplementation(() => {
          throw new Error('Clear error');
        });

        eventHandler['clearFilters']();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing filters:', expect.any(Error));
        expect(globalThis.alert).toHaveBeenCalledWith('Error clearing filters. Please try again.');
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('header scan panel', () => {
    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    it('should show scan panel when header scan button is clicked', async () => {
      const showScanPanelSpy = vi
        .spyOn(eventHandler['scanHandler'], 'showScanPanel')
        .mockResolvedValue(undefined);
      const button = mount(
        `<button type="button" id="${ELEMENTS.HEADER_SCAN_BTN}" data-action="${ACTIONS.OPEN_SCAN}"><ha-icon></ha-icon></button>`,
      );

      const result = await click(element(button, 'ha-icon'));

      expect(showScanPanelSpy).toHaveBeenCalled();
      expect(result.prevented).toBe(true);
    });

    it('should hide scan panel when close button is clicked', async () => {
      const hideScanPanelSpy = vi
        .spyOn(eventHandler['scanHandler'], 'hideScanPanel')
        .mockImplementation(() => {});

      await click(
        mount(
          `<button type="button" id="${ELEMENTS.SCAN_CLOSE}" data-action="${ACTIONS.CLOSE_SCAN}"></button>`,
        ),
      );

      expect(hideScanPanelSpy).toHaveBeenCalled();
    });

    it('should call handleScanGo when go button is clicked', async () => {
      const handleScanGoSpy = vi.spyOn(eventHandler['scanHandler'], 'handleScanGo');

      await click(
        mount(
          `<button type="button" id="${ELEMENTS.SCAN_GO_BTN}" data-action="${ACTIONS.SCAN_GO}"></button>`,
        ),
      );

      expect(handleScanGoSpy).toHaveBeenCalled();
    });

    it('opens the photo chooser when "Choose a photo" is clicked', async () => {
      const choosePhotoSpy = vi
        .spyOn(eventHandler['scanHandler'], 'choosePhoto')
        .mockResolvedValue(undefined);

      await click(
        mount(`<button type="button" data-action="${ACTIONS.SCAN_CHOOSE_PHOTO}"></button>`),
      );

      expect(choosePhotoSpy).toHaveBeenCalled();
    });

    it('should hide scan panel when cancel button is clicked', async () => {
      const hideScanPanelSpy = vi
        .spyOn(eventHandler['scanHandler'], 'hideScanPanel')
        .mockImplementation(() => {});

      await click(
        mount(
          `<button type="button" id="${ELEMENTS.SCAN_CANCEL_BTN}" data-action="${ACTIONS.CLOSE_SCAN}"></button>`,
        ),
      );

      expect(hideScanPanelSpy).toHaveBeenCalled();
    });

    it('should call scanBarcode service when handleScanGo fires with a barcode', async () => {
      (eventHandler as any).scanHandler.scannedBarcode = '1234567890';

      const mockActionSelect = { value: 'increment' } as HTMLSelectElement;
      const mockAmountInput = { value: '2' } as HTMLInputElement;
      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === ELEMENTS.SCAN_ACTION_SELECT) return mockActionSelect;
        if (id === ELEMENTS.SCAN_AMOUNT_INPUT) return mockAmountInput;
        if (id === ELEMENTS.SCAN_PANEL) return { style: {} };
        return null;
      });

      (mockServices as any).scanBarcode = vi.fn().mockResolvedValue({ success: true });

      await (eventHandler as any).scanHandler.handleScanGo();

      expect((mockServices as any).scanBarcode).toHaveBeenCalledWith(
        'test-inventory-id',
        '1234567890',
        'increment',
        2,
        {},
      );
      expect(mockRenderCallback).toHaveBeenCalled();
    });

    it('should show item name and controls for known barcode', async () => {
      const mockItemNameEl = { textContent: '', hidden: true } as any;
      const mockExistingControls = { hidden: true } as any;
      const mockAddBtn = { hidden: false } as any;

      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === `${ELEMENTS.SCAN_VIEWPORT}-container`) return { style: {} };
        if (id === ELEMENTS.SCAN_ACTION_BAR) return { style: {} };
        if (id === 'scan-barcode-label') return { textContent: '' };
        if (id === 'scan-panel-error') return { style: {}, textContent: '' };
        if (id === ELEMENTS.SCAN_AMOUNT_INPUT) return { value: '1' };
        if (id === ELEMENTS.SCAN_ACTION_SELECT) return { value: 'increment' };
        if (id === ELEMENTS.SCAN_ITEM_NAME) return mockItemNameEl;
        if (id === ELEMENTS.SCAN_EXISTING_CONTROLS) return mockExistingControls;
        if (id === ELEMENTS.SCAN_ADD_BTN) return mockAddBtn;
        return null;
      });

      (mockServices as any).lookupByBarcode = vi.fn().mockResolvedValue({
        items: [{ name: 'Milk', inventory_id: 'test-inventory-id' }],
      });

      await (eventHandler as any).scanHandler.handleScanDetected('1234567890');

      expect(mockItemNameEl.textContent).toBe('Milk');
      expect(mockItemNameEl.hidden).toBe(false);
      expect(mockExistingControls.hidden).toBe(false);
      expect(mockAddBtn.hidden).toBe(true);
    });

    it('should hide controls and show add button for unknown barcode', async () => {
      const mockItemNameEl = { textContent: '', hidden: false } as any;
      const mockExistingControls = { hidden: false } as any;
      const mockAddBtn = { hidden: true } as any;

      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === `${ELEMENTS.SCAN_VIEWPORT}-container`) return { style: {} };
        if (id === ELEMENTS.SCAN_ACTION_BAR) return { style: {} };
        if (id === 'scan-barcode-label') return { textContent: '' };
        if (id === 'scan-panel-error') return { style: {}, textContent: '' };
        if (id === ELEMENTS.SCAN_AMOUNT_INPUT) return { value: '1' };
        if (id === ELEMENTS.SCAN_ACTION_SELECT) return { value: 'increment' };
        if (id === ELEMENTS.SCAN_ITEM_NAME) return mockItemNameEl;
        if (id === ELEMENTS.SCAN_EXISTING_CONTROLS) return mockExistingControls;
        if (id === ELEMENTS.SCAN_ADD_BTN) return mockAddBtn;
        return null;
      });

      (mockServices as any).lookupByBarcode = vi.fn().mockResolvedValue({
        items: [],
      });
      (mockServices as any).lookupBarcodeProduct = vi.fn().mockResolvedValue({
        barcode: '9999999999',
        results: [],
      });

      await (eventHandler as any).scanHandler.handleScanDetected('9999999999');

      expect(mockItemNameEl.hidden).toBe(true);
      expect(mockExistingControls.hidden).toBe(true);
      expect(mockAddBtn.hidden).toBe(false);
    });

    it('should handle scan add button click — hides panel and opens add modal', async () => {
      (eventHandler as any).scanHandler.scannedBarcode = '5551234567';

      const hideScanPanelSpy = vi
        .spyOn(eventHandler['scanHandler'], 'hideScanPanel')
        .mockImplementation(() => {});

      await click(
        mount(
          `<button type="button" id="${ELEMENTS.SCAN_ADD_BTN}" data-action="${ACTIONS.SCAN_ADD_ITEM}"></button>`,
        ),
      );

      expect(hideScanPanelSpy).toHaveBeenCalled();
      expect(mockModals.openAddModal).toHaveBeenCalled();
    });

    it('should show error when scanBarcode fails', async () => {
      (eventHandler as any).scanHandler.scannedBarcode = '1234567890';

      const mockErrorEl = { textContent: '', hidden: true };
      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === ELEMENTS.SCAN_ACTION_SELECT) return { value: 'increment' };
        if (id === ELEMENTS.SCAN_AMOUNT_INPUT) return { value: '1' };
        if (id === 'scan-panel-error') return mockErrorEl;
        return null;
      });

      (mockServices as any).scanBarcode = vi.fn().mockResolvedValue({
        success: false,
        error: "Validation error: No item found for barcode '1234567890'",
        errorCode: 'barcode_not_found',
      });

      await (eventHandler as any).scanHandler.handleScanGo();

      expect(mockErrorEl.hidden).toBe(false);
      expect(mockErrorEl.textContent).toBe('No item found for this barcode');
    });
  });

  describe('handleBarcodeProductLookup', () => {
    it('should auto-fill when single result found', async () => {
      const mockNameEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockDescEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockCatEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockUnitEl = { value: '', dispatchEvent: vi.fn() } as any;

      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === 'add-name') return mockNameEl;
        if (id === 'add-description') return mockDescEl;
        if (id === 'add-category') return mockCatEl;
        if (id === 'add-unit') return mockUnitEl;
        return null;
      });

      (mockServices as any).lookupBarcodeProduct = vi.fn().mockResolvedValue({
        barcode: '123',
        results: [
          {
            provider: 'openfoodfacts',
            found: true,
            product: { name: 'Soup', brand: 'Campbell', category: 'Food', unit: '400g' },
          },
          { provider: 'openbeautyfacts', found: false },
        ],
      });

      (eventHandler as any).barcodeProductHandler.handleBarcodeProductLookup('123');
      await vi.runAllTimersAsync();

      expect(mockNameEl.value).toBe('Soup');
    });

    it('should show product picker when multiple results found', async () => {
      vi.mocked(Utilities.sanitizeHtml).mockImplementation((s: string) => s);

      const mockPicker = { hidden: true } as any;
      const mockList = {
        innerHTML: '',
        querySelectorAll: vi.fn().mockReturnValue([]),
      } as any;

      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === 'add-product-picker') return mockPicker;
        if (id === 'add-product-picker-list') return mockList;
        return null;
      });

      (mockServices as any).lookupBarcodeProduct = vi.fn().mockResolvedValue({
        barcode: '123',
        results: [
          { provider: 'openfoodfacts', found: true, product: { name: 'Product A' } },
          { provider: 'openbeautyfacts', found: true, product: { name: 'Product B' } },
        ],
      });

      (eventHandler as any).barcodeProductHandler.handleBarcodeProductLookup('123');
      await vi.runAllTimersAsync();

      expect(mockPicker.hidden).toBe(false);
      expect(mockList.innerHTML).toContain('Product A');
      expect(mockList.innerHTML).toContain('Product B');
    });

    it('should not auto-fill when no results found', async () => {
      (mockServices as any).lookupBarcodeProduct = vi.fn().mockResolvedValue({
        barcode: '123',
        results: [
          { provider: 'openfoodfacts', found: false },
          { provider: 'openbeautyfacts', found: false },
        ],
      });

      const getById = vi.fn().mockReturnValue(null);
      (mockRenderRoot as any).getElementById = getById;

      (eventHandler as any).barcodeProductHandler.handleBarcodeProductLookup('123');
      await vi.runAllTimersAsync();

      // Should not have tried to get any form fields
      expect(getById).not.toHaveBeenCalledWith('add-name');
    });
  });

  describe('selectProduct', () => {
    it('should fill name, description, category and unit fields', () => {
      const mockNameEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockDescEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockCatEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockUnitEl = { value: '', dispatchEvent: vi.fn() } as any;
      const mockPicker = { hidden: false } as any;

      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === 'add-name') return mockNameEl;
        if (id === 'add-description') return mockDescEl;
        if (id === 'add-category') return mockCatEl;
        if (id === 'add-unit') return mockUnitEl;
        if (id === 'add-product-picker') return mockPicker;
        return null;
      });

      (eventHandler as any).barcodeProductHandler.selectProduct('add', {
        name: 'Cheerios',
        brand: 'General Mills',
        description: 'Cereal',
        category: 'Breakfast',
        unit: '340g',
      });

      expect(mockNameEl.value).toBe('Cheerios');
      expect(mockDescEl.value).toBe('General Mills - Cereal');
      expect(mockCatEl.value).toBe('Breakfast');
      expect(mockUnitEl.value).toBe('340g');
      expect(mockPicker.hidden).toBe(true);
    });
  });

  describe('hideProductPicker', () => {
    it('should hide the picker element', () => {
      const mockPicker = { hidden: false } as any;
      (mockRenderRoot as any).getElementById = vi.fn((id: string) => {
        if (id === 'add-product-picker') return mockPicker;
        return null;
      });

      (eventHandler as any).barcodeProductHandler.hideProductPicker('add');

      expect(mockPicker.hidden).toBe(true);
    });
  });

  describe('edit sheet ⋮ menu', () => {
    function menuIcon(id: string, action: string): HTMLElement {
      const menu = mount(
        `<details open><div class="si-sheet__menu-list"><button type="button" id="${id}" data-action="${action}" class="si-text-btn si-sheet__menu-item"><ha-icon icon="mdi:history"></ha-icon>Label</button></div></details>`,
      );
      return element(menu, 'ha-icon');
    }

    beforeEach(() => {
      eventHandler.setupEventListeners();
      mockModals.getCurrentEditingItem = vi.fn().mockReturnValue('Milk');
      mockModals.showError = vi.fn();
    });

    it('asks before deleting when Delete is picked, also via its icon', async () => {
      vi.mocked(globalThis.confirm).mockReturnValue(false);

      await click(menuIcon(ELEMENTS.EDIT_DELETE_BTN, ACTIONS.EDIT_DELETE));

      expect(globalThis.confirm).toHaveBeenCalledWith('Remove Milk from inventory?');
      expect(mockServices.removeItem).not.toHaveBeenCalled();
      expect(mockModals.closeEditModal).not.toHaveBeenCalled();
    });

    it('keeps the modal open and shows the error when removeItem fails', async () => {
      vi.mocked(globalThis.confirm).mockReturnValue(true);
      mockServices.removeItem = vi
        .fn()
        .mockResolvedValue({ success: false, error: "No item named 'Milk' found" });

      await click(menuIcon(ELEMENTS.EDIT_DELETE_BTN, ACTIONS.EDIT_DELETE));

      expect(mockModals.showError).toHaveBeenCalledWith("No item named 'Milk' found", false);
      expect(mockModals.closeEditModal).not.toHaveBeenCalled();
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('closes the modal and re-renders when removeItem succeeds', async () => {
      vi.mocked(globalThis.confirm).mockReturnValue(true);
      mockServices.removeItem = vi.fn().mockResolvedValue({ success: true });

      await click(menuIcon(ELEMENTS.EDIT_DELETE_BTN, ACTIONS.EDIT_DELETE));

      expect(mockServices.removeItem).toHaveBeenCalledWith('test-inventory-id', 'Milk');
      expect(mockModals.showError).not.toHaveBeenCalled();
      expect(mockModals.closeEditModal).toHaveBeenCalled();
      expect(mockRenderCallback).toHaveBeenCalled();
    });

    it('opens the history from View history after closing the edit sheet', async () => {
      const showItemHistory = vi
        .spyOn(eventHandler['historyHandler'], 'showItemHistory')
        .mockResolvedValue(undefined);

      await click(menuIcon(ELEMENTS.EDIT_HISTORY_BTN, ACTIONS.EDIT_HISTORY));

      expect(mockModals.closeEditModal).toHaveBeenCalled();
      expect(showItemHistory).toHaveBeenCalledWith('Milk');
    });
  });

  describe('batch row actions', () => {
    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    function batchRow(): HTMLElement {
      return mount(`<div class="item-row">
        <button type="button" class="batch-toggle" data-action="${ACTIONS.TOGGLE_BATCHES}" data-name="Milk" aria-expanded="false" aria-label="Details for Milk"></button>
        <div class="item-details-panel" hidden>
        <div class="batch-panel">
          <button type="button" class="batch-decrement-btn" data-action="${ACTIONS.DECREMENT_BATCH}" data-name="Milk" data-batch-id="b1" data-amount="0.5">➖</button>
          <button type="button" class="restock-open-btn" data-action="${ACTIONS.OPEN_RESTOCK}" data-name="Milk">Restock…</button>
          <div class="restock-form" hidden>
            <input data-batch-field="${BATCH_FIELDS.AMOUNT}" value="1" />
            <input data-batch-field="${BATCH_FIELDS.EXPIRY_DATE}" value="" />
            <input data-batch-field="${BATCH_FIELDS.LOCATION}" value="" />
            <input data-batch-field="${BATCH_FIELDS.UNIT_PRICE}" value="" />
            <input data-batch-field="${BATCH_FIELDS.PURCHASED_AT}" value="" />
            <button type="button" class="restock-submit-btn" data-action="${ACTIONS.SUBMIT_RESTOCK}" data-name="Milk">Restock</button>
            <button type="button" class="restock-cancel-btn" data-action="${ACTIONS.CANCEL_RESTOCK}" data-name="Milk">Cancel</button>
          </div>
        </div>
        </div>
      </div>`);
    }

    function setField(row: HTMLElement, field: string, value: string): void {
      const input = row.querySelector(`[data-batch-field="${field}"]`);
      if (!(input instanceof HTMLInputElement)) {
        throw new Error(`missing ${field}`);
      }
      input.value = value;
    }

    it('expands and collapses the details panel, keeps focus on the toggle and remembers it', async () => {
      const row = batchRow();
      const toggle = element(row, '.batch-toggle');
      const panel = element(row, '.item-details-panel');
      toggle.focus();

      await click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(panel.hidden).toBe(false);
      expect(state.expandedBatchItems.has('Milk')).toBe(true);
      expect(toggle.hasAttribute('disabled')).toBe(false);
      expect(mockRenderRoot.activeElement).toBe(toggle);
      expect(mockRenderCallback).not.toHaveBeenCalled();
      expect(holds.holds()).toEqual([]);

      // A pure DOM flip takes no processing lock, so an immediate second tap works.
      await click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(panel.hidden).toBe(true);
      expect(state.expandedBatchItems.has('Milk')).toBe(false);
      expect(mockRenderRoot.activeElement).toBe(toggle);
      expect(holds.holds()).toEqual([]);
    });

    it('releases the hold of a form left open in a collapsed panel, and takes it again on expand', async () => {
      const row = batchRow();
      const toggle = element(row, '.batch-toggle');
      await click(toggle);
      await click(element(row, '.restock-open-btn'));
      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);

      await click(toggle);
      expect(holds.holds()).toEqual([]);

      await click(toggle);
      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
    });

    it("releases the holds of forms the rows' or the card's replacement removed", async () => {
      const row = batchRow();
      await click(element(row, '.restock-open-btn'));
      row.remove();
      eventHandler.rowsReplaced();
      expect(holds.holds()).toEqual([]);

      const next = batchRow();
      await click(element(next, '.restock-open-btn'));
      next.remove();
      eventHandler.cardReplaced();
      expect(holds.holds()).toEqual([]);
    });

    it('keeps the hold of an open form still on screen when other rows are replaced', async () => {
      const row = batchRow();
      await click(element(row, '.restock-open-btn'));

      eventHandler.rowsReplaced();

      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
    });

    it("releases the restock form's hold once the restock succeeded", async () => {
      const row = batchRow();
      vi.mocked(mockServices.incrementItem).mockResolvedValue({ success: true });
      await click(element(row, '.restock-open-btn'));

      await click(element(row, '.restock-submit-btn'));

      expect(holds.holds()).toEqual([]);
    });

    it('loads the details image when the panel opens', async () => {
      const fetchBlob = vi.fn<(path: string) => Promise<Blob>>(() =>
        Promise.reject(new Error('offline')),
      );
      const loader = new ImageLoader(fetchBlob);
      eventHandler.cleanupEventListeners();
      const withImages = createHandler({ imageLoader: loader });
      withImages.setupEventListeners();
      const row = batchRow();
      element(row, '.item-details-panel').insertAdjacentHTML(
        'afterbegin',
        '<img class="si-details__image" alt="" data-image-path="/api/simple_inventory/image/m?v=1">',
      );

      await click(element(row, '.batch-toggle'));
      withImages.cleanupEventListeners();

      expect(fetchBlob).toHaveBeenCalledWith('/api/simple_inventory/image/m?v=1');
    });

    it('takes from the chosen batch only', async () => {
      const row = batchRow();

      await click(element(row, '.batch-decrement-btn'));

      expect(mockServices.decrementItem).toHaveBeenCalledWith('test-inventory-id', 'Milk', 0.5, {
        batchId: 'b1',
      });
      expect(mockRenderCallback).toHaveBeenCalled();
    });

    it('opens the restock form focused on the amount and closes it on cancel', async () => {
      const row = batchRow();
      // Restock… is only reachable with the details panel expanded; hidden content can't be focused.
      element(row, '.item-details-panel').hidden = false;
      const form = element(row, '.restock-form');

      await click(element(row, '.restock-open-btn'));
      expect(form.hidden).toBe(false);
      expect(holds.holds()).toEqual([{ kind: 'background', reason: 'restock form' }]);
      expect(mockRenderRoot.activeElement).toBe(
        row.querySelector(`[data-batch-field="${BATCH_FIELDS.AMOUNT}"]`),
      );

      const cancel = element(row, '.restock-cancel-btn');
      await click(cancel);
      expect(form.hidden).toBe(true);
      expect(cancel.hasAttribute('disabled')).toBe(false);
      expect(mockRenderRoot.activeElement).toBe(row.querySelector('.restock-open-btn'));
      expect(holds.holds()).toEqual([]);
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('restocks with the amount and the filled-in batch fields', async () => {
      const row = batchRow();
      vi.mocked(mockServices.incrementItem).mockResolvedValue({ success: true });
      setField(row, BATCH_FIELDS.AMOUNT, '2');
      setField(row, BATCH_FIELDS.EXPIRY_DATE, '2026-11-01');
      setField(row, BATCH_FIELDS.LOCATION, 'Garage');
      setField(row, BATCH_FIELDS.UNIT_PRICE, '1.5');

      await click(element(row, '.restock-submit-btn'));

      expect(mockServices.incrementItem).toHaveBeenCalledWith('test-inventory-id', 'Milk', 2, {
        expiryDate: '2026-11-01',
        location: 'Garage',
        price: 1.5,
      });
      expect(mockRenderCallback).toHaveBeenCalled();
    });

    it.each(['0', '-2'])('restocks one unit when the amount is %s', async (amount) => {
      const row = batchRow();
      vi.mocked(mockServices.incrementItem).mockResolvedValue({ success: true });
      setField(row, BATCH_FIELDS.AMOUNT, amount);

      await click(element(row, '.restock-submit-btn'));

      expect(mockServices.incrementItem).toHaveBeenCalledWith('test-inventory-id', 'Milk', 1, {});
    });

    it('keeps the form open with the values and shows the error inline when restock fails', async () => {
      const row = batchRow();
      vi.mocked(mockServices.incrementItem).mockResolvedValue({
        success: false,
        error: 'Location is unknown',
      });
      const form = element(row, '.restock-form');
      form.hidden = false;
      setField(row, BATCH_FIELDS.AMOUNT, '3');
      setField(row, BATCH_FIELDS.LOCATION, 'Attic');

      await click(element(row, '.restock-submit-btn'));

      expect(form.hidden).toBe(false);
      expect(
        row.querySelector<HTMLInputElement>(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)?.value,
      ).toBe('Attic');
      const error = form.querySelector('.restock-error');
      expect(error?.getAttribute('role')).toBe('alert');
      expect(error?.textContent).toContain('Location is unknown');
      expect(mockRenderCallback).not.toHaveBeenCalled();
    });

    it('clears a previous restock error when a retry succeeds', async () => {
      const row = batchRow();
      const form = element(row, '.restock-form');
      vi.mocked(mockServices.incrementItem).mockResolvedValueOnce({ success: false, error: 'x' });
      const submit = element(row, '.restock-submit-btn');
      await click(submit);
      vi.advanceTimersByTime(200);

      vi.mocked(mockServices.incrementItem).mockResolvedValueOnce({ success: true });
      await click(submit);

      expect(form.querySelector('.restock-error')).toBeNull();
      expect(mockRenderCallback).toHaveBeenCalledTimes(1);
    });

    it('drops a restock error when the form is cancelled', async () => {
      const row = batchRow();
      const form = element(row, '.restock-form');
      vi.mocked(mockServices.incrementItem).mockResolvedValueOnce({ success: false, error: 'x' });
      await click(element(row, '.restock-submit-btn'));
      vi.advanceTimersByTime(200);
      expect(form.querySelector('.restock-error')).not.toBeNull();

      await click(element(row, '.restock-cancel-btn'));
      await click(element(row, '.restock-open-btn'));

      expect(form.hidden).toBe(false);
      expect(form.querySelector('.restock-error')).toBeNull();
    });
    describe('Move…', () => {
      function moveRow(): HTMLElement {
        return mount(`<li class="batch-row">
          <button type="button" class="batch-move-btn" data-action="${ACTIONS.OPEN_MOVE}" data-name="Milk" data-batch-id="b1">Move…</button>
          <button type="button" class="batch-decrement-btn" data-action="${ACTIONS.DECREMENT_BATCH}" data-name="Milk" data-batch-id="b1" data-amount="1">➖</button>
          <div class="move-form" hidden>
            <input data-batch-field="${BATCH_FIELDS.AMOUNT}" value="6" />
            <input data-batch-field="${BATCH_FIELDS.LOCATION}" value="" />
            <button type="button" class="move-submit-btn" data-action="${ACTIONS.SUBMIT_MOVE}" data-name="Milk" data-batch-id="b1">Move</button>
            <button type="button" class="move-cancel-btn" data-action="${ACTIONS.CANCEL_MOVE}" data-name="Milk" data-batch-id="b1">Cancel</button>
          </div>
        </li>`);
      }

      beforeEach(() => {
        mockServices.transferItem = vi.fn();
      });

      it('opens the form focused on the destination and closes it on cancel', async () => {
        const row = moveRow();
        const form = element(row, '.move-form');

        await click(element(row, '.batch-move-btn'));
        expect(form.hidden).toBe(false);
        expect(holds.holds()).toEqual([{ kind: 'background', reason: 'move form' }]);
        expect(mockRenderRoot.activeElement).toBe(
          row.querySelector(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`),
        );

        const cancel = element(row, '.move-cancel-btn');
        await click(cancel);
        expect(form.hidden).toBe(true);
        expect(cancel.hasAttribute('disabled')).toBe(false);
        expect(mockRenderRoot.activeElement).toBe(row.querySelector('.batch-move-btn'));
        expect(holds.holds()).toEqual([]);
        expect(mockRenderCallback).not.toHaveBeenCalled();
      });

      it('moves the amount of this batch to the destination and refreshes', async () => {
        const row = moveRow();
        vi.mocked(mockServices.transferItem).mockResolvedValue({ success: true });
        setField(row, BATCH_FIELDS.AMOUNT, '2');
        setField(row, BATCH_FIELDS.LOCATION, ' Garage ');

        await click(element(row, '.move-submit-btn'));

        expect(mockServices.transferItem).toHaveBeenCalledWith('test-inventory-id', 'Milk', {
          batchId: 'b1',
          amount: 2,
          toLocation: 'Garage',
        });
        expect(mockRenderCallback).toHaveBeenCalled();
      });

      it('keeps the form and its values and shows the error inline when the move fails', async () => {
        const row = moveRow();
        vi.mocked(mockServices.transferItem).mockResolvedValue({
          success: false,
          error: 'Only 1 of Milk available at Fridge',
          errorCode: 'insufficient_stock',
        });
        const form = element(row, '.move-form');
        form.hidden = false;
        setField(row, BATCH_FIELDS.LOCATION, 'Garage');

        await click(element(row, '.move-submit-btn'));

        expect(form.hidden).toBe(false);
        expect(
          row.querySelector<HTMLInputElement>(`[data-batch-field="${BATCH_FIELDS.LOCATION}"]`)
            ?.value,
        ).toBe('Garage');
        const error = form.querySelector('.move-error');
        expect(error?.getAttribute('role')).toBe('alert');
        expect(error?.textContent).toBe('Move failed: Only 1 of Milk available at Fridge');
        expect(mockRenderCallback).not.toHaveBeenCalled();
      });

      it.each([
        ['', '6', 'Choose where to move it'],
        ['Garage', '0', 'Enter an amount greater than 0'],
        ['Garage', '', 'Enter an amount greater than 0'],
      ])(
        'refuses destination %j with amount %j without calling the integration',
        async (destination, amount, message) => {
          const row = moveRow();
          setField(row, BATCH_FIELDS.LOCATION, destination);
          setField(row, BATCH_FIELDS.AMOUNT, amount);

          await click(element(row, '.move-submit-btn'));

          expect(mockServices.transferItem).not.toHaveBeenCalled();
          expect(element(row, '.move-error').textContent).toBe(message);
        },
      );

      it('drops the error on cancel and after a successful retry', async () => {
        const row = moveRow();
        const form = element(row, '.move-form');
        const submit = element(row, '.move-submit-btn');
        setField(row, BATCH_FIELDS.LOCATION, 'Garage');

        vi.mocked(mockServices.transferItem).mockResolvedValueOnce({ success: false, error: 'x' });
        await click(submit);
        vi.advanceTimersByTime(200);
        expect(form.querySelector('.move-error')).not.toBeNull();
        await click(element(row, '.move-cancel-btn'));
        expect(form.querySelector('.move-error')).toBeNull();

        vi.mocked(mockServices.transferItem).mockResolvedValueOnce({ success: false, error: 'x' });
        await click(submit);
        vi.advanceTimersByTime(200);
        vi.mocked(mockServices.transferItem).mockResolvedValueOnce({ success: true });
        await click(submit);

        expect(form.querySelector('.move-error')).toBeNull();
        expect(mockRenderCallback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('scan action changes', () => {
    it('re-evaluates the scan batch details when the action changes', () => {
      const sync = vi
        .spyOn(eventHandler['scanHandler'], 'syncBatchFieldsVisibility')
        .mockImplementation(() => {});
      const select = document.createElement('select');
      select.id = ELEMENTS.SCAN_ACTION_SELECT;

      eventHandler['handleChange']({ target: select } as unknown as Event);

      expect(sync).toHaveBeenCalled();
    });
  });

  describe('batch editor clicks', () => {
    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    it('toggles removal of the clicked batch', async () => {
      mockModals.toggleBatchRemoved = vi.fn();

      const result = await click(
        mount(
          `<button type="button" class="batch-remove-btn" data-action="${ACTIONS.TOGGLE_BATCH_REMOVED}" data-batch-remove="b2">Remove batch</button>`,
        ),
      );

      expect(mockModals.toggleBatchRemoved).toHaveBeenCalledWith('b2');
      expect(result).toEqual({ prevented: true, stopped: true });
    });

    it('adds a new-batch row from "+ Add batch"', async () => {
      mockModals.addBatchRow = vi.fn();

      const result = await click(
        mount(
          `<button type="button" class="batch-add-btn" data-action="${ACTIONS.ADD_BATCH_ROW}" data-batch-add>+ Add batch</button>`,
        ),
      );

      expect(mockModals.addBatchRow).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ prevented: true, stopped: true });
    });

    it('discards the clicked new-batch row', async () => {
      mockModals.discardBatchRow = vi.fn();

      await click(
        mount(
          `<button type="button" class="batch-discard-btn" data-action="${ACTIONS.DISCARD_BATCH_ROW}" data-batch-discard="new-2"></button>`,
        ),
      );

      expect(mockModals.discardBatchRow).toHaveBeenCalledWith('new-2');
    });

    it('discards the new-batch row when the ✕ icon inside its button is clicked', async () => {
      mockModals.discardBatchRow = vi.fn();
      const button = mount(
        `<button type="button" class="batch-discard-btn" data-action="${ACTIONS.DISCARD_BATCH_ROW}" data-batch-discard="new-3"><ha-icon></ha-icon></button>`,
      );

      await click(element(button, 'ha-icon'));

      expect(mockModals.discardBatchRow).toHaveBeenCalledWith('new-3');
    });
  });

  describe('add-as-batch offer', () => {
    beforeEach(() => {
      eventHandler.setupEventListeners();
    });

    function clickOffer(): Promise<{ prevented: boolean; stopped: boolean }> {
      return click(
        mount(
          `<button type="button" id="${ELEMENTS.ADD_DUPLICATE_BATCH_BTN}" data-action="${ACTIONS.ADD_AS_BATCH}">Add 2 as a new batch</button>`,
        ),
      );
    }

    it('closes the add modal once the batch is added', async () => {
      mockModals.addItemAsBatch = vi.fn().mockResolvedValue(true);

      await clickOffer();

      expect(mockModals.addItemAsBatch).toHaveBeenCalledWith(mockConfig);
      expect(mockModals.closeAddModal).toHaveBeenCalledTimes(1);
    });

    it('keeps the add modal open when adding the batch fails', async () => {
      mockModals.addItemAsBatch = vi.fn().mockResolvedValue(false);

      await clickOffer();

      expect(mockModals.addItemAsBatch).toHaveBeenCalledTimes(1);
      expect(mockModals.closeAddModal).not.toHaveBeenCalled();
    });
  });
});
