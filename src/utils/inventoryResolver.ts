import { DEFAULT_INVENTORY_NAME } from './constants';
import { HassEntity, HomeAssistant } from '../types/homeAssistant';

export const InventoryResolver = {
  getInventoryName(state: HassEntity | undefined, entityId: string): string {
    if (state?.attributes?.friendly_name?.trim()) {
      return state.attributes.friendly_name;
    }

    const nameParts = entityId.split('.');
    if (nameParts.length > 1) {
      const entityName = nameParts.at(-1);
      const words = entityName
        ?.split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .filter((word) => word.toLowerCase() !== 'inventory');

      const result = words?.join(' ').trim();
      return result || DEFAULT_INVENTORY_NAME;
    }

    return DEFAULT_INVENTORY_NAME;
  },

  getInventoryDescription(state: HassEntity | undefined): string | undefined {
    if (state?.attributes?.description) {
      return state.attributes.description;
    }
    return undefined;
  },

  getInventoryId(hass: HomeAssistant, entityId: string): string {
    const state = hass.states[entityId];
    if (state?.attributes?.inventory_id) {
      return state.attributes.inventory_id;
    }

    if (state?.attributes?.unique_id) {
      const uniqueId = state.attributes.unique_id;
      if (typeof uniqueId === 'string' && uniqueId.startsWith('inventory_')) {
        return uniqueId.slice(10);
      }
    }

    const parts = entityId.split('.');
    return parts.length > 1 ? parts[1] : entityId;
  },

  extractTodoLists(hass: HomeAssistant): Array<{ id: string; name: string }> {
    return Object.keys(hass.states)
      .filter((entityId) => entityId.startsWith('todo.'))
      .map((entityId) => ({
        id: entityId,
        name: hass.states[entityId].attributes?.friendly_name || entityId.split('.')[1],
      }));
  },

  findInventoryEntities(hass: HomeAssistant): string[] {
    return Object.keys(hass?.states || {})
      .filter((entityId) => {
        if (!entityId.startsWith('sensor.')) {
          return false;
        }

        const hasInventoryInName = entityId.includes('inventory');
        const hasItemsAttribute = hass?.states[entityId]?.attributes?.inventory_id !== undefined;

        return hasInventoryInName && hasItemsAttribute;
      })
      .sort();
  },

  createEntityOptions(hass: HomeAssistant, entityIds: string[]) {
    return entityIds.map((entity) => ({
      value: entity,
      label: hass.states[entity]?.attributes?.friendly_name || entity,
    }));
  },
};
