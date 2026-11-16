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
- Create and edit categories: name, type (`EXPENSE`, `INCOME`, `BOTH`) and color (quick palette, native color picker or hex input).
- **Referential integrity:** renaming or recoloring a category updates the history and charts immediately. A category that is still used by transactions **cannot be deleted**, and the app shows a clear warning.

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
- **Adding a currency** takes one line in [`src/utils/currency.ts`](src/utils/currency.ts): ISO code, name, locale and number of decimals.

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

> To reset all data, run `localStorage.clear()` in the browser console and reload. The default categories are recreated automatically.

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

```
src/
├── types/
│   └── finance.ts            # Domain entities (mirror future JPA entities / MySQL tables)
├── services/                 # Async data layer: the ONLY code that knows about storage
│   ├── storage.ts            # localStorage adapter, UUID generator, async wrapper
│   ├── errors.ts             # ValidationError (400), NotFoundError (404), IntegrityError (409)
│   ├── transactionService.ts # /api/v1/transactions
│   ├── categoryService.ts    # /api/v1/categories (+ seed data)
│   ├── goalService.ts        # /api/v1/goals
│   ├── settingsService.ts    # /api/v1/settings (selected currency)
│   └── index.ts
├── hooks/
│   ├── useFinanceData.ts     # Coordinates the services and exposes state + CRUD to the UI
│   ├── useCurrency.tsx       # Active currency + formatters (React context)
│   └── useToast.tsx          # Toast notifications
├── utils/
│   ├── date.ts               # Timezone-safe date helpers (getLocalTodayISO, month keys…)
│   ├── currency.ts           # Supported currencies (code, name, locale, decimals)
│   ├── money.ts              # Cent-precise arithmetic, currency formatting and input mask
│   └── finance.ts            # Pure business rules: summary, goal status, chart series
├── components/
│   ├── ui/                   # Modal, CategorySelect, CurrencyInput, TypeToggle, ConfirmDialog
│   ├── charts/               # CategoryDonut, SpendingPaceChart, MonthlyBalanceChart
│   ├── Header.tsx            # Branding, month selector, currency picker, categories button
│   ├── QuickAddBar.tsx
│   ├── SummaryCards.tsx
│   ├── GoalCard.tsx
│   ├── TransactionHistory.tsx
│   ├── TransactionEditModal.tsx
│   └── CategoryManager.tsx
├── App.tsx
├── main.tsx
└── index.css                 # Tailwind entry + design tokens
```

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  Components  │ ──▶ │  useFinanceData  │ ──▶ │  services/*.ts     │ ──▶ │  storage.ts      │
│  (React UI)  │     │  (state + CRUD)  │     │  Promise<T> API    │     │  (localStorage)  │
└──────────────┘     └──────────────────┘     └────────────────────┘     └──────────────────┘
                                                                          Phase 2: fetch → Spring Boot
```

Key principles:

1. **Components never touch `localStorage`.** Every read and write goes through an async service method that returns `Promise<T>`, the same contract an HTTP client would have.
2. **Business rules are pure functions** in `utils/finance.ts`. They are easy to test and to port to the backend.
3. **Money is summed in integer cents** so floating-point errors never accumulate (`0.1 + 0.2` problems).
4. **Dates are timezone-safe.** `getLocalTodayISO()` builds `YYYY-MM-DD` from local date parts. It never uses `toISOString()`, which can jump to the next day at night in UTC-3.
5. **Month isolation:** transactions are fetched per month (`?month=YYYY-MM`), and the hook guards against stale responses when you switch months quickly.

---

## Data Model

```ts
type TransactionType = 'EXPENSE' | 'INCOME';

interface Category {
  id: string;                          // UUID
  name: string;
  color: string;                       // Hex, e.g. "#10b981"
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
}

interface Transaction {
  id: string;                          // UUID
  type: TransactionType;
  amount: number;                      // Positive value, 2 decimal places
  description: string;
  categoryId: string;                  // Logical FK → Category.id
  date: string;                        // Local ISO date "YYYY-MM-DD"
  createdAt: string;                   // ISO timestamp
}

interface MonthlyGoal {
  monthKey: string;                    // "YYYY-MM"
  targetAmount: number;                // Amount the user wants to save that month
}
```

Planned relational schema:

| Table | Columns |
|---|---|
| `categories` | `id CHAR(36) PK`, `name`, `color CHAR(7)`, `type ENUM` |
| `transactions` | `id CHAR(36) PK`, `type ENUM`, `amount DECIMAL(12,2)`, `description`, `category_id FK`, `date DATE`, `created_at DATETIME` |
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
- A category with linked transactions cannot be deleted (`409 Conflict`).
- A category's type cannot be changed if that would make existing transactions incompatible.
- Category names are unique (case-insensitive).

---

## Migrating to Spring Boot + MySQL

Every service method already documents the REST endpoint it will call:

| Service method | HTTP endpoint |
|---|---|
| `transactionService.list({ monthKey })` | `GET /api/v1/transactions?month=YYYY-MM` |
| `transactionService.create(input)` | `POST /api/v1/transactions` |
| `transactionService.update(id, input)` | `PUT /api/v1/transactions/{id}` |
| `transactionService.remove(id)` | `DELETE /api/v1/transactions/{id}` |
| `categoryService.list()` | `GET /api/v1/categories` |
| `categoryService.create(input)` | `POST /api/v1/categories` |
| `categoryService.update(id, input)` | `PUT /api/v1/categories/{id}` |
| `categoryService.remove(id)` | `DELETE /api/v1/categories/{id}` (409 if in use) |
| `goalService.getByMonth(monthKey)` | `GET /api/v1/goals/{monthKey}` |
| `goalService.save(monthKey, amount, applyToFuture)` | `PUT /api/v1/goals/{monthKey}` |
| `settingsService.get()` | `GET /api/v1/settings` |
| `settingsService.update(patch)` | `PATCH /api/v1/settings` |

Migration steps:
1. Implement the endpoints above in Spring Boot (JPA entities mirror `src/types/finance.ts`).
2. Replace the body of each service method with a `fetch`/`axios` call. The method signatures stay the same.
3. Map HTTP status codes to the existing error classes (`400 → ValidationError`, `404 → NotFoundError`, `409 → IntegrityError`).
4. Delete `services/storage.ts`. No component changes are required.

---

## Roadmap

- [x] **Phase 1:** frontend MVP with `localStorage`
- [x] English UI and multi-currency display
- [ ] **Phase 2:** Spring Boot + MySQL REST API
- [ ] Authentication and multiple users
- [ ] Recurring expenses, subscriptions and installment purchases *(intentionally out of scope for Phase 1)*
- [ ] CSV / spreadsheet import and export
- [ ] Per-transaction currencies with exchange-rate conversion
- [ ] Unit tests for `utils/finance.ts` and the services
