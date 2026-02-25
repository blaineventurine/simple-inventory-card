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

Each item can have one or more barcodes associated with it. Enter barcodes manually in the add/edit modal, or use the camera scan button to scan UPC/EAN barcodes with your device camera. When a barcode is scanned or entered, the card automatically looks up the product name from Open Food Facts and pre-fills the item name if found.

Barcodes can also be used to identify items in automations (e.g. scan-to-increment).

#### Quick Scan from Header

The card header includes a scan button (barcode icon) for quickly incrementing or decrementing an existing item without opening any modal. Tap the scan button to open the camera, scan a barcode, then choose increment/decrement and an amount before confirming. The scanned barcode is resolved across all inventories automatically via the `scan_barcode` service.

> **Note:** Camera barcode scanning requires your Home Assistant instance to be accessed over HTTPS. Browsers block camera access on insecure (HTTP) connections, and the Home Assistant Companion app does not handle this automatically. Ensure you have SSL/TLS configured (e.g. via Nabu Casa, a reverse proxy, or the `ssl` configuration in Home Assistant) before expecting the camera to work.

#### Setting up HTTPS with a self-signed certificate

If you don't have an external domain or a Nabu Casa subscription, the easiest approach is [`mkcert`](https://github.com/FiloSottile/mkcert), a tool that creates a local certificate authority (CA) and signs certificates with it. This is the recommended approach — plain self-signed certificates cannot be trusted as a root CA on iOS, which means camera access will not work regardless of what you do in the browser.

Camera access requires the certificate to be **installed and trusted** at the OS level on each device. Clicking through the browser's "Not secure" warning is not enough.

**1. Install mkcert and generate the certificate**

Replace `192.168.1.X` with your Home Assistant server's local IP address.

```bash
# macOS
brew install mkcert

# Windows (choose one)
choco install mkcert
# or
scoop bucket add extras && scoop install mkcert

# Linux: see https://github.com/FiloSottile/mkcert#linux

# Create and trust the local CA on this machine, then generate the certificate
mkcert -install
mkcert 192.168.1.X
```

This produces `192.168.1.X.pem` (certificate) and `192.168.1.X-key.pem` (private key) in the current directory.

**2. Place the certificate files in Home Assistant**

Copy both files to the `ssl/` folder inside your Home Assistant configuration directory. On Home Assistant OS this is `/ssl/` on the host; adjust the path if you're using Docker.

**3. Configure Home Assistant**

Add or update the `http` section in `configuration.yaml`:

```yaml
http:
  ssl_certificate: /ssl/192.168.1.X.pem
  ssl_key: /ssl/192.168.1.X-key.pem
```

Restart Home Assistant. Your instance will now be available at `https://192.168.1.X:8123`.

**4. Trust the mkcert CA on each device**

`mkcert -install` already trusts the CA on the machine where you ran it. For other devices, you need to install the mkcert root CA — not the certificate itself. Find it with:

```bash
mkcert -CAROOT
# prints the directory, e.g. /Users/you/Library/Application Support/mkcert/
```

The file you need is `rootCA.pem` in that directory.

- **iOS / iPadOS**: AirDrop `rootCA.pem` to the device and open it. Go to **Settings → General → VPN & Device Management** and install the profile. Then go to **Settings → General → About → Certificate Trust Settings** and enable full trust for the mkcert CA.
- **Android**: Transfer `rootCA.pem` to the device, then go to **Settings → Security → Encryption & credentials → Install a certificate → CA certificate** and select it. The exact path varies by manufacturer.
- **macOS** (other machines): Copy `rootCA.pem`, double-click it to add it to Keychain Access, then double-click the entry in the **System** keychain, expand **Trust**, and set **When using this certificate** to **Always Trust**.
- **Windows** (other machines): Double-click `rootCA.pem`, click **Install Certificate**, choose **Local Machine**, select **Place all certificates in the following store**, browse to **Trusted Root Certification Authorities**, and complete the wizard.

After installing the CA, open `https://192.168.1.X:8123` — the browser should show a valid certificate and the camera scan button will function.

> **Renewal**: mkcert certificates expire after ~2 years. When they do, re-run `mkcert 192.168.1.X`, replace the files in Home Assistant, and restart. You do not need to reinstall the CA on your devices.

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
