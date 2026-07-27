# Phase 6 Task: Trust & Lifecycle

Build the trust, lifecycle, and activity features for Tally.

## What exists
- Next.js 16 app at `C:/Users/bernly/tally`
- Full schema, money engine, expenses, balances, settlements all working
- Patterns: Server Components fetch data, client components for interactivity
- `src/server/actions/` has expense + settlement + group + invite actions
- `src/server/queries/` has balance, expense, dashboard, invite queries
- `src/components/` has groups/, expenses/, balances/, shared/, profile/

## Tasks

### 1. Expense detail page (`src/app/g/[slug]/expenses/[expenseId]/page.tsx`)

Server Component that:
- Requires auth, gets group by slug, verifies membership
- Gets the expense with payers, participants (with display names), category, creator
- Gets the current user's paid/owed for this specific expense
- Renders `ExpenseDetail` client component

Show per spec §11.6:
- Amount, description, category, date
- Paid-by breakdown (who paid how much)
- Split breakdown with original input + resulting amount per member
- Current user effect: "You paid $X and your 2 of 4 total shares equal $Y, so this expense adds $Z to what you are owed"
- Note (if any)
- Creator and last-updated info
- Edit and Remove buttons (only visible if current user is creator or owner)
- Revision history section (list of snapshots)

### 2. Expense detail component (`src/components/expenses/expense-detail.tsx`)

Client component with:
- Clean display of all expense data
- Edit button → links to edit page (or shows edit form inline)
- Remove button → confirmation dialog explaining balance effect, then calls removeExpenseAction
- "Removed" state shows tombstone with restore option for owners

### 3. Remove expense action (add to `src/server/actions/expenses.ts`)

`removeExpenseAction(expenseId, memberId)`:
- Auth check, verify caller is creator or owner
- Soft-delete: set status='deleted', deleted_at=now()
- Create revision snapshot (action='delete') + activity event
- Return typed result

### 4. Restore expense action (add to `src/server/actions/expenses.ts`)

`restoreExpenseAction(expenseId, memberId)`:
- Owner-only check
- Set status='active', deleted_at=null
- Revision + activity event

### 5. Activity page (`src/app/g/[slug]/activity/page.tsx` + component)

- Query all activity events for the group ordered by created_at desc
- Render as a timeline with: actor avatar, action summary, timestamp, entity link
- Use the `summaryPayload.summary` text for human-readable copy
- Show "All" filter only (Release 1 ships All only per spec)

### 6. Group settings page (`src/app/g/[slug]/settings/page.tsx`)

- Owner-only settings: edit group name/icon
- Archive group button (with warning if balances non-zero)
- Restore archived group button
- Member management: list members, show role badges

### 7. Archive/restore actions (add to `src/server/actions/groups.ts`)

`archiveGroupAction(groupSlug)`:
- Owner check
- Set status='archived', archived_at=now()
- Activity event

`restoreGroupAction(groupSlug)`:
- Owner check
- Set status='active', archived_at=null

### 8. Search (add to expense queries)

`searchExpenses(groupId, query)`:
- Case-insensitive search on expense description
- Return matching expenses

Add a search input to the group overview expenses tab.

### 9. Wire up Activity tab

Make the Activity tab in group-overview.tsx link to `/g/[slug]/activity`.

## Design
Follow existing patterns. Use `Avatar`, `formatUnsigned`, `formatDate`, `netStatus` from shared/ui.
Mobile-first, max-w-lg, tabular numerals, green/red/muted semantics.

## Constraints
- Only creator or owner can edit/remove an expense
- Only owner can restore deleted entries or archive/restore group
- Soft-delete only (never hard-delete financial records)
- Every mutation needs auth, authz, revision, activity
