# Billing System — Implementation History (Archive)

> **⚠️ NON-NORMATIVE — HISTORICAL REFERENCE ONLY**  
> This document contains archived implementation history from SSOT_BILLING_SYSTEM_ANALYSIS.md  
> For current normative rules, see `/docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`  
> **Archive Date:** 1 January 2026

---

## Table of Contents

1. [Version Changelog (v5.0–v5.5)](#version-changelog-v50v55)
2. [Implementation History: v4.x](#implementation-history-v4x)
3. [Frontend Integration History: v4.x](#frontend-integration-history-v4x)
4. [Migration History: v3 → v4 → v5](#migration-history-v3--v4--v5)

---

## Version Changelog (v5.0–v5.5)

### v5.5 (1 January 2026)
- ✅ Finalized "Aborted Purchase Attempts" section (aligned with SSOT_ARCHITECTURE.md § 26.4)
- ✅ Added explicit/implicit cancellation rules
- ✅ Added "Completed payment ≠ auto-applied" rule
- ✅ Added "No pending-based UX assumptions" rule

### v5.4 (1 January 2026)
- ✅ Added "Aborted Purchase Attempts" section
- ✅ Cross-reference to SSOT_ARCHITECTURE.md § 26
- ✅ Transaction State → Entitlement Mapping table
- ✅ "No TTL timers in UI" rule

### v5.3 (1 January 2026)
- ✅ Marked v4.x sections as NON-NORMATIVE
- ✅ Updated API Endpoints (removed `/api/events/:id/publish`)
- ✅ Updated 409 response contract
- ✅ Migration section covers v3 → v4 → v5

### v5.2 (26 December 2024)
- ✅ Credit badge in header (Zap icon ⚡)
- ✅ AuthContext integration (0 extra API calls)
- ✅ Profile credits section
- ✅ Event create banner
- ✅ Dropdown details
- ✅ router.refresh() instead of window.reload()

### v5.1 (26 December 2024)
- ✅ Compensating transactions
- ✅ Rollback on failure
- ✅ Retry-safe
- ✅ CRITICAL logs for manual intervention

### v5.0 (26 December 2024)
- ✅ Unified enforcement in create/update
- ✅ No separate publish step
- ✅ Removed `/api/events/:id/publish` endpoint
- ✅ Removed `published_at` field
- ✅ Credit flow integrated in POST/PUT

---

## Implementation History: v4.x

> **⚠️ HISTORICAL — NOT CURRENT ARCHITECTURE**  
> v5+ is the current production model — see SSOT_BILLING_SYSTEM_ANALYSIS.md § "Event Save Enforcement (v5)"

### v4.1 (26 December 2024) — DEPRECATED
- ~~Publish endpoint integrated~~ — **REMOVED in v5.0**
- ✅ 409 handling (CreditConfirmationModal) — still valid, different trigger point

### v4.0 (26 December 2024)
**Major Changes (still valid in v5+):**
- ✅ `billing_products` table — SSOT for pricing (NO HARDCODE!)
- ✅ Unified purchase API — `/api/billing/purchase-intent`
- ✅ One-off credits — EVENT_UPGRADE_500 (perpetual, 1000 KZT)
- ~~Publish enforcement~~ — **Moved to save-time in v5+**
- ✅ Kaspi stub mode
- ✅ Status polling — `/api/billing/transactions/status`

**Breaking Changes (v3→v4):**
- ❌ Deleted `/api/billing/credits/purchase` → use `/api/billing/purchase-intent`
- ❌ Deleted `/api/billing/credits/confirm` → use `/api/dev/billing/settle` (DEV)

---

## Frontend Integration History: v4.x

> **⚠️ HISTORICAL — NOT CURRENT IMPLEMENTATION**  
> v5+ has NO separate publish step; enforcement happens at save-time (POST/PUT).

### v4.x Frontend Flow (DEPRECATED)

The v4.x model used a two-step process: create event → publish event. This was replaced with save-time enforcement in v5+.

### v4.x Algorithm (DEPRECATED)

> **⚠️ HISTORICAL:** The `enforcePublish()` function from `/api/events/:id/publish` was removed in v5+.

**v4.x Backend Implementation** (`src/lib/services/accessControl.ts` — REMOVED):

```typescript
// DEPRECATED CODE — v4.x publish flow
export async function enforcePublish(params: {
  eventId: string;
  userId: string;
  confirmCredit?: boolean;
}): Promise<{
  allowed: boolean;
  willConsumeCredit?: boolean;
  requiresCreditConfirmation?: boolean;
  creditCode?: CreditCode;
}> {
  // ... [full implementation removed for brevity]
  // See git history for complete code
}
```

**v4.x API Route** (`src/app/api/events/[id]/publish/route.ts` — **REMOVED in v5+**):

```typescript
// DEPRECATED ENDPOINT — REMOVED in v5+
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ... [full implementation removed for brevity]
}
```

### v4.x API Contract (DEPRECATED — ENDPOINT REMOVED)

> **⚠️ HISTORICAL:** `/api/events/:id/publish` was removed in v5+.

```
Step 0: Idempotency — if event.published_at IS NOT NULL → 200 OK
Step 1: Club events → enforceClubAction()
Step 2: Personal events → check freePlan, oneOffProduct limits
  → 402 PAYWALL or 409 CREDIT_CONFIRMATION_REQUIRED
```

### v4.x Critical Rules (Still Valid in v5+, Updated Context)

1. **Free events NEVER consume credits** — even if credit available ✅
2. **Credit consumed only after confirmation** — 409 → confirm → consume ✅ (now at save-time)
3. **One credit per event** — idempotent ✅
4. **Atomic transaction** — credit + event save in single DB transaction ✅

---

## Migration History: v3 → v4 → v5

### v3 → v4 Migration (Database)

**Migrations:**
```sql
20241226_create_billing_products.sql     -- SSOT table
20241226_add_billing_credits_fk.sql      -- FK integrity
```

### v4 → v5 Migration (Architecture)

**Changes:**
- `enforcePublish()` → `enforceEventPublish()` called in createEvent()/updateEvent()
- **REMOVED:** `/api/events/:id/publish` endpoint
- **REMOVED:** `published_at` field from events table
- Enforcement moved from publish-time to save-time

**Deleted Files (v3→v4):**
- `src/app/api/billing/credits/purchase/route.ts`
- `src/app/api/billing/credits/confirm/route.ts`

**Deleted Files (v4→v5):**
- `src/app/api/events/[id]/publish/route.ts`

### Frontend Updates (v5+)

**✅ COMPLETED (26 Dec 2024):**
- Integrated publish endpoint in create flow (`create-event-client.tsx`)
- Integrated publish endpoint in edit flow (`edit-event-client.tsx`)
- Added 409 CREDIT_CONFIRMATION_REQUIRED handling
- CreditConfirmationModal integration
- Confirm flow with `?confirm_credit=1`
- PaywallModal updated (v4 - purchase-intent + polling)

**Files Updated:**
- `src/app/(app)/events/create/create-event-client.tsx`
- `src/app/(app)/events/[id]/edit/edit-event-client.tsx`
- `src/components/billing/PaywallModal.tsx`
- `src/components/billing/CreditConfirmationModal.tsx`

### Testing (Migration Verification)

**Integration tests required:**
- Publish within free → no credit consumed ✅
- Publish with credit → 409 → confirm → consumed ✅
- Concurrency (2 confirms) → only one succeeds ✅
- Idempotent publish ✅

---

**END OF ARCHIVED HISTORY**

*For current normative billing rules, see `/docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`*

