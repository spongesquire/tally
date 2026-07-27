# Phase 5 Task: Balances & Settlements

Build the balances view and settlement recording for the Tally shared expense app.

## What exists

Project: `C:/Users/bernly/tally` (Next.js 16 App Router, Drizzle ORM, Neon Postgres)
Schema in `src/db/schema.ts` — all tables exist (expenses, expense_payers, expense_participants, settlements).
Money engine in `src/domain/money/engine.ts` — has `calculateMemberNets`, `suggestSettlements`, `assertBalancedLedger`.

## Tasks

### 1. Balance query (`src/server/queries/balances.ts`)

Create a function `getGroupBalances(groupId: string)` that:
- Gets all active members
- Gets all active expenses with their payer and participant rows
- Gets all active settlements
- Uses `calculateMemberNets()` from the money engine to compute per-member: paid, share, sent, received, net
- Returns array of `{ memberId, displayName, colourKey, paid, share, sent, received, net }`

### 2. Balances page (`src/app/g/[slug]/balances/page.tsx`)

Server Component that:
- Requires auth, gets group by slug
- Calls `getGroupBalances`
- Renders `BalancesView` client component

### 3. Balances UI (`src/components/balances/balances-view.tsx`)

Shows:
- Current user's summary card: "You're owed $X" or "You owe $X" or "Settled up"
  - With Paid, Share, Sent, Received breakdown
- Each member's row with the same breakdown
- Suggested settlements section using `suggestSettlements()` from the money engine
  - Each suggestion: "Sam pays Dev $63.58" with "Record payment" button

### 4. Settlement server action (`src/server/actions/settlements.ts`)

`saveSettlementAction(input)` that:
- Authenticates user, verifies group membership
- Validates: from ≠ to, amount > 0, both members in group
- Creates settlement record with idempotency key (clientMutationId)
- Creates revision snapshot + activity event
- Revalidates balances path

### 5. Settlement API route (`src/app/api/settlements/route.ts`)

POST handler that calls saveSettlementAction.

### 6. Wire up the Balances tab

Update `src/components/groups/group-overview.tsx`:
- Make the "Balances" tab clickable (currently it's visual only)
- When clicked, show a BalancesPanel component that fetches and displays balances
- Or alternatively, link the Balances tab to `/g/[slug]/balances`

## Design

Follow existing patterns from `src/components/groups/group-overview.tsx` and `src/components/shared/ui.tsx`.
Use `formatSigned`, `formatUnsigned`, `netStatus` from `src/components/shared/ui.tsx`.
Green for positive (owed), red for negative (owes), muted for settled.
Tabular numerals (`.tnum` class) for all money.
Mobile-first, max-w-lg container.

## Constraints

- Never use floating point for money
- Use the money engine functions — don't duplicate calculation logic
- Server always recalculates
- Australian English
