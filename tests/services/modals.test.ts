import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { Modals } from '../../src/services/modals';
import { BatchEditor } from '../../src/services/modals/batchEditor';
import { InventoryServices } from '../../src/types/inventoryServices';
import { ServiceResult as InventoryServiceResult } from '../../src/types/serviceResult';
import { ModalFormManager } from '../../src/services/modals/modalFormManager';
import { ModalValidationManager } from '../../src/services/modals/modalValidationManager';
import { ModalUIManager } from '../../src/services/modals/modalUIManager';
import { FormUtils } from '../../src/utils/formUtils';
import { HomeAssistant } from '../../src/types/homeAssistant';
import { InventoryConfig, InventoryItem } from '../../src/types/inventory';
import { RawFormData, ItemData } from '../../src/types/inventoryItem';
import { ValidationError } from '../../src/types/validationError';

import { createMockCardContext, createMockHomeAssistant } from '../testHelpers';
import { TranslationData } from '@/types/translatableComponent';

vi.mock('../../src/services/modals/modalFormManager');
vi.mock('../../src/services/modals/modalValidationManager');
vi.mock('../../src/services/modals/modalUIManager');
vi.mock('../../src/services/modals/batchEditor');
vi.mock('../../src/services/modals/duplicateBatchOffer');
vi.mock('../../src/utils/utilities');
vi.mock('../../src/utils/formUtils');
vi.mock('../../src/services/modalMultiSelect', () => ({
  initializeModalMultiSelect: vi.fn(),
}));

describe('Modals (Integration)', () => {
  let mockConfig: InventoryConfig;
  let mockHass: HomeAssistant;
  let mockServices: InventoryServices;
  let mockShadowRoot: ShadowRoot;
  let mockTranslations: TranslationData;
  let modals: Modals;

  let mockFormManager: any;
  let mockGetFreshStateCallback: () => {
    hass: HomeAssistant;
    config: InventoryConfig;
    items: InventoryItem[];
  };
  let mockGetInventoryId: (entityId: string) => string;
  let mockOnDataChanged: () => void;
  let mockUIManager: any;
  let mockValidationManager: any;
  let mockBatchEditor: { open: Mock; toggleRemoved: Mock; collect: Mock; apply: Mock };

  beforeEach(() => {
    vi.useFakeTimers();
    // An empty sheet DOM: the managers are mocked; Modals only looks up the save buttons itself.
    mockShadowRoot = document.createElement('div').attachShadow({ mode: 'open' });

    mockServices = {
      addItem: vi.fn(),
      updateItem: vi.fn(),
    } as any;

    mockTranslations = {
      modal: {
        add_item: 'Add Item',
        auto_add_settings: 'Auto-add Settings',
        auto_add_when_low: 'Auto-add to todo list when low',
        cancel: 'Cancel',
        category: 'Category',
        location: 'Location',
      },
    };

    mockHass = createMockHomeAssistant();
    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockGetInventoryId = vi.fn((entityId: string) => `inventory_${entityId}`);
    mockOnDataChanged = vi.fn();
    mockGetFreshStateCallback = vi.fn(
      (): { hass: HomeAssistant; config: InventoryConfig; items: InventoryItem[] } => ({
        hass: mockHass,
        config: mockConfig,
        items: [],
      }),
    );

    mockFormManager = {
      getRawAddModalData: vi.fn(),
      getRawEditModalData: vi.fn(),
      clearAddModalForm: vi.fn(),
    };

    mockValidationManager = {
      clearError: vi.fn(),
      highlightInvalidFields: vi.fn(),
      showError: vi.fn(),
    };

    mockUIManager = {
      openAddModal: vi.fn(),
      closeAddModal: vi.fn(),
      openEditModal: vi.fn(),
      closeEditModal: vi.fn(),
      handleModalClick: vi.fn(),
      destroy: vi.fn(),
    };

    vi.mocked(ModalFormManager).mockImplementation(function () {
      return mockFormManager;
    });
    vi.mocked(ModalValidationManager).mockImplementation(function () {
      return mockValidationManager;
    });
    vi.mocked(ModalUIManager).mockImplementation(function () {
      return mockUIManager;
    });

    mockBatchEditor = {
      open: vi.fn(),
      toggleRemoved: vi.fn(),
      collect: vi.fn().mockReturnValue({ valid: true, operations: [] }),
      apply: vi.fn().mockResolvedValue({ success: true }),
    };
    vi.mocked(BatchEditor).mockImplementation(function () {
      return mockBatchEditor as unknown as BatchEditor;
    });

    modals = new Modals(mockShadowRoot, mockServices, mockGetInventoryId, mockOnDataChanged);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Construction', () => {
    it('should create all manager instances', () => {
      expect(ModalFormManager).toHaveBeenCalledWith(mockShadowRoot);
      expect(ModalValidationManager).toHaveBeenCalledWith(mockShadowRoot);
      expect(ModalUIManager).toHaveBeenCalledWith(
        mockShadowRoot,
        mockFormManager,
        mockValidationManager,
        expect.any(Function),
      );
    });

    it('should work without onDataChanged callback', () => {
      const modalsWithoutCallback = new Modals(mockShadowRoot, mockServices, mockGetInventoryId);
      expect(modalsWithoutCallback).toBeDefined();
    });
  });

  describe('Public API Delegation', () => {
    it('should delegate modal operations to UIManager', () => {
      const mockLocations = ['Pantry', 'Fridge'];
      const mockCategories = ['Food', 'Cleaning'];

      modals.openAddModal(mockTranslations, mockLocations, mockCategories);
      expect(vi.mocked(mockUIManager.openAddModal)).toHaveBeenCalled();

      modals.closeAddModal();
      expect(vi.mocked(mockUIManager.closeAddModal)).toHaveBeenCalled();

      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback, mockTranslations);
      expect(vi.mocked(mockUIManager.openEditModal)).toHaveBeenCalledWith(
        'Test Item',
        mockGetFreshStateCallback,
        mockTranslations,
      );

      modals.closeEditModal();
      expect(vi.mocked(mockUIManager.closeEditModal)).toHaveBeenCalled();

      const mockEvent = {} as MouseEvent;
      vi.mocked(mockUIManager.handleModalClick).mockReturnValue(true);
      const result = modals.handleModalClick(mockEvent);
      expect(vi.mocked(mockUIManager.handleModalClick)).toHaveBeenCalledWith(mockEvent);
      expect(result).toBe(true);
    });

    it('should delegate form operations to FormManager', () => {
      modals.clearAddModalForm();
      expect(vi.mocked(mockFormManager.clearAddModalForm)).toHaveBeenCalled();
    });

    it('should delegate cleanup to UIManager', () => {
      modals.destroy();
      expect(vi.mocked(mockUIManager.destroy)).toHaveBeenCalled();
    });
  });

  describe('addItem Business Logic', () => {
    const mockConfig: InventoryConfig = {
      type: 'inventory-card',
      entity: 'sensor.inventory',
    };

    const mockRawFormData: RawFormData = {
      aliases: '',
      autoAddEnabled: false,
      autoAddIdToDescriptionEnabled: false,
      autoAddToListQuantity: '0',
      barcode: '',
      category: 'Food',
      description: 'Test',
      desiredQuantity: '0',
      expiryAlertDays: '7',
      expiryDate: '',
      location: 'Pantry',
      name: 'Test Item',
      price: '',
      quantity: '5',
      todoList: '',
      todoQuantityPlacement: 'name',
      unit: 'pcs',
    };

    beforeEach(() => {
      vi.mocked(mockFormManager.getRawAddModalData).mockReturnValue(mockRawFormData);
    });

    it('should successfully add item with valid data', async () => {
      const mockValidation = { isValid: true, errors: [] };
      const mockItemData: ItemData = {
        aliases: '',
        autoAddEnabled: false,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: 0,
        barcode: '',
        category: 'Food',
        description: 'Test',
        desiredQuantity: 0,
        expiryAlertDays: 7,
        expiryDate: '',
        location: 'Pantry',
        name: 'Test Item',
        price: 0,
        quantity: 5,
        todoList: '',
        todoQuantityPlacement: 'name',
        unit: 'pcs',
      };
      const mockResult: InventoryServiceResult = { success: true };

      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue(mockItemData);
      vi.mocked(FormUtils.sanitizeItemData).mockReturnValue(mockItemData);
      vi.mocked(mockServices.addItem).mockResolvedValue(mockResult);

      const result = await modals.addItem(mockConfig);

      expect(vi.mocked(mockValidationManager.clearError)).toHaveBeenCalledWith(true);
      expect(vi.mocked(mockFormManager.getRawAddModalData)).toHaveBeenCalled();
      expect(FormUtils.validateRawFormData).toHaveBeenCalledWith(mockRawFormData);
      expect(vi.mocked(mockServices.addItem)).toHaveBeenCalledWith(
        'inventory_sensor.inventory',
        mockItemData,
      );
      expect(vi.mocked(mockFormManager.clearAddModalForm)).toHaveBeenCalled();
      expect(mockOnDataChanged).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle validation errors', async () => {
      const mockValidation = {
        isValid: false,
        errors: [{ field: 'name', message: 'Name is required' } as ValidationError],
      };

      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);

      const result = await modals.addItem(mockConfig);

      expect(vi.mocked(mockValidationManager.highlightInvalidFields)).toHaveBeenCalledWith(
        mockValidation.errors,
        true,
      );
      expect(vi.mocked(mockValidationManager.showError)).toHaveBeenCalledWith(
        'Name is required',
        true,
      );
      expect(vi.mocked(mockServices.addItem)).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle service errors', async () => {
      const mockValidation = { isValid: true, errors: [] };
      const mockResult: InventoryServiceResult = { success: false, error: 'Database error' };

      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(FormUtils.sanitizeItemData).mockReturnValue({} as ItemData);
      vi.mocked(mockServices.addItem).mockResolvedValue(mockResult);

      const result = await modals.addItem(mockConfig);

      expect(vi.mocked(mockValidationManager.showError)).toHaveBeenCalledWith(
        'Error adding item: Database error',
        true,
      );
      expect(result).toBe(false);
    });

    it('should handle exceptions', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(mockFormManager.getRawAddModalData).mockImplementation(() => {
        throw new Error('Form error');
      });

      const result = await modals.addItem(mockConfig);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in adding item:', expect.any(Error));
      expect(vi.mocked(mockValidationManager.showError)).toHaveBeenCalledWith(
        'An error occurred while adding the item',
        true,
      );
      expect(result).toBe(false);
    });
  });

  describe('saveEditModal Business Logic', () => {
    const mockConfig: InventoryConfig = {
      type: 'inventory-card',
      entity: 'sensor.inventory',
    };

    const mockRawFormData: RawFormData = {
      aliases: '',
      autoAddEnabled: true,
      autoAddIdToDescriptionEnabled: false,
      autoAddToListQuantity: '2',
      barcode: '',
      category: 'Food',
      description: 'Updated description',
      desiredQuantity: '0',
      expiryAlertDays: '7',
      expiryDate: '2024-12-31',
      location: 'Pantry',
      name: 'Updated Item',
      price: '',
      quantity: '10',
      todoList: 'shopping',
      todoQuantityPlacement: 'name',
      unit: 'pcs',
    };

    beforeEach(() => {
      vi.mocked(mockFormManager.getRawEditModalData).mockReturnValue(mockRawFormData);
    });

    it('should return false when no item is being edited', async () => {
      const result = await modals.saveEditModal(mockConfig);
      expect(result).toBe(false);
      expect(vi.mocked(mockFormManager.getRawEditModalData)).not.toHaveBeenCalled();
    });

    it('should successfully save edit with valid data', async () => {
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback, mockTranslations);

      const mockValidation = { isValid: true, errors: [] };
      const mockItemData: ItemData = {
        aliases: '',
        autoAddEnabled: true,
        autoAddIdToDescriptionEnabled: false,
        autoAddToListQuantity: 2,
        barcode: '',
        category: 'Food',
        description: 'Updated description',
        desiredQuantity: 0,
        expiryAlertDays: 7,
        expiryDate: '2024-12-31',
        location: 'Pantry',
        name: 'Updated Item',
        price: 0,
        quantity: 10,
        todoList: 'shopping',
        todoQuantityPlacement: 'name',
        unit: 'pcs',
      };
      const mockResult: InventoryServiceResult = { success: true };

      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue(mockItemData);
      vi.mocked(FormUtils.sanitizeItemData).mockReturnValue(mockItemData);
      vi.mocked(mockServices.updateItem).mockResolvedValue(mockResult);

      const result = await modals.saveEditModal(mockConfig);

      expect(vi.mocked(mockValidationManager.clearError)).toHaveBeenCalledWith(false);
      expect(vi.mocked(mockFormManager.getRawEditModalData)).toHaveBeenCalled();
      expect(vi.mocked(mockServices.updateItem)).toHaveBeenCalledWith(
        'inventory_sensor.inventory',
        'Test Item',
        mockItemData,
      );
      expect(mockOnDataChanged).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    describe('duplicate names, folded like the integration', () => {
      function editTo(name: string): void {
        const itemData: ItemData = {
          aliases: '',
          autoAddEnabled: false,
          autoAddIdToDescriptionEnabled: false,
          autoAddToListQuantity: 0,
          barcode: '',
          category: '',
          description: '',
          desiredQuantity: 0,
          expiryAlertDays: 0,
          expiryDate: '',
          location: '',
          name,
          price: 0,
          quantity: 1,
          todoList: '',
          todoQuantityPlacement: 'name',
          unit: '',
        };
        vi.mocked(FormUtils.validateRawFormData).mockReturnValue({ isValid: true, errors: [] });
        vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue(itemData);
        vi.mocked(FormUtils.sanitizeItemData).mockReturnValue(itemData);
        vi.mocked(mockServices.updateItem).mockResolvedValue({ success: true });
      }

      /** A Modals whose card holds the items `names` (the duplicate check reads them). */
      function openWith(editing: string, names: string[]): void {
        vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
        const items = names.map((name): InventoryItem => ({
          name,
          quantity: 1,
          unit: '',
          description: '',
          category: '',
          location: '',
          expiry_date: '',
          todo_list: '',
          auto_add_enabled: false,
          auto_add_id_to_description_enabled: false,
        }));
        const context = createMockCardContext({ hass: mockHass, config: mockConfig, items });
        modals = new Modals(
          mockShadowRoot,
          mockServices,
          mockGetInventoryId,
          mockOnDataChanged,
          () => context,
        );
        modals.openEditModal(editing, () => context, mockTranslations);
      }

      it("refuses a rename to another item's name in another case form (ß → SS)", async () => {
        openWith('Map', ['Map', 'Straße']);
        editTo('STRASSE');

        const result = await modals.saveEditModal(mockConfig);

        expect(result).toBe(false);
        expect(vi.mocked(mockValidationManager.highlightInvalidFields)).toHaveBeenCalledWith(
          [{ field: 'name', message: 'Duplicate name' }],
          false,
        );
        expect(vi.mocked(mockServices.updateItem)).not.toHaveBeenCalled();
      });

      it("allows changing only the case form of the item's own name", async () => {
        openWith('Straße', ['Straße']);
        editTo('STRASSE');

        const result = await modals.saveEditModal(mockConfig);

        expect(result).toBe(true);
        expect(vi.mocked(mockServices.updateItem)).toHaveBeenCalled();
      });
    });

    it('should handle validation errors in edit mode', async () => {
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback, mockTranslations);

      const mockValidation = {
        isValid: false,
        errors: [{ field: 'quantity', message: 'Invalid quantity' } as ValidationError],
      };

      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);

      const result = await modals.saveEditModal(mockConfig);

      expect(vi.mocked(mockValidationManager.highlightInvalidFields)).toHaveBeenCalledWith(
        mockValidation.errors,
        false,
      );
      expect(vi.mocked(mockValidationManager.showError)).toHaveBeenCalledWith(
        'Invalid quantity',
        false,
      );
      expect(result).toBe(false);
    });

    it('should handle service errors in edit mode', async () => {
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback, mockTranslations);

      const mockValidation = { isValid: true, errors: [] };
      const mockResult: InventoryServiceResult = { success: false, error: 'Update failed' };

      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(FormUtils.sanitizeItemData).mockReturnValue({} as ItemData);
      vi.mocked(mockServices.updateItem).mockResolvedValue(mockResult);

      const result = await modals.saveEditModal(mockConfig);

      expect(vi.mocked(mockValidationManager.showError)).toHaveBeenCalledWith(
        'Error updating item: Update failed',
        false,
      );
      expect(result).toBe(false);
    });
  });

  describe('Edit State Management', () => {
    it('should track editing state correctly', async () => {
      const mockConfig = { entity: 'sensor.test' } as InventoryConfig;

      // Initially no item being edited
      let result = await modals.saveEditModal(mockConfig);
      expect(result).toBe(false);

      // Start editing an item
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback, mockTranslations);

      // Now editing should work (assuming validation passes)
      const mockValidation = { isValid: true, errors: [] };
      vi.mocked(FormUtils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(FormUtils.sanitizeItemData).mockReturnValue({} as ItemData);
      vi.mocked(mockServices.updateItem).mockResolvedValue({ success: true });

      result = await modals.saveEditModal(mockConfig);
      expect(result).toBe(true);

      // Closing edit modal should clear editing state
      modals.closeEditModal();
      result = await modals.saveEditModal(mockConfig);
      expect(result).toBe(false);
    });

    it('should not set editing state when item not found', async () => {
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: false });
      modals.openEditModal('Missing Item', mockGetFreshStateCallback, mockTranslations);

      // Should not be in editing state
      const result = await modals.saveEditModal({} as InventoryConfig);
      expect(result).toBe(false);
    });
  });

  describe('batch editor', () => {
    const config: InventoryConfig = { type: 'inventory-card', entity: 'sensor.inventory' };
    const milk: InventoryItem = {
      auto_add_enabled: false,
      auto_add_id_to_description_enabled: false,
      category: '',
      description: '',
      expiry_date: '',
      location: '',
      name: 'Milk',
      quantity: 3,
      todo_list: '',
      unit: 'L',
      batches: [],
    };
    const removeB2 = { kind: 'remove', batchId: 'b2' } as const;
    const wholeMilk: ItemData = {
      aliases: '',
      autoAddEnabled: false,
      autoAddIdToDescriptionEnabled: false,
      autoAddToListQuantity: 0,
      barcode: '',
      category: '',
      description: '',
      desiredQuantity: 0,
      expiryAlertDays: 0,
      expiryDate: '',
      location: '',
      name: 'Whole Milk',
      price: 0,
      quantity: 1,
      todoList: '',
      todoQuantityPlacement: 'name',
      unit: '',
    };

    beforeEach(() => {
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true, item: milk });
      vi.mocked(mockFormManager.getRawEditModalData).mockReturnValue({} as RawFormData);
      vi.mocked(FormUtils.validateRawFormData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(FormUtils.convertRawFormDataToItemData).mockReturnValue(wholeMilk);
      vi.mocked(mockServices.updateItem).mockResolvedValue({ success: true });
      modals.openEditModal('Milk', mockGetFreshStateCallback, mockTranslations);
    });

    it('fills the batch editor with the item being edited', () => {
      expect(mockBatchEditor.open).toHaveBeenCalledWith(milk, mockTranslations);
    });

    it('saves the item first, then the batch changes, then refreshes', async () => {
      mockBatchEditor.collect.mockReturnValue({ valid: true, operations: [removeB2] });

      expect(await modals.saveEditModal(config)).toBe(true);

      expect(mockServices.updateItem).toHaveBeenCalledWith(
        'inventory_sensor.inventory',
        'Milk',
        wholeMilk,
      );
      expect(mockBatchEditor.apply).toHaveBeenCalledWith(
        mockServices,
        'inventory_sensor.inventory',
        'Whole Milk',
        [removeB2],
      );
      expect(vi.mocked(mockServices.updateItem).mock.invocationCallOrder[0]).toBeLessThan(
        mockBatchEditor.apply.mock.invocationCallOrder[0],
      );
      expect(mockOnDataChanged).toHaveBeenCalled();
    });

    it('rejects invalid batch input before saving anything', async () => {
      mockBatchEditor.collect.mockReturnValue({
        valid: false,
        message: 'Batch quantity must be a number of 0 or more',
      });

      expect(await modals.saveEditModal(config)).toBe(false);
      expect(mockServices.updateItem).not.toHaveBeenCalled();
      expect(mockValidationManager.showError).toHaveBeenCalledWith(
        'Batch quantity must be a number of 0 or more',
        false,
      );
    });

    it("shows the integration's batch_required message and skips batch changes", async () => {
      const message = "Milk has 2 batches; change the batch itself instead of the item's price";
      vi.mocked(mockServices.updateItem).mockResolvedValue({
        success: false,
        error: message,
        errorCode: 'batch_required',
      });

      expect(await modals.saveEditModal(config)).toBe(false);
      expect(mockValidationManager.showError).toHaveBeenCalledWith(
        `Error updating item: ${message}`,
        false,
      );
      expect(mockBatchEditor.apply).not.toHaveBeenCalled();
    });

    it('keeps the modal open on a batch failure and retries under the new name', async () => {
      mockBatchEditor.collect.mockReturnValue({ valid: true, operations: [removeB2] });
      mockBatchEditor.apply.mockResolvedValueOnce({
        success: false,
        error: 'Error updating batch: nope',
      });

      expect(await modals.saveEditModal(config)).toBe(false);
      expect(mockValidationManager.showError).toHaveBeenCalledWith(
        'Error updating batch: nope',
        false,
      );
      expect(mockUIManager.closeEditModal).not.toHaveBeenCalled();
      // The item update landed: the card must refresh, which it defers until the modal closes.
      expect(mockOnDataChanged).toHaveBeenCalledTimes(1);

      expect(await modals.saveEditModal(config)).toBe(true);
      expect(mockServices.updateItem).toHaveBeenLastCalledWith(
        'inventory_sensor.inventory',
        'Whole Milk',
        wholeMilk,
      );
    });

    it('delegates remove toggles to the batch editor', () => {
      modals.toggleBatchRemoved('b2');
      expect(mockBatchEditor.toggleRemoved).toHaveBeenCalledWith('b2');
    });
  });
});
