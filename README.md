# Simple Inventory Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)

A Lovelace card for the [Simple Inventory](https://github.com/blaineventurine/simple_inventory) integration. Manage your household inventory directly from the Home Assistant dashboard.

## Installation

Install the [Simple Inventory](https://github.com/blaineventurine/simple_inventory) integration first, then install this card:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=blaineventurine&repository=simple-inventory-card&category=Dashboard)

Or manually: copy `dist/simple-inventory-card.js` to your `www/` directory and add it as a Lovelace resource.

### Compatibility

This card requires Simple Inventory integration **0.7.0 or newer**. On load, the card asks the integration which API version it speaks (`simple_inventory/get_info`); if the integration is older, a warning banner appears at the top of the card until you update it.

Batch tracking (see [Batches](#batches)) needs integration **0.8.0 or newer**, which reports the `batches` feature through `get_info`. With 0.7.x the card works as before, without batch controls.

Moving stock between locations (the **Move** button on a batch row, see [Batches](#batches)) needs integration **0.9.0 or newer**, which reports the `transfers` feature. With 0.8.x the batch list works without it.

Item icons (the **Icon** field) need integration **0.10.0 or newer**, which reports the `item_icons` feature. With older integrations the field is hidden, every item shows the default icon, and the card never sends an icon.

Item images (photos on the rows and in the details, the **Image** field) need integration **0.11.0 or newer**, which reports the `item_images` feature. With older integrations the card shows no images and no image controls.

## Sidebar panel

Besides the dashboard card, the card package ships an optional full-page **Inventory** sidebar panel. It shows one tab per inventory, sorted by name; each tab is the full card for that inventory, with every field shown (the card's defaults). Tabs keep their state (filters, open sheets) while you switch between them, and each tab has its own URL, so back/forward and bookmarks work.

To enable it, open **Settings → Devices & services → Simple Inventory**, choose the integration's global entry and press **Configure**, then turn on the panel option. A second option limits the panel to administrators.

The panel needs the integration release that adds the panel (it reports the `panel` feature through `get_info`). With an older integration the panel shows an "update the integration" message.

HACS installs the panel file (`simple-inventory-panel.js`) together with the card; no extra resource is needed. For a manual install, copy `dist/simple-inventory-panel.js` next to `simple-inventory-card.js` in `www/community/simple-inventory-card/`. If the file is missing while the panel is enabled, the integration raises a repair issue.

### Home

With an integration that reports the `overview` feature through `get_info`, the panel's first tab is **Home**, and the panel opens on it (`/simple-inventory/home`; an address without a tab, or with an unknown one, goes there too). With an older integration there is no Home tab and the panel opens on the first inventory, as before.

Home shows:

- **A card per inventory**: its icon and name, the number of items, the total value when it is above 0 (in Home Assistant's currency), and a "N need attention" badge (red when something has expired, amber otherwise). Tap a card to open that inventory's tab.
- **What needs attention across all inventories**, in the sections Expired, Expiring soon, Out of stock and Low stock. Each item appears once, in its most urgent section. Every row says why it is listed: "Expired 3 days ago", "Expires tomorrow", "Out of stock" or "Low: 1 left, need 3", plus "2 of 3 batches" when only some of the item's batches have expired or are expiring. Sections show their first 5 items; **Show all** lists the rest. Empty sections are hidden, and with nothing to show Home says "Everything is stocked and fresh".

The rows work like search results: **−** / **+** change the quantity in the row's own inventory, and a tap on the name or photo opens the item's edit sheet in its tab (**back** returns to Home). Home updates live when any inventory changes.

### Item page

In the panel, tapping a tile (an inventory shown as tiles) opens the item's own page instead of the edit sheet; on a dashboard, a tile still opens the edit sheet, and list rows, search results and Home rows keep opening the edit sheet everywhere. The page has its own address (`/simple-inventory/<inventory>/item/<item id>`), so it can be bookmarked and survives a rename.

The page shows, side by side on wide screens and stacked on phones:

- a header with a back arrow, the item's name, its status (Expired, Expiring soon, Low stock or Out of stock) and **Edit**, which opens the usual edit sheet (deleting stays in the sheet's menu);
- the photo (tap it for the full-screen viewer) or the item's icon;
- the facts that are set: the quantity with **−** / **+**, locations, categories, unit price and total value, the earliest expiry, the auto-add rule, barcodes, aliases and the description;
- the batches, with **Restock…** and **Move** as in the list's details;
- the History and Consumption view, which refreshes shortly after the item changes.

The page updates live like the list. If the item is deleted while its page is open, or a link points to an item that no longer exists, the page says so and offers a way back.

The back arrow returns to the grid as you left it (its search, filters, layout and scroll position). On a page opened from a link it replaces the page with the inventory's tab instead.

### Panel width

The panel's width follows the view: an inventory shown as a list stays at a readable 760 px, while Home, an inventory shown as tiles and an item page use up to 1440 px. On wide screens Home's sections sit side by side in two columns; below about 1,120 px they stack.

### Search all inventories

The magnifier on the right of the panel's toolbar searches every inventory at once. Type at least 2 characters; matching is case-insensitive (but not accent-insensitive) and finds an item by its name, aliases, barcodes, categories, locations (its own and its batches'), description or unit. Results are ranked: exact name first, then names starting with the text, names containing it, then aliases, barcodes, categories, locations, description and unit. At most 50 results are shown; refine the search when the list says so.

Each result shows the item's inventory and locations and, unless the name matched, why it matched (e.g. "alias: Double A" or "barcode: 4006381333931"). The **−** / **+** buttons change the quantity right in the results, and the list updates live when any inventory changes. Tap a result's name or photo to open its edit sheet in its inventory's tab; **back** returns to the results.

The barcode button next to the field scans a barcode with the camera (or a photo, see [Camera notes](#camera-notes)) and searches for it.

Search has its own URL (`/simple-inventory/search?q=…`), so a search can be bookmarked. **✕** or **Escape** returns to the tab you came from; a tab click leaves search too.

Search needs the integration release that adds it (it reports the `search` feature through `get_info`); with an older integration the magnifier is not shown.

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
| `show_price`         | `true`  | Show total value                |
| `show_icon`          | `true`  | Show item icons and photos      |
| `show_header`        | `true`  | Show card header row            |
| `show_search`        | `true`  | Show search and filters         |
| `show_sort`          | `true`  | Show sorting controls           |
| `show_add_button`    | `true`  | Show add button                 |
| `layout`             | `list`  | `list` or `tiles` (see below)   |

With `show_icon` off, expired and expiring-soon/low rows get a short red or amber bar at the left edge instead, so their status stays visible. A row whose item has a photo shows the photo in the circle and uses the same bar for its status. `show_icon: false` hides the row photos too; the details panel still shows the image.

## Features

### Item Management

- **Add items** — tap the round **+** next to the search field to open the add dialog with all available fields
- **Edit items** — tap an item's icon or name to edit its details
- **Item icons** — with integration 0.10.0 or newer, the add/edit dialog has an **Icon** field under the name. Pick any Material Design icon with Home Assistant's icon picker; where the picker isn't loaded, type the icon as `prefix:name` (e.g. `mdi:apple`) and watch the preview. Leave it empty for the default icon (`mdi:package-variant`). The icon sits in the item's tinted circle, coloured by its stock status.
- **Item images** — with integration 0.11.0 or newer, the add/edit dialog has an **Image** field under the icon: one row with the preview, **Photo**, **Media** and the delete button. **Photo** opens the phone's camera or photo library (any image file on a computer, up to 10 MB). **Media** opens Home Assistant's media browser, where only images in your local media folders can be used; it appears where Home Assistant's media browser is available. The delete button (**Remove image**) clears the image. A line under the row says what saving will do; the change is saved with **Add Item** or **Save Changes**; a new item is created first and gets its image right after. If the image cannot be saved, a message says so and the item stays saved. When a barcode lookup in the Add Item dialog finds a product photo, the dialog offers it with **Use product photo** (ticked by default). The integration keeps its own copy of every image (resized, inside the Home Assistant config folder, so backups include it): the row shows it in place of the icon, the details panel larger.
- **Delete items** — in the edit dialog, open the ⋮ menu and delete the item (asks for confirmation)
- **Increment/Decrement** — use the − and + around the quantity on each row; quantities show without trailing zeros (2.5, 8)
- **Details** — the chevron on a row opens its details: the image, the description, the auto-add rule and, with batches, the batch list. It only appears when there is something to show (with batches, on every row).
- **Full-screen photo** — tap the image in a row's details, or the preview in the add/edit dialog, to see the photo full screen with the item's name. Close it with ✕, Esc, a tap beside the photo, or the phone's or browser's back gesture (the dialog underneath stays open).

### Look and Layout

The card follows your Home Assistant theme (light, dark or custom). Each item shows a tinted icon circle coloured by status: grey when out of stock, the theme's error colour when expired, its warning colour when expiring soon or at the auto-add threshold, otherwise the primary colour. Under the name, one line lists locations, categories, expiry and total value; each part follows its `show_*` option. On screens up to 600 px wide, dialogs open as bottom sheets; on wider screens they open centred. Buttons grow on touch screens.

### Tile layout

The items can show as a list of rows or as a grid of tiles. Each tile has a large photo (or, without one, the item's icon on a status-tinted background), a badge for expired, expiring-soon and low-stock items, the name on up to two lines, the same one-line summary as the row (each part follows its `show_*` option) and the − / + stepper. Tap the photo or the name to edit the item. With category or location sorting, each group gets its heading above its own grid. The grid always has at least two columns (narrow dashboard columns included) and tiles of about 160 px where there is room for more: two columns on a phone, four in the sidebar panel.

- **Toggle** — the grid/list button next to the sort chip (**Tile layout**, pressed while tiles are shown) switches the layout; it is shown together with the sort controls. The choice is remembered per inventory in this browser, so the sidebar panel and a dashboard card for the same inventory share it.
- **`layout` option** — the card editor's **Show items as tiles** switch (YAML `layout: tiles`) sets the layout used until you pick one with the toggle; a choice made with the toggle wins.
- **Photos** — tiles show photos with integration item images (`item_images`, 0.11.0 or newer). Integrations that report `tile_images` serve a 384 px tile image (`?tile=1`), so tiles are sharp and light; older ones get the full image. `show_icon: false` shows the icon instead of the photo.
- **Batches and moves** — the details panel (batch list, restock and move forms) is only in the list layout; on tiles, use the edit dialog's batch editor or switch to the list.

### Batches

With Simple Inventory 0.8.0 or newer, an item's stock is kept in batches: lots with their own quantity, expiry date, location, unit price and purchase date. The item row still shows the total quantity; the card adds:

- **Batch list** — the row's chevron opens the item's details with its batches, next to be used first. Each batch shows its quantity, location, expiry and unit price on one line. The chevron works with keyboard and touch and announces whether the details are open; they stay open while the card refreshes.
- **Use from a specific batch** — the − on a batch row takes from that batch only (at most 1 unit). The row's own − still uses the soonest-expiring stock first.
- **Move stock** — with integration 0.9.0 or newer, each batch row has a Move button (two-arrows icon) next to its −. It opens a small form with the amount (the whole batch by default) and the destination (suggested from your locations; a new name creates the location). **Move** keeps the batch's expiry date, unit price and purchase date, and stock matching a batch already at the destination joins it. The destination also becomes one of the item's usual locations. If the integration refuses the move (for example the batch holds less than the amount), the form stays open with its message. The item's history lists the move as a transfer.
- **Restock with details** — the row's + stays a one-tap restock (no expiry, the item's first location, its last price). To record an expiry date, location, unit price or purchase date, use **Restock…** at the bottom of the batch list. A restock with the same expiry, location and price as an existing batch is merged into it.
- **Scan to restock** — after scanning a known item with *Increment*, open **Batch details** to set the same fields.
- **Edit batches** — the edit dialog lists every batch. Change a batch's quantity (0 removes it), expiry, location, unit price or purchase date, or mark it for removal, then **Save Changes**. While an item has batches (or new batch rows), its quantity field shows the read-only total of all batches. An item with more than one batch has no single expiry date, so the item's expiry field is hidden; changing the item's unit price while it has several batches is refused by the integration with a message telling you to change the batches instead.
- **Add a batch** — three ways:
  - **Restock…** in the item's batch list (see above).
  - **+ Add batch** at the end of the edit dialog's batch list (also shown when the item has no stock). Each click adds a row for quantity (required, above 0), expiry, location, unit price and purchase date; ✕ discards an unsaved row. **Save Changes** saves the item first, then edits and removals of existing batches, then the new batches. If one fails, the dialog stays open with the integration's message; batches already added are not sent again when you save once more.
  - **Add Item** with the name of an existing item (any capitalisation): next to the "already exists" error, the card offers **Add {quantity} as a new batch of {name}**. It adds the form's quantity with its expiry date, first location and unit price to the existing item; the other fields (description, category, barcode, aliases, auto-add) are not applied.

  New stock with the same expiry date, location and unit price as an existing batch is added to that batch instead of creating a new one. A blank location means the item's first usual location and a blank price its current price; the edit dialog shows "Will be added to the existing batch (…)" under a new row when that will happen.
- **Expiry** — the row's expiry text, expiry filters, expiry sort and the header's expiry chips use the item's earliest batch expiry. The header chips count items (the rows their filter shows); the integration's expiry sensors list each batch.

### Real-Time Updates

The card subscribes to its inventory over Home Assistant's WebSocket (`simple_inventory/subscribe`). When any item changes — whether from the card, another device, a service call, or an automation — the backend sends the new item list and the card updates within a moment, without polling or reloading. Updates wait while a Restock/Move form, the add, edit or history sheet, the barcode scanner, or the import result is open and apply when it closes; a burst of changes renders once. After the connection drops and comes back, or the card is shown again, it subscribes again and fetches the list once. With an integration that has no subscription (or while Home Assistant is still starting and refuses it), the card refreshes when the inventory sensor changes and tries to subscribe again.

### Search and Filtering

**Text search** searches across item names, aliases, units, descriptions, barcodes (any part of the digits), locations, and categories with a 300ms debounce.

**Advanced filters** (toggle with the filter button next to the search field; a dot on it means filters are active). Tap a field to show its options as chips; **Apply** applies them and closes the panel, **Clear All Filters** resets them:

| Filter   | Options                                        |
| -------- | ---------------------------------------------- |
| Category | Multi-select from categories in your inventory |
| Location | Multi-select from locations in your inventory; matches an item's usual locations and the locations that currently hold its stock |
| Quantity | Zero, Non-zero                                 |
| Expiry   | No Expiry, Expired, Expiring Soon, Future      |

Active filters appear as chips in the row under the search field, next to the sort chip; ✕ on a chip removes that filter. Filters persist in browser local storage per entity.

### Sorting

Sort items with the sort chip at the start of the chip row under the search field (e.g. "Sort: Name"):

| Sort Method     | Description                                   |
| --------------- | --------------------------------------------- |
| Name            | Alphabetical (default)                        |
| Category        | Grouped by category                           |
| Location        | Grouped by location                           |
| Quantity (High) | Highest quantity first                        |
| Quantity (Low)  | Lowest quantity first                         |
| Expiry Date     | Soonest expiration first                      |
| Zero Last       | Items with zero quantity sorted to the bottom |

When sorting by category or location, items are grouped under headings with a count (e.g. "PANTRY · 6").

### Expiry Chips

The card header shows chips with the number of expired and expiring-soon items; tap one to show just those items:

- **Expired** (red) — Items past their expiry date
- **Expiring soon** (amber) — Items within their alert threshold

### Multi-Value Locations and Categories

Items can have multiple locations and categories. The add/edit dialogs use a multi-select dropdown with checkboxes. Values are stored as comma-separated strings.

### Barcodes

Each item can have one or more barcodes associated with it. Enter barcodes manually in the add/edit dialog, or use the camera scan button to scan UPC/EAN barcodes with your device camera. When a barcode is scanned or entered, the card automatically looks up the product name from Open Food Facts and pre-fills the item name if found.

Barcodes can also be used to identify items in automations (e.g. scan-to-increment).

#### Quick Scan from Header

The card header includes a scan button (barcode icon) for quickly incrementing or decrementing an existing item without opening a dialog. Tap the scan button to open the camera, scan a barcode, then choose increment/decrement and an amount before confirming. The scanned barcode is resolved across all inventories automatically via the `scan_barcode` service.

#### Camera notes

These apply to all three scanners: the header's quick scan, the barcode field of the add/edit dialogs and the panel's search.

- **HTTPS is required for the camera.** Browsers only let a page use the camera over a secure (HTTPS) connection to Home Assistant. Over plain HTTP the scanner says "The camera needs a secure (HTTPS) connection to Home Assistant" and offers **Choose a photo** instead.
- **Photo fallback.** When the camera can't start (access denied, no camera), the scanner keeps the error and offers **Choose a photo**: take a picture or pick one, and its barcode is used just like a live scan. Where the browser has no camera support at all, the photo picker opens right away.
- **Resolution.** The live scanner asks the back camera for 1920×1080; a camera without that mode uses its closest one.
- **Home Assistant app.** In the Home Assistant companion app with a built-in barcode scanner, the scanners open the app's own scanner instead (it works over HTTP too, and reads every format the app supports, QR codes included). Its **Choose a photo** button returns to the card, which offers **Choose a photo** there.

### Auto-Add to Todo List

Configure items to be automatically added to a Home Assistant todo list when stock drops below a threshold. In the add/edit dialog (Shopping list section):

1. Turn on "Auto-add to todo list when low"
2. Set the threshold quantity (when to trigger)
3. Optionally set a desired quantity (how much to buy)
4. Select the target todo list entity
5. Choose where the needed quantity appears: in the item name (e.g. "Milk (x4)"), in the description, or hidden

### Item History and Consumption Analytics

View the change history for any item from the ⋮ menu of the edit dialog. The history dialog switches between two views with the segmented control at its top:

**History** — A timeline of all changes (add, increment, decrement, transfer, update, import, remove), each marked with its own icon, with before/after quantities and timestamps.

**Consumption** — Analytics calculated from your decrement history:

| Metric      | Description                                                |
| ----------- | ---------------------------------------------------------- |
| Daily rate  | Average units consumed per day                             |
| Weekly rate | Average units consumed per week                            |
| Days Left   | Estimated days until the item runs out at the current rate |
| Avg Restock | Average days between restocking events                     |
| Total Used  | Total units consumed over the period                       |
| Events      | Number of decrement events tracked                         |

Above the metrics, two mini-charts visualize the selected window:

- **Stock level** — a stepped line of the quantity after each event, so you can see consume/restock cycles at a glance.
- **Consumption** — bars of units consumed per day (30d window) or per week/month (longer windows).

Rates and totals include the item's unit when one is set (e.g. `3.5 L/day`), and spend metrics use your Home Assistant currency setting.

Use the time window chips (30d / 60d / 90d / All) to change the calculation period. A shorter window reflects recent consumption patterns, while "All" averages across your entire history.

The consumption view requires at least 2 decrement events before it can calculate rates. Until then, it shows your progress (e.g. "1 of 2 consumption events recorded") — and the stock-level chart appears as soon as a single event exists.

### Import and Export

Access import/export from the overflow menu (three-dot button) in the card header:

- **Export** — Download your inventory as JSON
- **Import** — Upload JSON or CSV data. A sheet then shows how many items were added, updated and skipped, plus the first errors; the list refreshes when you close it.

### Translations

The card supports localization. Translation files are loaded from the integration and the card adapts to the user's Home Assistant language setting.

## Notes

- The built-in `todo.shopping_list` does not support item descriptions, so description-based features (description quantity placement, inventory ID in description) only work with other todo list integrations.
- `desired_quantity` of 0 is displayed as blank in the UI, meaning "use the threshold-based formula instead."
