import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modals, InventoryServices, InventoryServiceResult } from '../../src/services/modals';
import { ModalFormManager } from '../../src/services/modals/modalFormManager';
import { ModalValidationManager } from '../../src/services/modals/modalValidationManager';
import { ModalUIManager } from '../../src/services/modals/modalUIManager';
import { Utils } from '../../src/utils/utils';
import { HomeAssistant, InventoryConfig } from '../../src/types/home-assistant';
import { RawFormData, SanitizedItemData, ItemData } from '../../src/types/inventoryItem';
import { ValidationError } from '../../src/types/validationError';
import { createMockHomeAssistant } from '../testHelpers';

vi.mock('../../src/services/modals/modalFormManager');
vi.mock('../../src/services/modals/modalValidationManager');
vi.mock('../../src/services/modals/modalUIManager');
vi.mock('../../src/utils/utils');

describe('Modals (Integration)', () => {
  let modals: Modals;
  let mockShadowRoot: ShadowRoot;
  let mockServices: InventoryServices;
  let mockHass: HomeAssistant;
  let mockConfig: InventoryConfig;

  let mockGetInventoryId: (entityId: string) => string;
  let mockOnDataChanged: () => void;
  let mockFormManager: any;
  let mockValidationManager: any;
  let mockUIManager: any;
  let mockGetFreshStateCallback: () => { hass: HomeAssistant; config: InventoryConfig };

  beforeEach(() => {
    mockShadowRoot = {} as ShadowRoot;

    mockServices = {
      addItem: vi.fn(),
      updateItem: vi.fn(),
    } as any;

    mockHass = createMockHomeAssistant();
    mockConfig = {
      type: 'inventory-card',
      entity: 'sensor.test_inventory',
    };

    mockGetInventoryId = vi.fn((entityId: string) => `inventory_${entityId}`);
    mockOnDataChanged = vi.fn();
    mockGetFreshStateCallback = vi.fn(() => ({ hass: mockHass, config: mockConfig }));

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

    vi.mocked(ModalFormManager).mockImplementation(() => mockFormManager);
    vi.mocked(ModalValidationManager).mockImplementation(() => mockValidationManager);
    vi.mocked(ModalUIManager).mockImplementation(() => mockUIManager);

    modals = new Modals(mockShadowRoot, mockServices, mockGetInventoryId, mockOnDataChanged);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Construction', () => {
    it('should create all manager instances', () => {
      expect(ModalFormManager).toHaveBeenCalledWith(mockShadowRoot);
      expect(ModalValidationManager).toHaveBeenCalledWith(mockShadowRoot);
      expect(ModalUIManager).toHaveBeenCalledWith(
        mockShadowRoot,
        mockFormManager,
        mockValidationManager,
      );
    });

    it('should work without onDataChanged callback', () => {
      const modalsWithoutCallback = new Modals(mockShadowRoot, mockServices, mockGetInventoryId);
      expect(modalsWithoutCallback).toBeDefined();
    });
  });

  describe('Public API Delegation', () => {
    it('should delegate modal operations to UIManager', () => {
      modals.openAddModal();
      expect(vi.mocked(mockUIManager.openAddModal)).toHaveBeenCalled();

      modals.closeAddModal();
      expect(vi.mocked(mockUIManager.closeAddModal)).toHaveBeenCalled();

      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback);
      expect(vi.mocked(mockUIManager.openEditModal)).toHaveBeenCalledWith(
        'Test Item',
        mockGetFreshStateCallback,
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
      name: 'Test Item',
      quantity: '5',
      autoAddEnabled: false,
      autoAddToListQuantity: '0',
      todoList: '',
      expiryDate: '',
      expiryAlertDays: '7',
      category: 'Food',
      unit: 'pcs',
    };

    beforeEach(() => {
      vi.mocked(mockFormManager.getRawAddModalData).mockReturnValue(mockRawFormData);
    });

    it('should successfully add item with valid data', async () => {
      const mockValidation = { isValid: true, errors: [] };
      const mockItemData: ItemData = { name: 'Test Item', quantity: 5 };
      const mockSanitizedData: SanitizedItemData = {
        name: 'Test Item',
        quantity: 5,
        category: 'Food',
        unit: 'pcs',
        autoAddEnabled: false,
        autoAddToListQuantity: 0,
        todoList: '',
        expiryDate: '',
        expiryAlertDays: 7,
      };
      const mockResult: InventoryServiceResult = { success: true };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue(mockItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue(mockSanitizedData);
      vi.mocked(mockServices.addItem).mockResolvedValue(mockResult);

      const result = await modals.addItem(mockConfig);

      expect(vi.mocked(mockValidationManager.clearError)).toHaveBeenCalledWith(true);
      expect(vi.mocked(mockFormManager.getRawAddModalData)).toHaveBeenCalled();
      expect(Utils.validateRawFormData).toHaveBeenCalledWith(mockRawFormData);
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

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);

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

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue({} as SanitizedItemData);
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
      name: 'Updated Item',
      quantity: '10',
      autoAddEnabled: true,
      autoAddToListQuantity: '2',
      todoList: 'shopping',
      expiryDate: '2024-12-31',
      expiryAlertDays: '7',
      category: 'Food',
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
      modals.openEditModal('Test Item', mockGetFreshStateCallback);

      const mockValidation = { isValid: true, errors: [] };
      const mockItemData: ItemData = { name: 'Updated Item', quantity: 10 };
      const mockSanitizedData: SanitizedItemData = {
        name: 'Updated Item',
        quantity: 10,
        category: 'Food',
        unit: 'pcs',
        autoAddEnabled: true,
        autoAddToListQuantity: 2,
        todoList: 'shopping',
        expiryDate: '2024-12-31',
        expiryAlertDays: 7,
      };
      const mockResult: InventoryServiceResult = { success: true };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue(mockItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue(mockSanitizedData);
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

    it('should handle validation errors in edit mode', async () => {
      vi.mocked(mockUIManager.openEditModal).mockReturnValue({ found: true });
      modals.openEditModal('Test Item', mockGetFreshStateCallback);

      const mockValidation = {
        isValid: false,
        errors: [{ field: 'quantity', message: 'Invalid quantity' } as ValidationError],
      };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);

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
      modals.openEditModal('Test Item', mockGetFreshStateCallback);

      const mockValidation = { isValid: true, errors: [] };
      const mockResult: InventoryServiceResult = { success: false, error: 'Update failed' };

      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue({} as SanitizedItemData);
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
      modals.openEditModal('Test Item', mockGetFreshStateCallback);

      // Now editing should work (assuming validation passes)
      const mockValidation = { isValid: true, errors: [] };
      vi.mocked(Utils.validateRawFormData).mockReturnValue(mockValidation);
      vi.mocked(Utils.convertRawFormDataToItemData).mockReturnValue({} as ItemData);
      vi.mocked(Utils.sanitizeItemData).mockReturnValue({} as SanitizedItemData);
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
      modals.openEditModal('Missing Item', mockGetFreshStateCallback);

      // Should not be in editing state
      const result = await modals.saveEditModal({} as InventoryConfig);
      expect(result).toBe(false);
    });
  });
});
