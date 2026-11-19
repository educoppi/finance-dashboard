# Fluxo — Personal Finance Dashboard

A modern, dark-mode personal finance tracker built with **React, TypeScript, Vite and Tailwind CSS**.
Log income and expenses in seconds, set a monthly savings goal, and see your spending pace in real time.

> **Phase 1 (MVP):** frontend only, persisted in the browser's `localStorage`.
> **Phase 2 (planned):** the storage layer will be swapped for a **Java (Spring Boot) + MySQL** REST API. The codebase is *migration-ready*, so the UI won't need to change.

The interface is in **English** and supports **10 currencies** (USD, BRL, EUR, GBP, JPY, CAD, AUD, CHF, ARS, MXN). Each currency is displayed using its own native formatting conventions.

---

## Table of Contents

- [Features](#features)
- [Multi-currency support](#multi-currency-support)
- [Backup & restore](#backup--restore)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Business Rules](#business-rules)
- [Migrating to Spring Boot + MySQL](#migrating-to-spring-boot--mysql)
- [Roadmap](#roadmap)

---

## Features

### Quick entry bar
- Toggle between **Expense** and **Income**. The category list filters itself to matching categories.
- Currency-aware input mask (in USD, typing `1234` becomes `12.34`; in JPY it becomes `1,234`) and validation (amount must be > 0).
- The date defaults to **today in the local timezone**. If you pick another date, it stays until you change it again.
- Press **Enter** or click **Add** to save. The amount and description fields clear and focus returns to the amount field, so you can log several entries in a row.

### Monthly summary
- Cards for **Income**, **Expenses** and **Balance** for the selected month.
- **Savings goal card** with a progress bar and four states: *neutral*, *on track*, *warning* and *exceeded*. See [Business Rules](#business-rules).
- The goal can apply to one month only or become the **default for future months**.

### Analytics (Recharts)
| Chart | What it shows |
|---|---|
| **Spending by category** (donut) | Each category's share of the month's expenses, drawn in that category's own color, with a custom tooltip (amount + percentage). |
| **Cumulative spending pace** (area) | Running total of expenses for each day of the month, with a dashed **spending cap** reference line. The day the cap is crossed is marked. |
| **Monthly balance** (bars) | Income vs. expenses vs. reserved savings goal. |

### Category management
- Ships with 8 default categories (6 expense, 2 income), each with its own color.
- Create and edit categories: name, type (`EXPENSE` or `INCOME`) and color (quick palette, native color picker or hex input).
- **Referential integrity:** renaming or recoloring a category updates the history and charts immediately. A category that is still used by active transactions **cannot be deleted**, and the app shows a clear warning.

### History and filters
- Combinable filters: text search (ignores accents and case), type, and category.
- A **Clear filters** button appears whenever a filter is active.
- Sorted newest first. Each row shows the date (e.g. `Nov 15, 2026`), a colored category badge, the description, the signed amount, and **edit/delete** actions.
- Friendly empty states for months with no transactions and for filters with no results.
- Table layout on desktop, card list on mobile.

---

## Multi-currency support

Pick your currency from the selector in the header. The choice is saved and applied everywhere: cards, charts, tooltips, history and input masks.

| Code | Currency | Example |
|---|---|---|
| USD | US Dollar *(default)* | `$1,234.56` |
| BRL | Brazilian Real | `R$ 1.234,56` |
| EUR | Euro | `1.234,56 €` |
| GBP | British Pound | `£1,234.56` |
| JPY | Japanese Yen | `￥1,235` (no decimals) |
| CAD | Canadian Dollar | `$1,234.56` |
| AUD | Australian Dollar | `$1,234.56` |
| CHF | Swiss Franc | `CHF 1’234.56` |
| ARS | Argentine Peso | `$ 1.234,56` |
| MXN | Mexican Peso | `$1,234.56` |

How it works:
- **One currency per user.** It is a display and input setting, not a per-transaction field. Switching currency **does not convert** existing amounts; they are shown as they are, in the new currency.
- **Native formatting:** amounts use the currency's own locale (symbol position, thousands and decimal separators). Compact chart labels stay in English (`R$1.2K`).
- **Backward compatible:** browsers that already had data from before this setting existed are switched to BRL automatically, since that was the only currency at the time.
- **Stored amounts never change when you switch currency.** The switch only swaps the formatter and input mask; nothing is written back to the stored transactions or goals.
- **Editing under a 0-decimal currency is lossless.** If you open an amount entered with cents (e.g. `12.34`) while JPY is active, the field shows `12`. If you save without touching the amount, the stored `12.34` is kept. Only an amount you actually retype is re-read with the active currency's precision.
- **Adding a currency** takes one line in [`src/shared/utils/currency.ts`](src/shared/utils/currency.ts): ISO code, name, locale and number of decimals.

---

## Backup & restore

The **Backup** button in the header opens a small dialog:

- **Download backup** saves `fluxo-backup-YYYY-MM-DD.json`: a versioned snapshot of your active categories, transactions, monthly goals, default goals and currency setting.
- **Restore from a file** validates the whole file first: format and version, required fields and types, valid dates, months, colors and amounts, unique ids and names, and that every transaction points to a category inside the backup. A malformed file is rejected with a specific message and **nothing is changed**. A valid file shows a confirmation with its contents before it replaces the data in this browser.

```jsonc
{
  "format": "fluxo-finance-backup",
  "version": 1,
  "exportedAt": "2026-11-16T14:03:12.000Z",
  "data": {
    "categories":   [ /* Category[]    */ ],
    "transactions": [ /* Transaction[] */ ],
    "goals":        [ /* MonthlyGoal[] */ ],
    "defaultGoals": [ /* DefaultGoal[] */ ],
    "settings":     { "currency": "USD" }
  }
}
```

A restore keeps sync semantics. Local records that are not in the backup are tombstoned, not erased, and every imported record gets a fresh `updatedAt`. A future sync will therefore propagate the restore correctly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) (`strict: true`) |
| Build tool | [Vite](https://vite.dev/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [lucide-react](https://lucide.dev/) |
| Persistence | `localStorage` (Phase 1), REST API (Phase 2) |

---

## Getting Started

### Prerequisites
- **Node.js** 20 or newer
- **npm** 10 or newer

### Installation

```bash
git clone https://github.com/educoppi/finance-dashboard.git
cd finance-dashboard
npm install
npm run dev
```

Then open http://localhost:5173.

> To reset all data, delete the `fluxo:*` keys in the browser's `localStorage` (DevTools → Application) and reload. The default categories are recreated automatically. Avoid `localStorage.clear()` on a shared origin such as `<user>.github.io`, since it also wipes other projects' data.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check (`tsc --noEmit`) and build for production into `dist/` |
| `npm run typecheck` | Run the TypeScript compiler only |
| `npm run preview` | Serve the production build locally |

---

## Project Structure

The code is split into a **shared** layer and self-contained **modules**. The finance domain can then be dropped into a larger Personal Organization suite next to other modules (tasks, notes…) without collisions. `shared/` never imports from `modules/`.

```
src/
├── shared/                         # Domain-agnostic building blocks
│   ├── components/                 # Modal, ConfirmDialog, CurrencyInput, TypeToggle
│   ├── hooks/
│   │   ├── useCurrency.tsx         # Active currency + formatters (React context)
│   │   └── useToast.tsx            # Toast notifications
│   ├── services/
│   │   ├── storage.ts              # Namespaced localStorage adapter + legacy key migration
│   │   ├── syncMeta.ts             # SyncMeta (createdAt/updatedAt/deletedAt) helpers
│   │   ├── errors.ts               # ValidationError (400), NotFoundError (404), IntegrityError (409)
│   │   └── settingsService.ts      # /api/v1/settings (selected currency)
│   └── utils/
│       ├── date.ts                 # Timezone-safe date helpers (getLocalTodayISO, month keys…)
│       ├── currency.ts             # Supported currencies (code, name, locale, decimals)
│       └── money.ts                # Cent-precise arithmetic, currency formatting and input mask
├── modules/
│   └── finance/
│       ├── types/finance.ts        # Domain entities (mirror future JPA entities / MySQL tables)
│       ├── services/               # Async data layer: the ONLY finance code that knows about storage
│       │   ├── transactionService.ts   # /api/v1/transactions
│       │   ├── categoryService.ts      # /api/v1/categories (+ seed data)
│       │   ├── goalService.ts          # /api/v1/goals
│       │   ├── backupService.ts        # JSON export / validated import
│       │   └── index.ts
│       ├── hooks/useFinanceData.ts # Coordinates the services and exposes state + CRUD to the UI
│       ├── utils/finance.ts        # Pure business rules: summary, goal status, chart series
│       └── components/
│           ├── ui/CategorySelect.tsx
│           ├── charts/             # CategoryDonut, SpendingPaceChart, MonthlyBalanceChart
│           ├── Header.tsx          # Branding, month selector, currency picker, categories, backup
│           ├── BackupMenu.tsx      # Backup & restore dialog
│           ├── QuickAddBar.tsx
│           ├── SummaryCards.tsx
│           ├── GoalCard.tsx
│           ├── TransactionHistory.tsx
│           ├── TransactionEditModal.tsx
│           └── CategoryManager.tsx
├── App.tsx
├── main.tsx
└── index.css                       # Tailwind entry + design tokens
```

### Storage keys

| Key | Contents |
|---|---|
| `fluxo:finance:categories` | `Category[]` |
| `fluxo:finance:transactions` | `Transaction[]` |
| `fluxo:finance:goals` | `MonthlyGoal[]` |
| `fluxo:finance:default_goals` | `DefaultGoal[]` |
| `fluxo:shared:settings` | `{ currency }` |

On first access, data under the Phase 1 keys (`fluxo:v1:*`) is moved to these keys automatically. The migration is idempotent: it only copies into an empty key, then removes the old one. Bare keys such as `transactions` are never touched, because a GitHub Pages origin is shared by every project of the same account.

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  Components  │ ──▶ │  useFinanceData  │ ──▶ │  services/*.ts     │ ──▶ │  shared/storage  │
│  (React UI)  │     │  (state + CRUD)  │     │  Promise<T> API    │     │  (localStorage)  │
└──────────────┘     └──────────────────┘     └────────────────────┘     └──────────────────┘
                                                                          Phase 2: fetch → Spring Boot
```

Key principles:

1. **Components never touch `localStorage`.** Every read and write goes through an async service method that returns `Promise<T>`, the same contract an HTTP client would have.
2. **Business rules are pure functions** in `modules/finance/utils/finance.ts`. They are easy to test and to port to the backend.
3. **Money is summed in integer cents** so floating-point errors never accumulate (`0.1 + 0.2` problems).
4. **Dates are timezone-safe.** `getLocalTodayISO()` builds `YYYY-MM-DD` from local date parts. It never uses `toISOString()`, which can jump to the next day at night in UTC-3.
5. **Soft deletes + `updatedAt` everywhere** prepare the data for offline-first delta sync (see [Data Model](#data-model)).
6. **Month isolation:** transactions are fetched per month (`?month=YYYY-MM`), and the hook guards against stale responses when you switch months quickly.

---

## Data Model

```ts
type TransactionType = 'EXPENSE' | 'INCOME';

/** Sync metadata carried by every entity (ISO-8601 UTC timestamps). */
interface SyncMeta {
  createdAt: string;
  updatedAt: string;                   // Refreshed on every change → delta-sync cursor
  deletedAt?: string | null;           // Tombstone: set on soft delete, null while active
}

interface Category extends SyncMeta {
  id: string;                          // UUID
  name: string;
  color: string;                       // Hex, e.g. "#10b981"
  type: 'EXPENSE' | 'INCOME';
}

interface Transaction extends SyncMeta {
  id: string;                          // UUID
  type: TransactionType;
  amount: number;                      // Positive value, at most 2 decimal places
  description: string;
  categoryId: string;                  // Logical FK → Category.id
  date: string;                        // Local ISO date "YYYY-MM-DD"
}

interface MonthlyGoal extends SyncMeta {
  monthKey: string;                    // "YYYY-MM"
  targetAmount: number;                // Amount the user wants to save that month
}

interface DefaultGoal extends SyncMeta {
  effectiveFrom: string;               // "YYYY-MM" — applies to this and later months
  targetAmount: number;
}
```

### Sync readiness (offline-first)

| Operation | Effect on the stored record |
|---|---|
| `create` | `createdAt = updatedAt = now`, `deletedAt = null` |
| `update` | `updatedAt = now` |
| `remove` | **Soft delete:** `deletedAt = updatedAt = now`. The record stays in `localStorage` as a tombstone. |
| `list` / `getByMonth` | Return active records only (`deletedAt == null`) |

Goals are keyed by month. Saving a goal for a month that already has one (even a tombstoned one) updates that row. "Apply to future months" soft-deletes the explicit goals and later defaults that it supersedes.

**Backward compatibility:** records written before these fields existed are normalized on first read. `createdAt` falls back to `updatedAt`, then to now. `updatedAt` falls back to `createdAt`. A missing `deletedAt` becomes `null`. The normalized form is written back once, so the fallback timestamps stay stable.

A future backend can then serve `GET /api/v1/sync?since=<updatedAt>` (changed rows plus tombstones) and accept the same shape back, resolving conflicts by last-write-wins on `updatedAt`.

Planned relational schema (every table also has `created_at DATETIME`, `updated_at DATETIME` (indexed) and `deleted_at DATETIME NULL`):

| Table | Columns |
|---|---|
| `categories` | `id CHAR(36) PK`, `name`, `color CHAR(7)`, `type ENUM` |
| `transactions` | `id CHAR(36) PK`, `type ENUM`, `amount DECIMAL(12,2)`, `description`, `category_id FK`, `date DATE` |
| `monthly_goals` | `month_key CHAR(7) PK`, `target_amount DECIMAL(12,2)` |
| `default_goals` | `effective_from CHAR(7) PK`, `target_amount DECIMAL(12,2)` |
| `user_settings` | `user_id PK`, `currency CHAR(3)` |

---

## Business Rules

### Savings goal (X)

```
Spending cap = Monthly income − Savings goal (X)
Free margin  = Spending cap − Monthly expenses
```

| State | Condition | Color |
|---|---|---|
| **Neutral** | No income logged for the month yet | Slate |
| **On track** | Free margin > 20% of the spending cap | Emerald |
| **Warning** | 0 ≤ free margin ≤ 20% of the spending cap | Amber |
| **Exceeded** | Free margin < 0. The card shows how much of the reserved goal has already been spent. | Rose |

Edge cases handled:
- **Goal higher than income:** a specific message says how much more income is needed to cover the goal.
- **No goal and expenses higher than income:** the card reports the negative balance.

### Goal resolution per month
1. A goal set explicitly for that month.
2. Otherwise, the most recent **default goal** whose `effectiveFrom ≤ month`. Defaults never change past months.
3. Otherwise, `0`.

### Integrity
- A category with linked **active** transactions cannot be deleted (`409 Conflict`). Soft-deleted transactions do not block it.
- A category's type cannot be changed if that would make active transactions incompatible.
- Category names are unique (case-insensitive) among active categories. Deleting a category frees its name.
- Deletes are soft: records are tombstoned (`deletedAt`) and hidden everywhere in the UI.

---

## Migrating to Spring Boot + MySQL

Every service method already documents the REST endpoint it will call:

| Service method | HTTP endpoint |
|---|---|
| `transactionService.list({ monthKey })` | `GET /api/v1/transactions?month=YYYY-MM` |
| `transactionService.create(input)` | `POST /api/v1/transactions` |
| `transactionService.update(id, input)` | `PUT /api/v1/transactions/{id}` |
| `transactionService.remove(id)` | `DELETE /api/v1/transactions/{id}` (soft delete) |
| `categoryService.list()` | `GET /api/v1/categories` |
| `categoryService.create(input)` | `POST /api/v1/categories` |
| `categoryService.update(id, input)` | `PUT /api/v1/categories/{id}` |
| `categoryService.remove(id)` | `DELETE /api/v1/categories/{id}` (soft delete, 409 if in use) |
| `goalService.getByMonth(monthKey)` | `GET /api/v1/goals/{monthKey}` |
| `goalService.save(monthKey, amount, applyToFuture)` | `PUT /api/v1/goals/{monthKey}` |
| `settingsService.get()` | `GET /api/v1/settings` |
| `settingsService.update(patch)` | `PATCH /api/v1/settings` |

Migration steps:
1. Implement the endpoints above in Spring Boot (JPA entities mirror `src/modules/finance/types/finance.ts`, including the `SyncMeta` columns).
2. Replace the body of each service method with a `fetch`/`axios` call. The method signatures stay the same.
3. Map HTTP status codes to the existing error classes (`400 → ValidationError`, `404 → NotFoundError`, `409 → IntegrityError`).
4. Replace `shared/services/storage.ts` with an offline cache that pushes and pulls deltas by `updatedAt`. No component changes are required.

---

## Roadmap

- [x] **Phase 1:** frontend MVP with `localStorage`
- [x] English UI and multi-currency display
- [x] Modular layout (`shared/` + `modules/finance/`) with namespaced storage
- [x] Sync-ready data model: `updatedAt` + soft deletes (tombstones)
- [x] JSON backup export / validated import
- [ ] **Phase 2:** Spring Boot + MySQL REST API
- [ ] Bidirectional delta sync (`GET /sync?since=`, last-write-wins on `updatedAt`) and tombstone purging
- [ ] Authentication and multiple users
- [ ] Recurring expenses, subscriptions and installment purchases *(intentionally out of scope for Phase 1)*
- [ ] CSV / spreadsheet import and export *(JSON backup already available)*
- [ ] Per-transaction currencies with exchange-rate conversion
- [ ] Unit tests for `utils/finance.ts` and the services
