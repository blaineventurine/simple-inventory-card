# Simple Inventory Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)

A Lovelace card for the [Simple Inventory](https://github.com/blaineventurine/simple_inventory) integration. Manage your household inventory directly from the Home Assistant dashboard.

## Installation

Install the [Simple Inventory](https://github.com/blaineventurine/simple_inventory) integration first, then install this card:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=blaineventurine&repository=simple-inventory-card&category=Dashboard)

Or manually: copy `dist/simple-inventory-card.js` to your `www/` directory and add it as a Lovelace resource.

## Card Configuration

Add the card via the UI editor or YAML. The only required option is the inventory entity:

```yaml
type: custom:simple-inventory-card
entity: sensor.kitchen_inventory
```

### Display Options

The card editor lets you toggle which fields are shown on each item row:

| Option               | Default | Description                     |
| -------------------- | ------- | ------------------------------- |
| `show_description`   | `true`  | Show item descriptions          |
| `show_location`      | `true`  | Show item locations             |
| `show_category`      | `true`  | Show item categories            |
| `show_expiry`        | `true`  | Show expiration dates           |
| `show_auto_add_info` | `true`  | Show auto-add to todo list info |
| `show_header`        | `true`  | Show card header row            |
| `show_search`        | `true`  | Show search and filters         |
| `show_sort`          | `true`  | Show sorting controls           |
| `show_add_button`    | `true`  | Show add button                 |

## Features

### Item Management

- **Add items** — Click the "+" button to open the add item modal with all available fields
- **Edit items** — Click an item row to edit its details
- **Delete items** — Remove items from the edit modal
- **Increment/Decrement** — Use the +/- buttons on each item row to adjust quantity

### Real-Time Updates

The card uses WebSocket subscriptions (`simple_inventory/subscribe`) for real-time updates. When any item changes — whether from the card, a service call, or an automation — the card updates immediately without polling.

### Search and Filtering

**Text search** searches across item names, descriptions, locations, and categories with a 300ms debounce.

**Advanced filters** (toggle with the "Filters" button):

| Filter   | Options                                        |
| -------- | ---------------------------------------------- |
| Category | Multi-select from categories in your inventory |
| Location | Multi-select from locations in your inventory  |
| Quantity | Zero, Non-zero                                 |
| Expiry   | No Expiry, Expired, Expiring Soon, Future      |

Active filters are shown as badges above the item list. Filters persist in browser local storage per entity.

### Sorting

Sort items by:

| Sort Method     | Description                                   |
| --------------- | --------------------------------------------- |
| Name            | Alphabetical (default)                        |
| Category        | Grouped by category                           |
| Location        | Grouped by location                           |
| Quantity (High) | Highest quantity first                        |
| Quantity (Low)  | Lowest quantity first                         |
| Expiry Date     | Soonest expiration first                      |
| Zero Last       | Items with zero quantity sorted to the bottom |

When sorting by category or location, items are grouped under headers.

### Expiry Badges

The card header shows badge counts for expired and expiring-soon items, with distinct icons:

- **Expired** (red) — Items past their expiry date
- **Expiring soon** (amber) — Items within their alert threshold

### Multi-Value Locations and Categories

Items can have multiple locations and categories. The add/edit modals use a multi-select dropdown with checkboxes. Values are stored as comma-separated strings.

### Barcodes

Each item can have a barcode associated with it. Enter barcodes in the add/edit modal. Barcodes can be used to identify items in automations (e.g. scan-to-increment).

### Auto-Add to Todo List

Configure items to be automatically added to a Home Assistant todo list when stock drops below a threshold. In the add/edit modal:

1. Enable "Auto-add to todo list"
2. Set the threshold quantity (when to trigger)
3. Optionally set a desired quantity (how much to buy)
4. Select the target todo list entity
5. Choose where the needed quantity appears: in the item name (e.g. "Milk (x4)"), in the description, or hidden

### Item History and Consumption Analytics

View the change history for any item from the edit modal. The history modal has two tabs:

**History tab** — A timeline of all changes (add, increment, decrement, update, remove) with before/after quantities and timestamps.

**Consumption tab** — Analytics calculated from your decrement history:

| Metric      | Description                                                |
| ----------- | ---------------------------------------------------------- |
| Daily rate  | Average units consumed per day                             |
| Weekly rate | Average units consumed per week                            |
| Days Left   | Estimated days until the item runs out at the current rate |
| Avg Restock | Average days between restocking events                     |
| Total Used  | Total units consumed over the period                       |
| Events      | Number of decrement events tracked                         |

Use the time window pills (30d / 60d / 90d / All) to change the calculation period. A shorter window reflects recent consumption patterns, while "All" averages across your entire history.

The consumption tab requires at least 2 decrement events before it can calculate rates. Until then, it shows a "not enough data" message.

### Import and Export

Access import/export from the overflow menu (three-dot button) in the card header:

- **Export** — Download your inventory as JSON
- **Import** — Upload JSON or CSV data

### Translations

The card supports localization. Translation files are loaded from the integration and the card adapts to the user's Home Assistant language setting.

## Notes

- The built-in `todo.shopping_list` does not support item descriptions, so description-based features (description quantity placement, inventory ID in description) only work with other todo list integrations.
- `desired_quantity` of 0 is displayed as blank in the UI, meaning "use the threshold-based formula instead."
