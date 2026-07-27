# TALLY BUILD TASK — Phase 1 & 2 (Device Identity + Groups/Members/Invites)

## Context

You are building **Tally**, a shared expense ledger app (like Splitwise but calmer, fairer, safer).
The full product spec is at: `C:/Users/bernly/AppData/Local/hermes/cache/documents/doc_cc15c4fabaa6_tally_product_implementation_spec.md`
**READ THAT SPEC FILE FIRST** — it is the source of truth for all behaviour, invariants, and acceptance criteria.

Project root: `C:/Users/bernly/tally`
Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Drizzle ORM, Neon Postgres, Vitest

## What's Already Done (DO NOT recreate)

### Phase 0 — Project scaffold ✅
- Next.js 16 project at `C:/Users/bernly/tally`
- Neon schema "tally" deployed (14 tables: users, user_sessions, groups, group_members, group_invites, categories, expenses, expense_payers, expense_participants, settlements, settlement_allocations, entity_revisions, activity_events, recurring_rules)
- DB schema in `src/db/schema.ts`, DB client in `src/db/client.ts` (uses neon-serverless Pool for transactions)
- Design tokens in `src/app/globals.css` (forest green primary #2E7D32, warm off-white canvas, dark mode with OLED true black)
- Lexend + Source Sans 3 fonts via next/font in `src/app/layout.tsx`
- Product config in `src/lib/product-config.ts` (MEMBER_COLOURS palette, DEFAULT_CATEGORIES, cookie names)
- Env validation in `src/lib/env.ts`
- Health route at `src/app/api/health/route.ts`
- Migration script at `scripts/migrate.py`

### Phase 3 — Money engine ✅ (45/45 tests passing)
- `src/domain/money/engine.ts` — pure functions for ALL money calculations:
  - `parseAmountExpression` — safe expression parser (no eval), supports + - × * ÷ / ( )
  - `toMinorUnits`, `formatMoney`, `formatMoneyShort` — minor-unit conversion
  - `allocateEqual`, `allocateShares`, `allocatePercentages`, `validateExactSplit` — split methods
  - `calculateMemberNets` — net = paid − share + sent − received
  - `assertBalancedLedger` — invariant: sum of nets = 0
  - `suggestSettlements` — deterministic greedy matcher
- Tests at `src/domain/money/engine.test.ts` (45 tests, all pass)

### Session auth partially started
- `src/server/auth/session.ts` — session management (createDeviceProfile, getSession, requireSession, signOut, setSessionCookie)
- `src/app/page.tsx` — onboarding UI (client component with name + colour picker)
- `src/app/api/auth/onboard/route.ts` — onboard API route

## YOUR TASK: Complete Phase 1 & 2

### Phase 1 — Device Identity (FINISH)

1. **Verify onboarding works end-to-end:**
   - Start dev server, navigate to `/`, complete onboarding
   - Verify session cookie is set (check browser dev tools)
   - Verify `getSession()` returns the user after refresh
   - Fix any bugs in session.ts or onboard route

2. **Middleware/auth guard:**
   - Create `src/middleware.ts` or use a layout-based auth check
   - Routes that require auth: `/`, `/groups/*`, `/g/*`, `/profile`
   - Routes that are public: `/`, `/join/*`, `/api/auth/*`, `/api/health`
   - If unauthenticated, `/` shows onboarding; if authenticated, `/` shows dashboard
   - The root `/` route should conditionally show onboarding (no session) or dashboard (has session)

3. **Profile screen** at `/profile`:
   - Display name input (editable)
   - Colour palette selector
   - Live avatar preview
   - Session/device note: "Your profile lives on this browser. Clearing browser data or using another device will create a new profile unless you transfer it first."
   - Sign out button with warning text per spec §6.8
   - API route: `PATCH /api/auth/profile`

4. **Sign out:**
   - API route: `POST /api/auth/signout`
   - Revokes session, deletes cookie, redirects to `/`

### Phase 2 — Groups, Members, Invites

5. **Create group** at `/groups/new`:
   - Group name input
   - Currency selector (default AUD)
   - Optional icon/emoji selector
   - Optional initial participants (name + colour each)
   - On submit: creates group, creator becomes owner member, adds unclaimed members
   - Redirect to group page `/g/[slug]`

6. **Group overview page** at `/g/[slug]`:
   - Header: icon + name + member avatar stack + share/invite action
   - Summary card: "You're owed $X" / "You owe $X" / "Settled up"
   - Tabs: Expenses, Balances, Activity (show Expenses tab content; others can be placeholder for now)
   - Expenses tab: empty state "No expenses yet. Add the first one." (we'll build expense form in Phase 4)
   - Floating "Add expense" button

7. **Dashboard** at `/` (authenticated):
   - Greeting + profile avatar
   - "New group" primary action button
   - List of active group cards (name, avatar stack, "You're owed/owe/settled" status)
   - Archived link
   - Empty state: "No shared tabs yet. Create a group for a trip, home or night out."

8. **Invites:**
   - General invite: owner generates a link, anyone with the link joins as new member
   - Claim invite: one-use link for a specific unclaimed member
   - Join page at `/join/[token]`:
     - Shows group name + existing members preview
     - For general invite: user picks their name + colour, joins
     - For claim invite: links current device to the target member slot
     - Show QR code as convenience (use a simple QR library)
   - Invite panel in group settings: show active links, rotate/revoke

9. **Group settings** at `/g/[slug]/settings`:
   - Edit name, icon
   - Manage members (add unclaimed, promote to owner)
   - Manage invites (view, revoke, generate new)
   - Archive group (with warning if balances non-zero)

10. **Slug generation:**
    - Generate URL-safe slug from group name (e.g., "Great Ocean Road" → "great-ocean-road")
    - Handle collisions (append random suffix)

## Design Requirements (from design-system.md)

- **Mobile-first** — design for 375px first, then enhance for desktop
- **Apple Design Award quality bar** — every pixel deliberate
- **Forest green primary** (#2E7D32), warm off-white canvas (#F8FAF9)
- **Near-black text** (#1A2B22), never pure #000 in light mode
- **Lexend** for headings, **Source Sans 3** for body (already loaded in layout)
- **Tabular numerals** for all money (`font-variant-numeric: tabular-nums` — use `.tnum` class)
- **8px spacing rhythm**, generous whitespace
- **Moderate corners** (12-16px radius on cards, buttons)
- **Smooth transitions** (150-200ms for interactions)
- **No rainbow gradients, no glassmorphism, no "AI look"**
- **Dark mode**: true black OLED, no shadows, borders+brightness for depth
- **Touch targets ≥ 44×44px**
- Inline SVG icons only (no icon libraries) — use simple, clean stroke icons

## Technical Constraints (from spec §21 AI Implementation Guardrails)

1. Never use floating point for persisted money (use minor units from engine.ts)
2. Never trust client-calculated owed amounts (server recalculates)
3. Never store raw session or invite tokens (hash them)
4. Never expose Neon credentials to browser
5. Never make all members editors (creator+owner permission model)
6. Never hard-delete financial records
7. Every mutation needs: authentication, authorization, validation, transaction, idempotency key
8. Australian English in UI (colour, organise, cancelled, dates like "27 Jul 2026")

## Acceptance Criteria

After your work, all of these should work:
- [ ] New visitor can create device profile at `/` with name + colour
- [ ] Session persists across refresh
- [ ] `/profile` shows and edits profile, has sign out
- [ ] Sign out revokes session and returns to onboarding
- [ ] User can create a group at `/groups/new`
- [ ] Group page at `/g/[slug]` shows header, summary, empty expenses
- [ ] Dashboard at `/` shows group cards
- [ ] Owner can generate invite links
- [ ] New visitor can join via general invite link
- [ ] New visitor can claim a member via personal claim link
- [ ] `npm run build` passes
- [ ] No console errors in browser

## How to Run

```bash
cd C:/Users/bernly/tally
npm run dev  # starts on localhost:3000
```

Build check:
```bash
npm run build 2>&1 | tail -30
```

Start by reading the spec file, then read the existing code files listed above to understand patterns. Build Phase 1 first, verify it works, then Phase 2.
