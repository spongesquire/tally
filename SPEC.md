# Tally — Shared Expense Ledger
## Product, UX and Technical Implementation Specification

**Status:** Implementation-ready product brief  
**Version:** 1.0  
**Date:** 27 July 2026  
**Working name:** **Tally** — validate name, domain and trademark before any public launch  
**Tagline:** **Shared costs, clearly.**

---

## 0. How this document should be used

This is the canonical product specification for a simple, attractive shared-expense application inspired by the best parts of Splitwise while deliberately avoiding its most common sources of friction.

The implementation AI should use:

- **`vercel-neon-glm-apps`** for project scaffolding, Vercel deployment conventions, Neon provisioning, environment variables, database access and preview environments.
- **`design-system`** for design tokens, accessible components, responsive patterns, interaction states and visual consistency.
- This specification as the source of truth for product behaviour, calculations, scope, permissions and acceptance criteria.

Where a named skill’s technical conventions conflict with a package or folder suggestion in this document, follow the skill for implementation details while preserving the product behaviour and invariants defined here.

Use current stable package versions compatible with the two skills. Use Australian English in the interface: **colour**, **organise**, **favourite**, **cancelled**, and dates such as **27 Jul 2026**.

Do not add features merely because a library makes them easy. The product should feel smaller and clearer than Splitwise, not like an accounting platform.

---

# 1. Executive product decision

Tally is a mobile-first shared ledger for trusted friends, households and trips. A person opens the app, enters a display name, selects a colour and receives a long-lived device session. They can create or join a group, add expenses using flexible split methods, understand exactly how every balance was produced, and record settlements.

The essential interaction is:

> **I paid an amount, these people were involved, and their relative shares were 0, 1, 2 or another weight. Show everyone’s fair amount and the simplest sensible way to settle.**

The app does **not** move money, store banking credentials or attempt strong identity verification. It is a convenience tool for people who already trust one another.

### The product bet

Splitwise’s central model is excellent: a persistent group tab is easier than repeatedly requesting small payments. The opportunity is to keep that model while making the app:

- faster to enter expenses;
- free from arbitrary daily-entry limits and constant upsells;
- safer to edit;
- clearer about how balances and settlements were calculated;
- easier for guests and non-technical friends to join;
- better at weighted **shares**, expense-specific settlement and practical group closure;
- visually calmer and more delightful.

### Release-one promise

A first-time user should be able to create a group and add a weighted expense in under one minute. A returning user should be able to add a routine expense in roughly ten seconds. Every displayed balance must be traceable to underlying expenses and settlements.

---

# 2. Research synthesis

## 2.1 What Splitwise does especially well

The following behaviours should be preserved because they solve the core problem well:

1. **A running shared tab instead of immediate payment requests.** People can add expenses over days, months or a whole trip and settle later.
2. **Groups and direct relationships.** A household, holiday, event or pair can each have a separate context.
3. **Flexible split methods.** Equal, exact amount, percentage and shares cover most real-world cases.
4. **Multiple payers.** More than one person can contribute to a purchase.
5. **A clear net balance.** Users care most about whether they owe or are owed, not a full double-entry ledger.
6. **Debt simplification.** Suggested payments can reduce the number of transfers while preserving everyone’s final position.
7. **Recurring expenses, categories, notes, comments and activity history.** These support longer-running households.
8. **Multi-currency and exports.** These are valuable for travel and data portability.
9. **Edit history and restoration.** Shared financial records need an audit trail.
10. **A familiar, low-stakes social tone.** The product feels less formal than accounting software.

## 2.2 Where Splitwise creates friction

The major product gaps and complaint clusters are:

- **Free-tier friction.** Daily expense-entry limits, advertisements, timers and repeated Pro prompts interrupt the core task.
- **Basic utility behind a subscription.** Search, receipt tools, charts, default splits and some convenience features are treated as premium enhancements.
- **Payments are primarily balance-level.** Users commonly want to say that a payment settles a particular dinner, hotel or set of expenses.
- **Shared editing can feel unsafe.** Broad edit/delete permissions create accidental or disputed changes, even when history exists.
- **Reconciliation can feel opaque.** Users sometimes mistrust a balance when they cannot easily see the paid/share/net calculation.
- **Fast entry could be faster.** A calculator, automatic remainder handling, remembered splits and more compact controls are frequent requests.
- **Group lifecycle is incomplete.** People want manual archive, a “finished adding expenses” state, reminders and a clean way to close a trip.
- **Customisation gaps.** Custom categories, aliases, tags, preferred payment methods and custom exchange rates are recurring requests.
- **Recurring bills assume a fixed amount.** Utilities often recur on a schedule but have a different value each period.
- **Guest participation is still more involved than necessary.** Competitors demonstrate that a secret link and no-registration flow can work well for trusted groups.

## 2.3 High-signal user-request themes and product response

| Request theme | Why users ask for it | Tally decision |
|---|---|---|
| Apply a payment to specific expenses | People want closure and an understandable audit trail | **Release 1.1**: optional settlement allocations while group net balances remain authoritative |
| Built-in calculator | Bills often require adding line items, fees or tips | **Release 1** |
| Custom categories | Household and trip contexts differ | **Release 1** |
| Add people without email or phone | Not every participant wants an account | **Release 1**: unclaimed group members plus personal claim links |
| Friend aliases | Names and nicknames differ by group | **Release 1**: group-scoped display name |
| Archive groups manually | Finished groups should leave the active dashboard | **Release 1** |
| “Ready to settle” marker | Organisers need to know everyone has finished entering expenses | **Release 1.1** |
| Group reminders | Chasing everyone manually is tedious | **Release 1.1**, initially as shareable reminder text and in-app state |
| Variable recurring bill | Electricity and similar bills recur but change value | **Release 1.1**: scheduled prompt rather than automatic fixed expense |
| Preserve shares or percentages while editing | Re-entering a complex split is error-prone | **Release 1** |
| Exact-split remainder helper | Manual sums are slow and frequently off by one cent | **Release 1** |
| Custom exchange rate | Travellers may use a card or agreed rate | **Release 1.1** |
| Share a balance in messaging apps | Not every participant regularly opens the app | **Release 1.1** |
| Preferred payment method | People use PayID, bank transfer, Revolut and other rails | **Release 1.1** as optional payment instructions; Tally never handles funds |
| Read-only access | Organisers may want visibility without edit rights | **Release 1.1** |
| Itemised receipt splitting | Different people consume different items | **Release 2** |
| Receipt images and OCR | Reduces typing for large restaurant bills | Image attachment in **1.1**; OCR and item assignment in **2** |
| Budgets and richer charts | Useful for households but not necessary to settle fairly | **Release 2** |
| Bank/card import | Convenient but materially increases privacy, support and integration complexity | **Later / optional**, not part of the core product |
| Bulk editing | Helpful for power users | **Release 2** |
| Tags | Cross-cutting organisation beyond categories | **Release 1.1** |
| Subgroups inside groups | Can model complex trips but harms mental simplicity | **Not planned**; use separate groups or saved split presets |
| Approval workflow for every payment | Adds significant friction in trusted groups | **Not planned**; use authorship, audit history and correction flags instead |
| Advance payments against future costs | Turns a simple ledger into stored-value accounting | **Not planned** in the initial product |

This specification intentionally synthesises the distinct high-vote and recurring themes rather than reproducing every individual feedback ticket. Many tickets are duplicates, country-specific payment integrations, support issues or mutually conflicting requests.

## 2.4 Competitive patterns worth adopting

Across lightweight Splitwise alternatives, the strongest recurring patterns are:

- no mandatory registration;
- secret-link or code-based group access;
- the ability to include a participant who never installs the app;
- simple equal, exact, percentage and share splits;
- debt minimisation;
- offline-friendly or installable web experiences;
- receipt attachment and optional item assignment;
- CSV/PDF export;
- read-only sharing;
- custom or multiple currencies;
- payment instructions without taking custody of money.

Tally should adopt the first six quickly, then add the remaining features only where they preserve the product’s simplicity.

## 2.5 Product opportunity

The market does not need another feature-for-feature clone. It needs a shared ledger that feels:

- **instant** rather than account-heavy;
- **trustworthy** rather than magical;
- **calm** rather than monetised at every interaction;
- **flexible** where fairness matters;
- **opinionated** about avoiding unnecessary complexity.

---

# 3. Users and jobs to be done

## 3.1 Primary users

### The organiser

Creates the group, adds initial members, sends invite links, fixes mistakes, reminds people to add expenses and eventually closes the group.

### The participant

Joins from a link, adds one or more purchases, checks what they owe and records or follows a suggested settlement.

### The occasional guest

May be included in one meal or activity but may never create a profile. Their share still needs to be represented correctly.

## 3.2 Primary contexts

- weekend trips and holidays;
- share houses and recurring household costs;
- restaurant meals, events and group gifts;
- couples or close friends with an ongoing tab;
- club, team or small informal project expenses.

## 3.3 Core jobs

1. **When one or more people pay for a shared cost, record who paid and who benefited so the group stays fair.**
2. **When participation is unequal, express the split naturally using shares without doing manual arithmetic.**
3. **When I want to understand a balance, show me the underlying paid, share and settlement entries.**
4. **When the group is finished, suggest a small number of payments and let us mark the tab as settled.**
5. **When someone makes a mistake, let the right person fix it without destroying trust in the ledger.**
6. **When a friend does not want an account, let me include them and optionally hand over their member slot later.**

## 3.4 Success measures

For the private friends-and-family deployment, product quality matters more than growth metrics. Useful internal measures are:

- median time from opening “Add expense” to save;
- percentage of expenses saved without validation errors;
- percentage of expenses using shares, exact or percentage rather than equal;
- number of unresolved correction flags;
- percentage of archived groups with a zero balance;
- number of duplicate submissions prevented by idempotency;
- error rate and p75 page performance.

Do not add behavioural tracking that is not needed. Privacy-friendly aggregate telemetry is enough.

---

# 4. Product principles

## 4.1 Fast before clever

The common path must require very little typing. Advanced options remain available but collapsed.

## 4.2 Every number is explainable

Never display only “You owe Alex $42.17”. Also make it easy to see:

- how much the user paid;
- how much their allocated share was;
- settlements sent or received;
- the resulting net amount.

## 4.3 Shares are a first-class split method

Shares are not an advanced afterthought. A share of **0** excludes a person, **1** means a normal share, **2** means double, and decimal values may express half shares. The app always previews the resulting currency amount.

## 4.4 Trust is designed, not assumed

Use explicit authorship, role-scoped edits, immutable revision snapshots, soft deletion, restore and clear activity entries. Avoid silent mutation.

## 4.5 Identity should match the risk

This app does not move funds and is initially used by trusted friends. A persistent device cookie and secret group links are proportionate. The interface must nevertheless disclose that this is convenient device identity, not secure financial authentication.

## 4.6 Complexity appears only when requested

The initial expense form shows amount, description, payer and split. Date, category, notes, multiple payers and other controls are progressively disclosed.

## 4.7 No artificial product friction

There are no daily expense limits, advertisements, countdowns or subscription prompts in the private deployment.

## 4.8 Data remains portable

CSV export should be added early, before receipt OCR or bank imports.

---

# 5. Scope and roadmap

## 5.1 Release 1 — Core ledger

Release 1 is the smallest version that is genuinely better for the stated use case.

### Identity and access

- Name-and-colour onboarding.
- Long-lived, rolling, secure HTTP-only session cookie.
- Sign out and session revocation.
- Create a group.
- Join with a revocable secret link.
- Add an unclaimed participant by name and colour.
- Generate a one-use personal link that attaches a friend’s device identity to an unclaimed member.
- Owner and member roles.

### Expenses

- Add, view, edit and soft-delete an expense.
- Description, amount, date, category and optional note.
- Safe arithmetic expression in the amount field.
- One or multiple payers.
- Equal, shares, exact amount and percentage splits.
- Explicit inclusion/exclusion of participants.
- Live split preview.
- Preserve the original split inputs on edit.
- Deterministic cent rounding.
- Automatic exact/percentage remainder helper.
- Custom group categories.
- Duplicate-submit protection.

### Balances and settlement

- Group net balance for every participant.
- “You owe” and “You are owed” summaries.
- Paid / Share / Settlements / Net explanation.
- Direct ledger breakdown.
- Suggested simplified settlements.
- Record a full or partial settlement.
- Settlement notes and date.

### Trust and lifecycle

- Expense and settlement authorship.
- Immutable revision snapshots.
- Activity feed.
- Soft deletion and owner restore.
- Optimistic concurrency protection.
- Manual group archive and restore.
- Basic search by description.

### Experience

- Mobile-first responsive web app.
- Installable PWA shell.
- Accessible keyboard and screen-reader behaviour.
- Empty, loading, success, error and conflict states.
- No advertisements or usage limits.

## 5.2 Release 1.1 — Trust and convenience

- Apply a settlement to one or more specific expenses.
- “Ready to settle” status per member.
- Shareable group summary and reminder text.
- CSV export.
- Group-specific payment instructions such as PayID or bank-transfer note.
- Recurring fixed expenses.
- Variable recurring prompts that ask for the current amount.
- Read-only members or a revocable read-only share link.
- Optional receipt image attachment.
- Tags.
- Custom exchange rate and original-currency display.
- General device-to-device identity transfer using an authorised device.
- Saved split presets and “reuse last split”.
- In-app unresolved correction flags.

## 5.3 Release 2 — Power tools

- Receipt OCR and itemised bill assignment.
- Tax, tip and fee distribution across selected items or participants.
- Multiple attachments.
- True offline mutation queue with conflict resolution.
- Push notifications or email only if users explicitly request them.
- Spending charts, trends and budgets.
- Bulk edit.
- Automatic category suggestion.
- Richer multi-currency reporting.
- PDF report export.
- Optional external payment deep links.

## 5.4 Explicit non-goals

- Custody or transfer of money.
- Bank credentials, card details, PINs or payment initiation.
- Public user discovery.
- Password, email OTP or SMS login in the initial release.
- Full personal budgeting or bookkeeping.
- Nested subgroups.
- Loans, interest, instalment schedules or credit scoring.
- Automatic bank-feed reconciliation in the core product.
- Complex approval chains.
- End-to-end encryption in the initial release.
- Guaranteed identity recovery after browser data is cleared.

---

# 6. Identity, sessions and joining

## 6.1 Terminology

- **Device profile:** the lightweight identity attached to a browser session. It has a display name and default colour.
- **Group member:** a ledger participant inside one group. It may be attached to a device profile or remain unclaimed.
- **Invite:** a revocable secret token used to join a group or claim a particular member slot.

Separating device profiles from group members is important. It allows the ledger to include “Sam” before Sam opens the app, permits group-specific nicknames, and keeps expense records stable if a device identity is later merged or replaced.

## 6.2 First visit

The first visit presents one focused card:

1. Heading: **What should your friends call you?**
2. Display-name input.
3. A small palette of accessible colour swatches.
4. Live circular avatar preview using initials.
5. Primary button: **Start**.
6. Supporting copy: **This creates a profile on this device. No password or email required.**

On submit, the server creates a device profile and a session. It sets an opaque session token in a secure cookie. The client never receives or stores the raw session token in JavaScript.

## 6.3 Long-lived session behaviour

Use a rolling session with a target lifetime of approximately 365 days. Refresh the expiry after meaningful authenticated activity, no more than once per day to avoid unnecessary writes.

Suggested production cookie properties:

- name: `__Host-tally_session`;
- `Secure` (required by the `__Host-` prefix);
- `HttpOnly`;
- `SameSite=Lax`;
- `Path=/`;
- no `Domain` attribute;
- `Max-Age` approximately one year.

For local development without HTTPS, use a clearly separate unprefixed development cookie name rather than weakening the production cookie contract.

The server stores only a cryptographic hash of the token. Sign out revokes the session row and deletes the cookie.

Do not promise “forever”. Browsers and users may clear cookies. The profile screen should say:

> **Your profile lives on this browser. Clearing browser data or using another device will create a new profile unless you transfer it first.**

## 6.4 Group creation

The create-group flow asks only for:

- group name;
- optional emoji or simple icon;
- currency, defaulting to AUD;
- optional initial participants.

The creator becomes an owner. They may add unclaimed members immediately using name and colour.

## 6.5 Invites

Two invite types are required:

### General invite

- May be reusable until revoked.
- Opens a preview of the group name and existing members.
- The current device profile joins as a new member.
- The user may adjust their group-specific display name and colour before joining.

### Personal claim invite

- Targets one unclaimed group member.
- One use by default.
- On acceptance, links the current device profile to that existing member slot.
- Existing expenses remain attached to the same group-member ID.
- Token is invalidated immediately after successful use.

Store only hashes of invite tokens. Make links rotatable and revocable.

## 6.6 Name collisions

Names are not globally unique. Inside a group, warn when two active members have the same display name, but do not block it. Show colour, initials and optionally a small suffix in selection lists.

## 6.7 Owners

Groups may have multiple owners. The create-group confirmation should gently suggest promoting one trusted backup owner after others join, because the app deliberately has no password-based recovery.

## 6.8 Sign out

Sign out must explain the consequence before confirmation:

> **Signing out disconnects this browser from your profile. Your group records stay in place, but you may not be able to reclaim the same profile without help from a group owner.**

---

# 7. Core user flows

## 7.1 Create a group and add friends

1. User selects **New group**.
2. Enters **Great Ocean Road** and leaves currency as AUD.
3. Optionally adds Alex, Jo and Priya as unclaimed members.
4. Group opens immediately.
5. Invite panel offers:
   - one general group link;
   - a personal claim link beside each unclaimed member;
   - QR rendering as a convenience, not a separate identity mechanism.
6. User shares links through the device share sheet or copies them.

## 7.2 Add a normal expense

1. User taps the persistent **Add expense** action.
2. Amount field receives focus.
3. User enters `48 + 12.50`; preview shows `$60.50`.
4. Adds description **Fuel**.
5. **Paid by me** is preselected.
6. All active members are initially selected.
7. User chooses **Shares**.
8. Sets Alex to 0, Jo to 1, Priya to 1 and themselves to 2.
9. Each row shows its calculated amount live.
10. Save performs server validation and an atomic database transaction.
11. The group screen updates balances and activity.

## 7.3 Add an expense with multiple payers

1. Open **Paid by**.
2. Add two payer rows.
3. Enter each contribution.
4. Remaining amount is shown live.
5. The final payer may use **Fill remaining**.
6. Save is disabled until payer contributions equal the expense total exactly.

## 7.4 Understand a balance

1. User opens **Balances**.
2. Header states **You are owed $84.20**.
3. The user’s row shows:
   - Paid: $320.00
   - Your share: $210.80
   - Settlements received: $25.00
   - Net: +$84.20
4. Tapping the row opens the contributing expenses and settlements.
5. A separate section shows the suggested way to settle.

## 7.5 Record a settlement

1. User opens a suggestion such as **Jo pays you $42.10**.
2. Amount defaults to the suggestion but can be reduced for partial payment.
3. Date defaults to today.
4. Optional note: **PayID**.
5. Save updates net balances immediately and records an activity event.

## 7.6 Correct an expense

1. Expense creator or owner opens the expense.
2. Chooses **Edit**.
3. Existing payer values and original share/percentage inputs are preserved.
4. Save uses the current version number.
5. If another change occurred, the update is rejected with a conflict screen showing the latest version and the attempted values.
6. A revision snapshot and activity event are stored.

## 7.7 Delete and restore

1. Expense creator or owner chooses **Remove expense**.
2. Confirmation explains the effect on balances.
3. Record is soft-deleted, excluded from calculations and shown in activity.
4. An owner may restore it from activity or group settings.

## 7.8 Finish a group

1. Members add final expenses.
2. In Release 1.1 they mark **I’m finished adding expenses**.
3. The group shows whether everyone is ready.
4. Suggested settlements are recorded.
5. Once all balances are zero, the owner archives the group.
6. An archived group remains searchable and exportable but leaves the active dashboard.

---

# 8. Detailed functional requirements

Requirements labelled **R1** are mandatory for Release 1. **R1.1** and **R2** belong to later releases.

## 8.1 Dashboard

### DASH-001 — Active group list — R1

Show all active groups in which the current device profile has an active claimed member.

Each group card displays:

- name and icon;
- up to four member avatars plus overflow count;
- current user position: **owed**, **owes** or **settled**;
- last activity date;
- unresolved correction indicator when added in R1.1.

### DASH-002 — Aggregate summary — R1

Show an aggregate only for groups sharing the same currency. Never add AUD and USD into one number.

When multiple currencies are present, show separate compact totals by currency.

### DASH-003 — Archived groups — R1

Archived groups are available under a secondary filter and never mixed into the default active list.

### DASH-004 — Empty state — R1

Use a simple illustration or icon, one sentence and one primary action:

> **No shared tabs yet. Create a group for a trip, home or night out.**

## 8.2 Groups

### GRP-001 — Create group — R1

Required: name and currency. Optional: icon and initial members.

### GRP-002 — Group settings — R1

Owner may update name, icon, default category, member roles, invite links and archive state.

Currency becomes immutable after the first active expense in Release 1. Changing currency later requires either deleting all entries or creating a new group. This prevents silent reinterpretation of historical amounts.

### GRP-003 — Group archive — R1

Owner may archive regardless of balance, but a warning appears when any balance is non-zero. Archive does not alter money or generate settlements.

### GRP-004 — Group restore — R1

Owner may restore an archived group.

### GRP-005 — Leave group — R1

A claimed member may leave only when:

- they are not the sole owner; and
- their net balance is zero.

Otherwise they must transfer ownership or settle/correct the ledger first. Leaving hides the group from their dashboard but preserves historical entries.

## 8.3 Members and invites

### MEM-001 — Add unclaimed member — R1

Owner supplies display name and colour. No email or phone is required.

### MEM-002 — Claim member — R1

A personal one-use link attaches the current device profile to an unclaimed group member.

### MEM-003 — Group-specific identity — R1

Each group member stores a display name and colour independently from the device profile defaults.

### MEM-004 — Roles — R1

Roles are owner and member. Viewer is added in R1.1.

### MEM-005 — Remove member — R1

An owner may remove a member only when the member has no active expense participation and a zero balance, or after their historical ledger identity has been explicitly merged with another member. Do not cascade-delete financial history.

### MEM-006 — Member merge — R1.1

Owner may merge an unclaimed or duplicate member into another member after reviewing affected entries. Keep an immutable merge event.

## 8.4 Expense creation and editing

### EXP-001 — Expense fields — R1

An expense has:

- description;
- total amount in integer minor units;
- currency inherited from group;
- expense date;
- optional category;
- optional plain-text note;
- one or more payers;
- one split method;
- one or more included participants;
- creator;
- version and lifecycle timestamps.

### EXP-002 — Amount calculator — R1

Accept digits, decimal point, parentheses and `+ - × * ÷ /`. Parse with a safe expression parser; never use JavaScript `eval`.

Display the evaluated amount beneath the expression. Reject division by zero, non-finite values, unsupported symbols, negative totals and values beyond configured limits.

### EXP-003 — Default values — R1

- Date defaults to today in the user’s local timezone.
- Payer defaults to the current group member.
- Included participants default to all active non-viewer members.
- Split method defaults to the last method used in that group by the current user, falling back to Equal.
- Category may be suggested from the user’s last matching description only in R2; do not add hidden automation in R1.

### EXP-004 — Multiple payers — R1

Allow any active non-viewer group member as payer, including an unclaimed member. Contributions must total the expense exactly.

### EXP-005 — Save transaction — R1

Saving an expense must atomically create or update:

- expense header;
- payer rows;
- participant allocation rows;
- revision snapshot;
- activity event.

No partially written expense may be visible.

### EXP-006 — Idempotency — R1

Every create request contains a client-generated mutation UUID unique within the group. Retrying the same UUID returns the original result rather than creating a duplicate.

### EXP-007 — Version conflict — R1

Updates include `expectedVersion`. The database update succeeds only when it matches the current version. On mismatch, return a typed conflict result and do not overwrite.

### EXP-008 — Plain text only — R1

Descriptions and notes are plain text. Escape on rendering. Do not accept HTML.

### EXP-009 — Search — R1

Search active and deleted-permission-visible expenses by description using case-insensitive matching. Add category, member and date filters in R1.1.

### EXP-010 — Custom categories — R1

Provide a small sensible default set and allow group owners or members to create group categories. Deleting a category detaches it from future selection but preserves its label on historical expenses or maps it to an archived category record.

Default categories:

- General
- Food & drink
- Groceries
- Transport
- Accommodation
- Household bills
- Entertainment
- Shopping

## 8.5 Split methods

### SPLIT-001 — Equal — R1

Divide the total equally among included members. Allocate remainder minor units deterministically by stable member order.

### SPLIT-002 — Shares — R1

Each member has a non-negative weight.

- `0` means excluded;
- `1` is a normal share;
- `2` is double;
- decimal values such as `0.5` are allowed;
- at least one weight must be greater than zero.

UI controls:

- minus button;
- editable numeric field;
- plus button;
- calculated currency amount;
- **Everyone 1 share** reset;
- **Exclude** shortcut that sets zero.

The backend computes owed amounts from the weights. The client preview is advisory only.

### SPLIT-003 — Exact amounts — R1

Every included member has an exact minor-unit amount. The values must sum to the total.

Show remaining amount continuously. Offer **Fill remaining** on a row. When only one blank row remains, it may be filled automatically, but never silently change a user-entered value.

### SPLIT-004 — Percentage — R1

Store percentages as integer basis points where 100.00% equals 10,000. Values must total exactly 10,000 basis points. Show remaining percentage and a **Fill remaining** action.

### SPLIT-005 — Preserve inputs — R1

Store both the user-entered split input and the calculated owed amount. Editing an expense restores the original shares, exact amounts or percentages, not a reconstructed approximation.

### SPLIT-006 — Inclusion — R1

A member with a zero share, zero exact amount or zero percentage may remain visibly excluded. The activity summary should say, for example, **Split between 3 of 5 people**.

### SPLIT-007 — Preview — R1

Every method shows a live participant amount preview and a total check. Save remains unavailable until valid.

## 8.6 Balances

### BAL-001 — Net definition — R1

For each member in one group and currency:

`net = expenses paid − allocated expense share + settlements sent − settlements received`

- Positive net: the member is owed money.
- Negative net: the member owes money.
- Zero: settled.

### BAL-002 — Invariant — R1

The sum of all active member net balances in a group and currency must equal zero. Treat any violation as a server error and surface it to observability.

### BAL-003 — Explanation — R1

A member breakdown displays:

- total paid;
- total allocated share;
- settlements sent;
- settlements received;
- net.

Tapping any total shows contributing entries.

### BAL-004 — Direct ledger view — R1

Show the underlying member net positions without implying that a particular member owes a particular creditor until a settlement plan is generated.

### BAL-005 — Suggested settlement plan — R1

Generate a deterministic plan by matching debtors and creditors. Describe it as **A simpler way to settle** or **Suggested payments**, not “the mathematically minimum number” unless a proven optimiser is later implemented.

### BAL-006 — Rounding tolerance — R1

All calculations use integer minor units. A group is settled only when every member net is exactly zero, not within a floating-point tolerance.

## 8.7 Settlements

### SET-001 — Record settlement — R1

Required:

- sending member;
- receiving member;
- positive amount;
- date.

Optional: note.

Sender and receiver must differ and belong to the group.

### SET-002 — Partial settlement — R1

Allow any positive amount up to a configurable safety maximum. Warn, but do not block, when the amount exceeds the current suggested amount because legitimate corrections are possible.

### SET-003 — Edit and delete — R1

Settlement creator and group owner may edit or soft-delete. All changes create revisions and activity events.

### SET-004 — Specific-expense allocation — R1.1

A settlement may optionally allocate some or all of its amount to active expenses. Allocation is explanatory metadata and must not be counted a second time in group balances.

Rules:

- allocation totals may not exceed the settlement amount;
- allocations must refer to expenses in the same group and currency;
- unallocated remainder is labelled **General balance**;
- deleting an expense detaches or tombstones allocations but does not delete the settlement.

### SET-005 — Payment instructions — R1.1

A member may add plain-text instructions such as PayID name, bank account nickname or preferred app. Warn users not to enter passwords, PINs or full card details. Tally does not verify or execute payments.

## 8.8 Activity, revisions and corrections

### ACT-001 — Activity feed — R1

Record creation, edit, removal, restore, settlement, member join, role change, invite rotation and group archive events.

### ACT-002 — Revision snapshot — R1

Before every update or deletion, store an immutable snapshot sufficient to reconstruct the prior state, including payer and split rows.

### ACT-003 — Human summary — R1

Activity events use clear copy, for example:

- **Dev added “Dinner” for $184.50.**
- **Alex changed Jo’s share from 1 to 0.**
- **Priya recorded a $42.10 payment to Dev.**
- **Dev restored “Fuel”.**

Do not expose raw JSON as the primary history experience.

### ACT-004 — Restore — R1

Group owner can restore soft-deleted expenses and settlements unless restoration would conflict with a hard business constraint. Restoration creates a new revision and activity event.

### ACT-005 — Correction flag — R1.1

A member who cannot edit an entry may flag it with a short reason. Show unresolved flags to owners and the creator. Resolving a flag records the resolution but does not erase the discussion.

## 8.9 Recurring expenses — R1.1

### REC-001 — Fixed recurring rule

Support weekly, fortnightly, monthly and yearly recurrence.

### REC-002 — Variable amount prompt

For variable bills, create a due prompt rather than an expense. The dashboard shows **Electricity bill is ready — enter this period’s amount**. When completed, generate the expense from the stored payer and split template.

### REC-003 — Idempotent generation

A recurrence occurrence has a unique rule/date key. Cron retries must not generate duplicates.

### REC-004 — Editing series

Offer:

- this expense only;
- this and future occurrences;
- the recurring rule.

Keep Release 1.1 implementation modest; do not replicate a full calendar recurrence engine.

## 8.10 Multi-currency — R1.1

Release 1 uses a single group currency. Release 1.1 may allow an expense to store:

- original amount and currency;
- explicit rate to group base currency;
- converted base amount in minor units;
- rate source: manual or entered default;
- rate timestamp.

Never silently change historical converted values when market rates change. A custom rate is visible on the expense detail screen.

## 8.11 Export — R1.1

CSV export should include:

- group metadata;
- expenses;
- payer contributions;
- participant split inputs and owed amounts;
- settlements;
- categories;
- timestamps and authorship.

Use separate CSV files in one ZIP if a single flat file would lose structure. Do not include raw session or invite tokens.

---

# 9. Money and calculation model

## 9.1 Never use binary floating point for money

Store final monetary amounts as integer minor units:

- AUD $10.25 → `1025`;
- JPY ¥500 → `500`;
- currencies with three decimals use their ISO exponent.

The amount parser may use an arbitrary-precision decimal library, but conversion to minor units occurs before persistence.

## 9.2 Share allocation algorithm

Given total minor units `T` and non-negative weights `w[i]`:

1. Reject when all weights are zero.
2. Compute exact quota `q[i] = T × w[i] / sum(w)` using arbitrary precision.
3. Set initial allocation `a[i] = floor(q[i])`.
4. Compute remainder `r = T − sum(a)`.
5. Sort participants by descending fractional part of `q[i]`.
6. Break ties by stable group-member order, then member ID.
7. Add one minor unit to the first `r` participants.
8. Assert `sum(a) = T`.

This is the largest-remainder method and produces deterministic, explainable results.

### Example A — shares with exclusion

Total: $30.00  
Shares: Dev 1, Alex 1, Jo 0  
Result: Dev $15.00, Alex $15.00, Jo $0.00.

### Example B — uneven cent

Total: $10.00  
Shares: A 1, B 2, C 3  
Exact quotas: 166.666…, 333.333…, 500 minor units  
Result: A $1.67, B $3.33, C $5.00.

### Example C — equal thirds

Total: $10.00  
Equal split across three people  
Result by stable member order: $3.34, $3.33, $3.33.

## 9.3 Percentage allocation

Store basis points. Use the same largest-remainder allocation to convert percentages to minor units. Require sum of basis points to equal 10,000.

## 9.4 Exact allocation

The user-entered minor units must sum exactly to the expense total. There is no rounding step.

## 9.5 Multiple payers

Payer contributions are independent of participant shares. A person may pay without benefiting, benefit without paying, do both, or do neither.

Require:

`sum(payer amounts) = expense total`

## 9.6 Expense balance contribution

For member `m` on expense `e`:

`expense_delta(m,e) = paid_by_m(e) − owed_by_m(e)`

A positive delta means that expense increases what the member should receive. A negative delta means it increases what they owe.

## 9.7 Settlement contribution

For a settlement from A to B:

- A receives `+amount` in their net calculation because sending money reduces what A owes;
- B receives `−amount` because receiving money reduces what B is owed.

This corresponds to:

`net = paid − share + sent − received`

## 9.8 Suggested settlement algorithm

Release 1 uses a deterministic greedy matcher:

1. Build creditors with positive net and debtors with negative net.
2. Sort both by absolute balance descending, then stable member order.
3. Match the largest debtor to the largest creditor.
4. Transfer the smaller of the debtor’s absolute amount and creditor’s amount.
5. Reduce both balances and repeat until zero.

This typically reduces payment count and is easy to explain. It is not labelled as a proof of global minimum.

## 9.9 Calculation module

All calculation logic belongs in one server-safe pure module, for example:

`src/domain/money/`

Suggested exports:

- `parseAmountExpression`
- `toMinorUnits`
- `formatMoney`
- `allocateEqual`
- `allocateShares`
- `allocatePercentages`
- `validateExactSplit`
- `calculateMemberNets`
- `suggestSettlements`
- `assertBalancedLedger`

The client may import pure preview functions where safe, but the server always recalculates and validates before persistence.

---

# 10. Roles, permissions and trust model

## 10.1 Default permission matrix

| Action | Owner | Entry creator | Other member | Viewer (R1.1) |
|---|---:|---:|---:|---:|
| View group and ledger | Yes | Yes | Yes | Yes |
| Add expense | Yes | Yes | Yes | No |
| Edit own expense | Yes | Yes | No | No |
| Edit another member’s expense | Yes | No | No | No |
| Remove own expense | Yes | Yes | No | No |
| Remove another member’s expense | Yes | No | No | No |
| Restore deleted entry | Yes | No | No | No |
| Add settlement | Yes | Yes | Yes | No |
| Edit own settlement | Yes | Yes | No | No |
| Manage members and invites | Yes | No | No | No |
| Archive group | Yes | No | No | No |
| Flag correction (R1.1) | Yes | Yes | Yes | No |
| Export group | Yes | Yes | Yes | Optional |

This is intentionally safer than fully open editing. It avoids an approval workflow while preventing any member from silently rewriting another person’s records.

## 10.2 Authorisation rule

Every server mutation must:

1. resolve the current session;
2. resolve the claimed active group member;
3. check action-specific permission;
4. scope all reads and writes to the group;
5. perform the mutation in a transaction;
6. create revision and activity records where required.

Never trust a group slug, member ID or owner flag supplied by the client.

## 10.3 Soft deletion

Expenses, settlements, groups and categories use lifecycle status or `deleted_at` rather than immediate hard deletion. Session and invite tokens may be hard-deleted after a retention period because they are not financial records.

## 10.4 Audit retention

For the private deployment, keep financial activity and revision history indefinitely unless the entire group is intentionally purged by an owner through a future explicit destructive flow.

---

# 11. Information architecture and screen specification

## 11.1 Route map

Public or session-establishing routes:

- `/` — dashboard when signed in; onboarding otherwise
- `/join/[token]` — join or claim flow
- `/shared/[token]` — read-only share view in R1.1

Authenticated application routes:

- `/groups/new`
- `/g/[slug]`
- `/g/[slug]/expenses/[expenseId]`
- `/g/[slug]/balances`
- `/g/[slug]/activity`
- `/g/[slug]/settings`
- `/g/[slug]/export` — R1.1 route handler
- `/profile`

Prefer modal routes or responsive sheets for add/edit flows only when the selected Next.js pattern remains accessible and back-button-safe. A full page is acceptable on small screens.

## 11.2 Navigation

### Mobile

- Top app bar with group title and contextual menu.
- Dashboard uses no persistent bottom navigation in Release 1; keep the app shallow.
- Group screen has compact tabs: **Expenses**, **Balances**, **Activity**.
- Floating or sticky bottom **Add expense** button.
- **Settle up** as a secondary action near the balance summary.

### Desktop

- Narrow left rail for active groups and profile.
- Main content column with a comfortable maximum width.
- Optional right summary rail for balance and settlement suggestions.

Do not render a dense accounting table as the default desktop experience.

## 11.3 Dashboard visual hierarchy

1. Greeting and profile avatar.
2. Currency-separated summary.
3. Primary **New group** action.
4. Active group cards.
5. Archived link.

Group cards use full phrases: **You owe $31.50**, **You’re owed $84.20**, or **Settled up**. Do not rely on colour alone.

## 11.4 Group overview

Header:

- icon and group name;
- compact member avatar stack;
- share/invite action;
- overflow settings action.

Summary card:

- one large current-user net amount;
- plain-language status;
- smaller Paid and Share values;
- **See balance details** link.

Expense list row:

- date;
- category icon;
- description;
- payer sentence, e.g. **Dev paid $84.00**;
- user impact, e.g. **you borrowed $21.00** or **you lent $42.00**;
- author/edit marker only when useful.

Settlement rows look visually distinct from expenses but remain in chronological context.

## 11.5 Add expense screen

The first viewport should contain:

1. Large amount input.
2. Description.
3. **Paid by** summary.
4. **Split between** summary and split method.
5. Live validity status.
6. Sticky **Save expense**.

A collapsed **More details** section contains date, category and note.

### Amount field

- Uses tabular numerals.
- Currency prefix is fixed by the group.
- Calculator expression may be displayed in a smaller line above the evaluated total.
- Keypad on mobile should favour decimal input but still allow calculator operators through a small operator strip.

### Participant selection

Use member rows or chips with colour avatar and name. Avoid tiny checkboxes. Tapping a row toggles inclusion; selecting Shares then shows the weight control.

### Validation copy

Use precise inline messages:

- **Payer amounts are $12.50 short.**
- **Shares need at least one person above 0.**
- **Percentages total 95%; 5% remains.**
- **Exact amounts are $0.01 over.**

Do not show a generic “Invalid split”.

## 11.6 Expense detail

Sections:

- amount, description, category and date;
- paid-by breakdown;
- split breakdown with original input and resulting amount;
- current user effect;
- note;
- creator and last updated information;
- revision history;
- edit/remove actions when authorised.

Example calculation explanation:

> **You paid $60.50 and your 2 of 4 total shares equal $30.25, so this expense adds $30.25 to what you are owed.**

## 11.7 Balances screen

Top section: current user summary.

Member list columns or stacked fields:

- Paid
- Share
- Sent/received
- Net

Settlement suggestion card:

- **Jo pays Dev $42.10**
- **Record payment**
- optional **Why this payment?** explanation.

Include a toggle or secondary disclosure for **Original ledger** versus **Suggested payments**, making clear that simplification changes who pays whom, not anyone’s final total.

## 11.8 Activity screen

Chronological timeline with filters for All, Expenses, Payments and Members. Release 1 may ship All only, but data should support later filters.

Each item includes actor, action, timestamp and a link to the entity. Deleted entities open a tombstone detail with restore for owners.

## 11.9 Profile

- display name;
- default colour;
- optional payment instructions in R1.1;
- session/device note;
- sign out;
- later: transfer to another device.

Do not use the word “account” prominently because there is no recoverable account in Release 1.

---

# 12. Visual design and branding

## 12.1 Brand position

Tally should feel like a well-designed shared notebook, not a bank, crypto wallet or corporate expense system.

Brand attributes:

- calm;
- fair;
- human;
- quietly capable;
- trustworthy without being severe;
- playful enough for friends, restrained enough for household bills.

## 12.2 Working identity

**Name:** Tally  
**Tagline:** Shared costs, clearly.  
**Logo direction:** two rounded ledger strokes resolving into a balanced equals-like mark or two overlapping tabs. Avoid literal coins, dollar signs, pie charts and handshake clichés.

Treat the name as a codename until availability is checked. The implementation should keep product name and metadata centralised so it can be changed in one place.

## 12.3 Colour direction

Use the `design-system` skill to produce accessible tokens. Suggested direction, not a requirement to hard-code these exact values:

- warm off-white canvas;
- near-black green-tinted ink;
- quiet grey-green borders;
- forest green primary around `#2E7D32`;
- restrained amber for warnings;
- muted red for destructive or owing states;
- selectable member colours that are distinct in both light and dark contexts.

Never communicate owed/owing or validity through hue alone. Pair colour with sign, icon and text.

## 12.4 Typography

- Clean contemporary sans-serif chosen by the design system.
- Financial values use tabular numerals.
- Large values are prominent but not oversized fintech theatrics.
- Body text remains at least 16px equivalent on mobile.
- Limit weights to a small hierarchy: regular, medium, semibold.

## 12.5 Layout and surfaces

- Generous whitespace.
- 8px spacing rhythm.
- Cards use subtle border and low or no shadow.
- Corners are moderately rounded, approximately 14–18px depending on component scale.
- Primary content width should remain readable on desktop rather than stretching edge to edge.
- Avoid glassmorphism, heavy gradients and excessive pill-shaped elements.

## 12.6 Member colours

Offer approximately 10 curated colours with contrast-safe foregrounds. A member’s colour appears in:

- avatar;
- small split indicators;
- charts in future releases;
- never as the sole identifier.

Prevent selecting a custom arbitrary colour in Release 1; a curated palette preserves accessibility and visual quality.

## 12.7 Motion

- Short, purposeful transitions, generally 120–200ms.
- Respect `prefers-reduced-motion`.
- Use subtle number transitions only when they do not obscure correctness.
- Do not animate balances in a way that makes users question the final value.

## 12.8 Voice and copy

Use plain, friendly language:

- **Add expense**, not **Create transaction**.
- **Paid by**, not **Creditor**.
- **Your share**, not **Liability allocation**.
- **Remove expense**, not **Void journal entry**.
- **Suggested payments**, not **Optimised debt graph**.

Use exact dates and amounts in destructive confirmations.

## 12.9 Accessibility

Target WCAG 2.2 AA.

- Minimum 44×44px touch targets.
- Visible focus states.
- Full keyboard support.
- Correct labels and descriptions for split controls.
- Screen-reader announcement when remainder or validation state changes.
- Accessible dialog focus trapping and return.
- No horizontal scrolling at 320–360px widths.
- Colour contrast verified by the design-system tooling.

---

# 13. Technical architecture

## 13.1 Recommended stack

Use the exact conventions of `vercel-neon-glm-apps`, with the following intended architecture:

- Next.js App Router with TypeScript;
- React Server Components for read-heavy pages;
- server actions or route handlers for authenticated mutations;
- Neon Postgres;
- Drizzle ORM and generated SQL migrations;
- a Neon serverless connection mode that supports transactions for multi-table mutations;
- Zod or the skill’s equivalent for boundary validation;
- Tailwind and components/tokens supplied by `design-system`;
- Vitest for domain and server tests;
- Playwright for critical end-to-end flows;
- Vercel Preview deployments with isolated Neon preview branches where supported;
- Vercel Cron for Release 1.1 recurring-expense generation.

Do not expose the database directly to the browser. The application server owns all authorisation and calculations.

## 13.2 Runtime choice

Expense and settlement writes require real database transactions. Prefer the Neon/Drizzle adapter recommended by the deployment skill for interactive transactions, generally a pooled serverless connection rather than an HTTP-only single-query adapter for these mutations.

Simple read queries may use the same adapter to minimise complexity. Do not create two database access patterns until profiling proves a need.

## 13.3 Suggested project structure

```text
src/
  app/
    (public)/
    (app)/
    join/[token]/
    api/cron/recurring/          # R1.1
  components/
    expense/
    balances/
    groups/
    members/
    shared/
  domain/
    money/
    expenses/
    settlements/
    permissions/
    sessions/
  db/
    schema/
    queries/
    migrations/
    client.ts
  server/
    actions/
    auth/
    services/
    validation/
  styles/
  test/
```

Keep domain calculations independent of React and database code.

## 13.4 Rendering and data flow

- Server components load dashboard, group and detail data.
- Mutations execute on the server and return typed success, validation, permission or conflict results.
- Revalidate only affected routes after a successful mutation.
- Use optimistic UI sparingly. Never show an unconfirmed balance as final.
- A pending expense may appear locally with a clear pending state, but balances should update after server confirmation.

## 13.5 No real-time infrastructure in Release 1

The app does not need WebSockets, presence or live cursors. A normal refresh after mutation is sufficient for friend groups. Add lightweight polling or visibility-triggered refresh only if stale data becomes a real problem.

## 13.6 PWA

Release 1 includes:

- manifest;
- app icons;
- installability;
- cached application shell and static assets;
- graceful offline message.

Do not queue financial mutations offline in Release 1. The Save button should clearly say that a connection is required. True offline write sync belongs to Release 2 because conflict semantics are non-trivial.

---

# 14. Database model

Use UUID primary keys generated server-side or by Postgres. Use `timestamptz` for timestamps and explicit date columns for expense dates. Exact names may follow the deployment skill’s conventions.

## 14.1 Core entities

### `users`

Represents a lightweight device profile, not a strong verified identity.

```text
id uuid primary key
display_name text not null
colour_key text not null
created_at timestamptz not null
updated_at timestamptz not null
deleted_at timestamptz null
```

### `user_sessions`

```text
id uuid primary key
user_id uuid not null references users(id)
token_hash text unique not null
created_at timestamptz not null
last_seen_at timestamptz not null
expires_at timestamptz not null
revoked_at timestamptz null
user_agent_hash text null
```

Never store the raw token.

### `groups`

```text
id uuid primary key
slug text unique not null
name text not null
icon_key text null
base_currency char(3) not null default 'AUD'
status text not null check in ('active','archived')
default_split_method text null
created_by_user_id uuid not null references users(id)
created_at timestamptz not null
updated_at timestamptz not null
archived_at timestamptz null
```

### `group_members`

The stable financial identity inside a group.

```text
id uuid primary key
group_id uuid not null references groups(id)
user_id uuid null references users(id)
display_name text not null
colour_key text not null
role text not null check in ('owner','member','viewer')
status text not null check in ('active','left','merged')
joined_at timestamptz null
claimed_at timestamptz null
ready_to_settle_at timestamptz null       # R1.1
merged_into_member_id uuid null references group_members(id)
sort_order integer not null
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

- at most one active group member per `(group_id, user_id)` when `user_id` is non-null;
- a viewer cannot be a payer or split participant;
- a merged member is not selectable for new entries.

### `group_invites`

```text
id uuid primary key
group_id uuid not null references groups(id)
token_hash text unique not null
invite_type text not null check in ('general','claim_member','readonly')
target_member_id uuid null references group_members(id)
created_by_member_id uuid not null references group_members(id)
max_uses integer null
use_count integer not null default 0
expires_at timestamptz null
revoked_at timestamptz null
created_at timestamptz not null
```

### `categories`

```text
id uuid primary key
group_id uuid null references groups(id)
name text not null
icon_key text not null
colour_key text null
is_system boolean not null default false
status text not null check in ('active','archived')
created_by_member_id uuid null references group_members(id)
created_at timestamptz not null
updated_at timestamptz not null
```

System categories have null `group_id`; custom categories are group-scoped.

### `expenses`

```text
id uuid primary key
group_id uuid not null references groups(id)
description text not null
total_minor bigint not null check (total_minor > 0)
currency char(3) not null
expense_date date not null
category_id uuid null references categories(id)
note text null
split_method text not null check in ('equal','shares','exact','percentage')
created_by_member_id uuid not null references group_members(id)
recurring_rule_id uuid null               # R1.1
status text not null check in ('active','deleted')
version integer not null default 1
client_mutation_id uuid not null
created_at timestamptz not null
updated_at timestamptz not null
deleted_at timestamptz null
```

Unique `(group_id, client_mutation_id)`.

### `expense_payers`

```text
expense_id uuid not null references expenses(id)
member_id uuid not null references group_members(id)
paid_minor bigint not null check (paid_minor >= 0)
primary key (expense_id, member_id)
```

### `expense_participants`

```text
expense_id uuid not null references expenses(id)
member_id uuid not null references group_members(id)
input_value numeric(20,8) not null
owed_minor bigint not null check (owed_minor >= 0)
is_included boolean not null
allocation_order integer not null
primary key (expense_id, member_id)
```

Meaning of `input_value` depends on split method:

- Equal: 1 or 0;
- Shares: weight;
- Exact: minor-unit amount represented exactly;
- Percentage: basis points.

### `settlements`

```text
id uuid primary key
group_id uuid not null references groups(id)
from_member_id uuid not null references group_members(id)
to_member_id uuid not null references group_members(id)
amount_minor bigint not null check (amount_minor > 0)
currency char(3) not null
settled_on date not null
note text null
created_by_member_id uuid not null references group_members(id)
status text not null check in ('active','deleted')
version integer not null default 1
client_mutation_id uuid not null
created_at timestamptz not null
updated_at timestamptz not null
deleted_at timestamptz null
```

Constraints:

- `from_member_id <> to_member_id`;
- unique `(group_id, client_mutation_id)`.

### `settlement_allocations` — R1.1

```text
settlement_id uuid not null references settlements(id)
expense_id uuid not null references expenses(id)
amount_minor bigint not null check (amount_minor > 0)
primary key (settlement_id, expense_id)
```

### `entity_revisions`

```text
id uuid primary key
group_id uuid not null references groups(id)
entity_type text not null
entity_id uuid not null
version integer not null
action text not null check in ('create','update','delete','restore','merge')
snapshot jsonb not null
changed_by_member_id uuid not null references group_members(id)
created_at timestamptz not null
```

Unique `(entity_type, entity_id, version)` where practical.

### `activity_events`

```text
id uuid primary key
group_id uuid not null references groups(id)
actor_member_id uuid null references group_members(id)
entity_type text not null
entity_id uuid null
action text not null
summary_payload jsonb not null
created_at timestamptz not null
```

### `recurring_rules` — R1.1

```text
id uuid primary key
group_id uuid not null references groups(id)
name text not null
cadence text not null
interval_value integer not null default 1
next_due_on date not null
amount_mode text not null check in ('fixed','prompt')
fixed_amount_minor bigint null
template_payload jsonb not null
status text not null check in ('active','paused','ended')
created_by_member_id uuid not null references group_members(id)
created_at timestamptz not null
updated_at timestamptz not null
```

A generated occurrence table or unique key `(rule_id, due_on)` prevents duplicates.

## 14.2 Recommended indexes

- active expenses by `(group_id, expense_date desc, created_at desc)`;
- activity by `(group_id, created_at desc)`;
- payer rows by `member_id`;
- participant rows by `member_id`;
- active settlements by `(group_id, settled_on desc)`;
- active group members by `(group_id, sort_order)`;
- unique session and invite token hashes;
- partial unique active `(group_id, user_id)` for claimed members;
- search index on normalised expense description when data volume warrants it.

## 14.3 No stored balance table in Release 1

Compute balances from active expense and settlement rows. This avoids stale denormalised state. Add a cached summary or materialised view only after measuring a real performance issue.

## 14.4 Transaction boundaries

The following each require one database transaction:

- create/edit/delete/restore expense;
- create/edit/delete/restore settlement;
- claim member;
- merge member;
- rotate invite;
- generate recurring occurrence.

The activity event and revision must commit or roll back with the primary change.

---

# 15. Server actions and contracts

Exact transport may be server actions or route handlers. Keep domain payloads explicit and typed.

## 15.1 Example expense command

```ts
interface SaveExpenseCommand {
  groupId: string;
  expenseId?: string;
  expectedVersion?: number;
  clientMutationId: string;
  description: string;
  amountExpression: string;
  expenseDate: string; // YYYY-MM-DD
  categoryId?: string;
  note?: string;
  payers: Array<{
    memberId: string;
    amountMinor: number;
  }>;
  split:
    | {
        method: 'equal';
        participants: Array<{ memberId: string; included: boolean }>;
      }
    | {
        method: 'shares';
        participants: Array<{ memberId: string; shares: string }>;
      }
    | {
        method: 'exact';
        participants: Array<{ memberId: string; amountMinor: number }>;
      }
    | {
        method: 'percentage';
        participants: Array<{ memberId: string; basisPoints: number }>;
      };
}
```

Server responsibilities:

1. authenticate;
2. authorise;
3. parse and canonicalise the amount;
4. verify every member belongs to the group and is eligible;
5. recalculate allocations;
6. verify payer and participant sums;
7. check expected version or idempotency key;
8. write in a transaction;
9. assert group ledger balance;
10. return canonical persisted values.

## 15.2 Suggested action inventory

### Session

- `createDeviceProfile`
- `updateDeviceProfile`
- `signOut`
- `transferIdentity` — R1.1

### Groups

- `createGroup`
- `updateGroup`
- `archiveGroup`
- `restoreGroup`
- `leaveGroup`

### Members and invites

- `addUnclaimedMember`
- `updateGroupMember`
- `promoteOwner`
- `createGeneralInvite`
- `createClaimInvite`
- `revokeInvite`
- `acceptInvite`
- `mergeMembers` — R1.1

### Expenses

- `createExpense`
- `updateExpense`
- `removeExpense`
- `restoreExpense`

### Settlements

- `createSettlement`
- `updateSettlement`
- `removeSettlement`
- `restoreSettlement`

### Categories

- `createCategory`
- `updateCategory`
- `archiveCategory`

### Release 1.1

- `setReadyToSettle`
- `createRecurringRule`
- `completeVariableRecurringPrompt`
- `flagCorrection`
- `resolveCorrection`
- `createReadOnlyLink`
- `exportGroup`

## 15.3 Typed result shape

Avoid throwing user-facing validation errors. Return a discriminated result:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; type: 'validation'; fieldErrors: Record<string, string[]> }
  | { ok: false; type: 'forbidden'; message: string }
  | { ok: false; type: 'conflict'; latestVersion: number; latestData: unknown }
  | { ok: false; type: 'not_found'; message: string }
  | { ok: false; type: 'unexpected'; referenceId: string };
```

Unexpected internal details go to logs, not the browser.

---

# 16. Security and privacy

## 16.1 Security posture

This is convenient, low-friction identity for trusted groups. It is not appropriate for strangers, regulated expense approval or high-value financial arrangements. State this plainly in product documentation.

## 16.2 Session token

- Generate at least 256 bits of cryptographically secure randomness.
- Encode URL-safely.
- Store only a strong hash in Postgres.
- Compare in constant-time where applicable.
- Rotate or create a new token on significant session changes.
- Revoke on sign out.

## 16.3 Invite token

Use the same randomness standard. Never place a database ID alone in an invite URL. Hash tokens at rest. General invites are revocable; claim invites are one-use by default.

## 16.4 CSRF and mutation safety

- SameSite cookie protection.
- Validate `Origin` or `Host` for state-changing requests.
- Do not implement mutations as unauthenticated GET requests.
- Use idempotency keys for create actions.

## 16.5 Authorisation

Every query must be scoped through active group membership. Prefer returning not-found rather than confirming the existence of inaccessible groups or entries.

## 16.6 Input handling

- Zod validation at server boundary.
- Plain text descriptions and notes.
- Length limits.
- Safe amount parser.
- Parameterised queries through ORM.
- File type, size and malware controls before attachments are introduced.

Suggested limits:

- display name: 1–50 characters;
- group name: 1–80;
- expense description: 1–120;
- note: 0–2,000;
- category name: 1–40;
- practical amount ceiling configurable per environment.

## 16.7 Headers

Configure a sensible Content Security Policy, frame restrictions, MIME sniffing protection, referrer policy and secure transport through Vercel conventions.

## 16.8 Rate limits

Apply modest rate limits to:

- profile creation;
- invite acceptance;
- invite generation;
- mutation bursts;
- public read-only links in R1.1.

A lightweight database or platform limit is sufficient for the private deployment.

## 16.9 Sensitive payment instructions

Payment notes are plain text and optional. Display:

> **Only add information you are comfortable sharing with everyone in this group. Never enter a password, PIN or full card number.**

## 16.10 Privacy

- No third-party advertising SDKs.
- No sale of data.
- Minimal analytics.
- Do not send expense descriptions or notes to an AI service in Release 1.
- Receipt OCR later requires explicit consent and a separate privacy review.

---

# 17. Performance, resilience and observability

## 17.1 Performance targets

- p75 LCP below 2.5 seconds on typical mobile connections.
- p75 interaction latency below 200ms for local controls.
- Server mutation response ideally below 800ms in the deployment region.
- Group pages should remain responsive with at least 5,000 expenses.

These are targets, not reasons to prematurely denormalise.

## 17.2 Pagination

Paginate expense and activity lists cursor-first once more than 50 rows are present. The balance aggregate must cover the whole group, not only the loaded page.

## 17.3 Error handling

- Friendly inline validation for user mistakes.
- Dedicated conflict resolution for stale edits.
- Retry-safe create actions.
- Error boundary with a reference ID for unexpected failures.
- Preserve unsaved form input after recoverable errors.

## 17.4 Observability

Capture:

- server exceptions;
- database latency;
- transaction failures;
- failed ledger invariant checks;
- recurring cron outcomes;
- deployment version;
- anonymous performance metrics.

Never log raw session tokens, invite tokens, payment instructions, receipt images or complete notes.

## 17.5 Backups and migrations

Use Neon’s backup/branching capabilities according to the deployment skill. Production schema changes use generated, reviewed migrations. Do not use direct schema push in production.

Every destructive migration needs:

- a data-preserving forward plan;
- a rollback or restore strategy;
- verification queries.

---

# 18. Test strategy

## 18.1 Domain unit tests

The money module requires exhaustive tests.

### Mandatory split cases

- $10.00 equally among 3 → 334, 333, 333 in stable order.
- $0.01 among 3 → 1, 0, 0.
- shares 1/1/0 on $30.00 → 1500, 1500, 0.
- shares 1/2/3 on $10.00 → 167, 333, 500.
- decimal shares 0.5/1.5 on $10.00 → 250, 750.
- all shares zero → validation error.
- negative share → validation error.
- percentage total 9,999 basis points → validation error.
- exact split one cent short → validation error.
- payer contributions one cent over → validation error.
- large valid amounts do not overflow supported integer handling.

### Mandatory balance cases

- one payer, two equal participants;
- multiple payers;
- payer excluded from benefit;
- participant pays nothing;
- partial settlement;
- over-settlement warning but internally balanced ledger;
- expense delete and restore;
- settlement delete and restore;
- sum of all member nets equals zero after every operation.

### Settlement suggestion cases

- one debtor, one creditor;
- multiple debtors, one creditor;
- one debtor, multiple creditors;
- tie ordering is deterministic;
- already settled group returns no suggestions;
- one-cent balances resolve exactly.

## 18.2 Server integration tests

- raw session token is never stored.
- revoked/expired session fails.
- invite claim is one-use.
- unauthorised group access returns not found or forbidden as designed.
- member cannot edit another member’s expense.
- owner can edit and restore.
- stale version returns conflict.
- duplicate client mutation returns existing entity.
- expense and child rows roll back together on error.
- activity and revision are created atomically.
- archived groups remain readable but reject new expenses until restored.

## 18.3 End-to-end tests

Critical Playwright journeys:

1. New visitor creates profile, group and equal expense.
2. Owner adds unclaimed friend; friend claims through one-use link.
3. Friend adds a shares expense with one excluded member.
4. Owner views explained balance and records suggested settlement.
5. Creator edits expense; history shows change.
6. Other member cannot edit it.
7. Owner removes and restores expense.
8. Group becomes settled and is archived.
9. Sign out revokes access on that browser.
10. Mobile viewport has no horizontal overflow and all controls remain usable.

## 18.4 Accessibility tests

- automated axe checks on key screens;
- keyboard-only completion of onboarding, add expense and settlement;
- screen-reader labels for colour selection and share steppers;
- focus return after dialog close;
- live announcement of split remainder and save success;
- contrast verification through design-system tooling.

---

# 19. Release acceptance criteria

Release 1 is complete only when all of the following are true.

## Identity

- A new visitor can create a device profile with only name and colour.
- The session survives normal browser restarts.
- The raw session token never appears in database records or client-readable storage.
- Sign out revokes the server session and clears the cookie.

## Groups and people

- A user can create, archive and restore a group.
- A group can include unclaimed members.
- A one-use claim link attaches a device profile to the correct member without changing historical member IDs.
- A general link can be revoked.
- A group may have more than one owner.

## Expenses

- All four split methods work.
- Shares support zero, whole and decimal values.
- Multiple payers work.
- Built-in arithmetic works without `eval`.
- Every saved expense has payer sums and owed sums exactly equal to its total.
- Split inputs are preserved on edit.
- Duplicate submission does not duplicate the expense.
- Concurrent edits cannot silently overwrite one another.

## Balances and settlement

- Every member can see Paid, Share, Settlements and Net.
- The group net sum is always zero.
- Suggested settlements are deterministic.
- Full and partial settlements work.
- Deleted entries stop affecting balances and can be restored.

## Trust

- Only creator or owner can edit/remove an expense.
- Every mutation creates appropriate activity and revision records.
- Owners can inspect and restore removed entries.

## Experience

- The main journeys work at 360px mobile width and desktop.
- Keyboard and screen-reader basics pass.
- Empty, loading, validation, permission, offline, conflict and unexpected-error states exist.
- There are no daily limits, advertisements or premium prompts.
- Production deploys through Vercel with Neon migrations and secrets correctly configured.

---

# 20. Implementation sequence for an AI coding agent

Build vertical slices. Do not scaffold every future table and screen at once.

## Phase 0 — Project contract

1. Invoke `vercel-neon-glm-apps` and initialise the repository.
2. Invoke `design-system` and establish tokens, primitives and responsive shell.
3. Add linting, formatting, type checking, unit tests and Playwright.
4. Create environment validation.
5. Add a central `product-config` file for working name, tagline, currencies and palette keys.

**Exit:** clean local and preview build; health route; database connection test; design-system showcase page in development only.

## Phase 1 — Device identity

1. Add users and sessions schema/migrations.
2. Implement secure token creation/hash/lookup/revocation.
3. Build onboarding and profile shell.
4. Add authenticated route guard.
5. Test expiry and sign out.

**Exit:** a browser can establish and retain a profile without JavaScript-readable credentials.

## Phase 2 — Groups, members and invites

1. Add groups, group members and invites.
2. Build dashboard and create-group flow.
3. Add unclaimed members.
4. Implement general and claim invites.
5. Add owner promotion and archive.

**Exit:** two browsers can join the same group, including claiming a pre-created member.

## Phase 3 — Money engine first

1. Implement currency minor-unit handling.
2. Implement safe expression parser.
3. Implement equal, shares, exact and percentage allocation.
4. Implement balance and settlement suggestion functions.
5. Complete exhaustive unit tests before wiring forms.

**Exit:** all domain invariants pass independently of UI and database.

## Phase 4 — Expenses

1. Add expense, payer, participant and category schema.
2. Build add form using design-system controls.
3. Add live previews using shared pure functions.
4. Recalculate on server and save transactionally.
5. Add expense list and detail.
6. Add edit, soft delete, revision, activity and idempotency.

**Exit:** all split types and multiple payers work end to end; concurrent edit test passes.

## Phase 5 — Balances and settlements

1. Add aggregate balance queries.
2. Build explained member balances.
3. Add deterministic suggestions.
4. Add settlement CRUD with revisions/activity.
5. Add direct-versus-suggested explanation.

**Exit:** a group can move from expenses to exact zero using recorded settlements.

## Phase 6 — Trust and lifecycle

1. Finish permission enforcement.
2. Add owner restore views.
3. Add archived dashboard.
4. Add search.
5. Add all error and empty states.

**Exit:** destructive and unauthorised workflows are tested; no silent overwrite or hard financial deletion.

## Phase 7 — Polish and production

1. PWA manifest and offline shell.
2. Responsive and accessibility pass.
3. Performance profiling.
4. Observability and invariant alerts.
5. Production migrations and deployment documentation.
6. Seed/demo group only in non-production environments.

**Exit:** Release 1 acceptance checklist is fully green.

## Phase 8 — Release 1.1

Implement in this order:

1. CSV export;
2. ready-to-settle;
3. payment instructions and shareable summary;
4. specific-expense settlement allocation;
5. recurring fixed and variable prompts;
6. read-only access;
7. attachments;
8. multi-currency/custom rate;
9. identity transfer and member merge;
10. tags and saved split presets.

Each item should be separately deployable.

---

# 21. AI implementation guardrails

The coding agent must follow these rules:

1. **Do not use floating point for persisted money.**
2. **Do not duplicate split or balance logic in UI components.** Use the shared domain module.
3. **Do not trust client-calculated owed amounts.** Recalculate on the server.
4. **Do not expose Neon credentials or query the database directly from the browser.**
5. **Do not store raw session or invite tokens.**
6. **Do not make all group members unrestricted editors.** Follow the permission matrix.
7. **Do not hard-delete financial records in ordinary UI flows.**
8. **Do not introduce daily limits, subscriptions or advertisements.**
9. **Do not build receipt OCR, bank import or complex notifications before Release 1 is complete.**
10. **Do not create a bespoke component when the design-system skill supplies an equivalent.**
11. **Do not add unreviewed colours, spacing or typography outside design tokens.**
12. **Do not label the greedy settlement plan as mathematically optimal.**
13. **Do not mix currencies in one aggregate.**
14. **Do not call the device profile secure identity or promise permanent recovery.**
15. **Do not merge members by rewriting historical expense ownership.** Preserve stable group-member IDs and record the merge.
16. **Do not let a cron retry create duplicate recurring expenses.**
17. **Do not ship a mutation without idempotency, authorisation and transaction coverage.**
18. **Do not move to the next phase with failing domain tests.**

---

# 22. Research-request disposition ledger

This appendix ensures the major feature-request themes reviewed during research have an explicit outcome.

| Feature/request | Outcome | Rationale |
|---|---|---|
| Unlimited basic expense entry | Release 1 | Core utility must not be artificially constrained |
| Equal split | Release 1 | Table stakes |
| Shares split | Release 1, first-class | Essential stated requirement and best natural model for unequal relevance |
| Exact split | Release 1 | Common restaurant and household case |
| Percentage split | Release 1 | Common proportional case |
| Exclude selected people | Release 1 | A zero share or unselected participant handles non-relevant charges |
| Multiple payers | Release 1 | Preserves a strong Splitwise capability |
| Amount calculator | Release 1 | High-value speed improvement |
| Automatic remainder | Release 1 | Prevents tedious cent errors |
| Preserve split values on edit | Release 1 | Prevents destructive re-entry |
| Custom categories | Release 1 | Cheap, useful personalisation |
| Alias or nickname | Release 1 | Group member has group-scoped name |
| Guest/name-only person | Release 1 | Unclaimed member model |
| Invite without email or phone | Release 1 | Secret general or personal link |
| Debt simplification | Release 1 | Core value, transparently labelled |
| Toggle direct versus simplified understanding | Release 1 | Avoids reconciliation confusion |
| Safer edit/delete permissions | Release 1 | Creator/owner model plus history/restore |
| Edit history | Release 1 | Trust requirement |
| Restore deleted entries | Release 1 | Trust requirement |
| Manual group archive | Release 1 | Clean lifecycle |
| Basic search | Release 1 | Useful without premium gating |
| Expense-specific settlement | Release 1.1 | High-signal request; requires careful no-double-count design |
| Ready-to-settle status | Release 1.1 | Helps trip organisers close the ledger |
| Group reminder | Release 1.1 | Begin with shareable text, not notification infrastructure |
| Weekly reminders | Release 1.1 | Part of simple recurring/reminder model |
| Recurring fixed expense | Release 1.1 | Useful for households |
| Recurring variable amount | Release 1.1 | Prompt rather than guessed charge |
| Negative adjustment/reimbursement | Release 1.1 | Model as settlement, refund or negative expense type only after clear UX |
| Unequal reimbursement | Release 1.1 | Covered by settlement allocations or refund entry design |
| Custom exchange rate | Release 1.1 | Travel utility; historical rate stays fixed |
| Multiple currencies | Release 1.1 | Valuable but not required for initial AUD friend use |
| Share balance to WhatsApp/messages | Release 1.1 | Device share sheet and clear text summary |
| Preferred payment method | Release 1.1 | Plain-text instructions, no payment custody |
| Read-only access | Release 1.1 | Useful for observers and safer sharing |
| CSV export | Release 1.1, early | Data portability and trust |
| Receipt photo | Release 1.1 | Attachment before automation |
| Multiple receipt photos | Release 2 | Adds storage and management complexity |
| Receipt OCR | Release 2 | Valuable but error-prone and privacy-sensitive |
| Itemised receipt split | Release 2 | Strong feature, substantial UI and calculation scope |
| Scan receipt from gallery | Release 2 | Included in attachment/OCR workflow |
| Tags | Release 1.1 | Helpful secondary organisation |
| Group budgets | Release 2 | Adjacent, not required to settle |
| Personal expense dashboard | Release 2 | Useful analytics, not core ledger |
| Richer charts/trends | Release 2 | Follow after correctness and export |
| Automatic category | Release 2 | Convenience, should remain overridable |
| Bulk edit | Release 2 | Power-user workflow |
| Bank/card import | Later/optional | Significant integration, privacy and support burden |
| Country-specific payment integrations | Later/optional | Payment instructions cover most private use without brittle integrations |
| Offline viewing | Release 1 shell | Cached shell and graceful message |
| Offline mutation sync | Release 2 | Requires robust conflict handling |
| Subgroups | Not planned | Separate groups or presets stay clearer |
| Mandatory payment acknowledgement | Not planned | Too much friction; activity and correction flags are enough |
| Advance payments/future allocation | Not planned initially | Complicates ledger semantics |
| Public profiles/friend discovery | Not planned | Unnecessary privacy and abuse surface |

---

# 23. Decisions already resolved

The implementation agent should not reopen these unless a hard technical constraint appears.

1. **The app is a responsive web app/PWA, not separate native apps.**
2. **The initial currency is one currency per group, default AUD.**
3. **A group member is separate from a device profile.**
4. **Expense rows reference group-member IDs, not global user IDs.**
5. **Shares accept zero and decimal weights.**
6. **Money is integer minor units.**
7. **Balances are derived, not manually stored.**
8. **Suggested payments use deterministic greedy matching and transparent wording.**
9. **Ordinary financial deletion is soft deletion.**
10. **Only creator and owner edit/remove an expense; owner may restore.**
11. **The core app does not process payments.**
12. **The session is long-lived but not guaranteed permanent.**
13. **No cross-device recovery in Release 1.**
14. **No arbitrary usage limits or monetisation UI.**
15. **No true offline writes in Release 1.**
16. **Custom categories are included before analytics.**
17. **Specific-expense settlement is Release 1.1, not omitted.**
18. **Receipt OCR and bank imports do not block the initial release.**

---

# 24. Final product definition

Tally succeeds when it disappears into the social situation. Someone pays, records the cost in seconds, uses shares to express who was actually involved, and returns to the conversation. Later, every friend can see a calm, defensible ledger and a small set of suggested payments.

It should be simpler than Splitwise without being less fair, safer without becoming bureaucratic, and more beautiful without hiding the arithmetic.

**Core promise:**

> **Add any shared cost. Split it exactly the way the group experienced it. Understand every balance. Settle with confidence.**
