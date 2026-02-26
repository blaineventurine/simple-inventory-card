# Contributing to Simple Inventory Card

## Development setup

```bash
npm install
```

Husky pre-commit hooks are installed automatically via the `prepare` lifecycle script.

## Development server

```bash
npm run dev
```

## Before opening a PR

All of the following must pass. CI enforces them automatically, but run them locally first.

### Type check

```bash
npm run type-check
```

Runs `tsc --noEmit` in strict mode. No implicit `any`, no unused locals or parameters.

### Lint

```bash
npm run lint
```

Runs ESLint with `@typescript-eslint` strict type-checked rules. Auto-fix with `npm run lint:fix`.

### Format

```bash
npm run format:check
```

Runs Prettier. Auto-fix with `npm run format`. Config: single quotes, semi-colons, 100-char lines, trailing commas everywhere.

### Translations

```bash
npm run check-translations
```

Validates that all locale files (`en.json`, `es.json`, etc.) have identical key structure. This runs during CI and will fail the build if any locale is missing keys or has extras.

### Tests

```bash
npm run test:run
```

Coverage should stay at or above **80%** across branches, functions, lines, and statements. Run with coverage:

```bash
npm run test:coverage
```

## Build

```bash
npm run build
```

Output is a single ES module at `dist/simple-inventory-card.js`, plus translation files at `dist/translations/`. The build must succeed before a PR can be merged.

## Code conventions

A few things that are easy to get wrong:

- **Translations**: always use `TranslationManager.localize(translations, key, params, fallback)` for any user-visible string. Never hardcode English text in templates. All locale files (`en`, `es`, `fr`, `it`, etc.) must be updated together — read only `en.json` to find the key path, then apply the same structural change to all four.
- **String templates**: this project uses plain template literals for HTML generation, not Lit's `html` tagged template. Keep new templates consistent with the existing pattern in `src/templates/`.
- **Constants**: use named constants from `src/utils/constants.ts` (`DOMAIN`, `SERVICES`, `PARAMS`, `ELEMENTS`, etc.) instead of raw strings.
- **Multi-value locations and categories**: the backend returns both scalar fields (`location`, `category` with the first value) and array fields (`locations`, `categories` with all values). Prefer the array fields in new frontend code.
- **Desired quantity display**: a `desired_quantity` of `0` means "use threshold formula" — display it as blank, not `0`.
- **Price display**: `price = 0` means "no price set". Show total value as `price × quantity` and exclude items with no price.
- **Event delegation**: new interactive elements should follow the existing event delegation pattern in `src/services/eventHandler.ts` rather than attaching inline event listeners.

## What makes a good PR

- Focused on one thing.
- Includes tests for new behavior.
- Updates all four translation files if any new user-visible strings are added.
- Passes all CI checks (type-check, lint, format, translations, tests, build).
- Has a clear description of what changed and why.
