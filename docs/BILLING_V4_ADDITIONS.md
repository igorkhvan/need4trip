## ⚡⚡ One-off Credits (NEW in v4)

### Концепция

**One-off credit** = разовая покупка для апгрейда личного события (без клуба).

**Характеристики:**
- **Бессрочный** - не привязан к событию при покупке
- **Расходуется ровно один раз** - при подтверждении publish
- **Только для личных событий** - club events используют club billing
- **Не заменяет клуб** - при превышении лимитов credit user must buy club

### Продукт: EVENT_UPGRADE_500

**Из billing_products:**
```json
{
  "code": "EVENT_UPGRADE_500",
  "title": "Event Upgrade (до 500 участников)",
  "price_kzt": 1000,
  "constraints": {
    "scope": "personal",
    "max_participants": 500
  }
}
```

**Лимиты:**
- Free plan: ~15 participants
- One-off credit: до 500 participants
- Больше 500: требуется club

### Credit Lifecycle

```
1. Purchase → billing_transactions(pending)
2. Payment  → billing_transactions(completed)
3. Issue    → billing_credits(status='available')
4. Publish  → billing_credits(status='consumed', consumed_event_id set)
```

### Database Schema

```sql
-- SSOT для продуктов
CREATE TABLE billing_products (
  code TEXT PRIMARY KEY,
  price_kzt NUMERIC(10,2) NOT NULL,
  constraints JSONB NOT NULL
);

-- Entitlements (credits owned by user)
CREATE TABLE billing_credits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  credit_code TEXT NOT NULL REFERENCES billing_products(code),
  status TEXT CHECK (status IN ('available', 'consumed')),
  consumed_event_id UUID,
  source_transaction_id UUID UNIQUE
);
```

**Key Points:**
- `source_transaction_id UNIQUE` = idempotency
- `credit_code FK` = referential integrity
- `status` = lifecycle state

---

## ⚡⚡ Unified Purchase Flow (NEW in v4)

### Endpoint: POST /api/billing/purchase-intent

**Purpose:** Unified API для покупки one-off credits + club subscriptions.

**Input:**
```typescript
{
  product_code: "EVENT_UPGRADE_500" | "CLUB_50" | "CLUB_500" | "CLUB_UNLIMITED",
  quantity?: number,  // default 1
  context?: {
    eventId?: string,
    clubId?: string
  }
}
```

**Output:**
```typescript
{
  transaction_id: string,
  transaction_reference: string,
  payment: {
    provider: "kaspi",
    invoice_url?: string,    // stub for now
    qr_payload?: string,     // stub for now
    instructions: string
  }
}
```

### Flow Diagram

```
User clicks "Buy" → POST /api/billing/purchase-intent
                    ↓
                    Create billing_transactions(pending)
                    ↓
                    Return payment details (Kaspi stub)
                    ↓
User pays Kaspi  → Webhook / DEV: POST /api/dev/billing/settle
                    ↓
                    Mark transaction(completed)
                    ↓
                    Issue billing_credit (if one-off)
                    OR
                    Activate club_subscription (if club)
```

### Kaspi Integration (Stub Mode)

**Current (v4):**
- Returns mock `invoice_url`, `qr_payload`
- DEV settlement via `/api/dev/billing/settle`

**Future (production):**
- Real Kaspi API integration
- Webhook endpoint for payment confirmation
- No code changes in API contracts (stub → real swap)

---

## ⚡ Publish Enforcement (v4)

### Algorithm (STRICT Decision Tree)

```typescript
POST /api/events/:id/publish?confirm_credit=0|1

Step 0: Idempotency
  if (event.published_at IS NOT NULL) → 200 OK

Step 1: Club events
  if (event.club_id IS NOT NULL) {
    enforceClubAction() // existing club billing
    → publish or 402 PAYWALL (ONLY club access option)
  }

Step 2: Personal events
  load freePlan = club_plans(id='free')
  load oneOffProduct = billing_products(code='EVENT_UPGRADE_500')
  
  if (max_participants <= freePlan.max_event_participants) {
    → Publish immediately (NO credit consumption!) ✅
  }
  
  if (max_participants > oneOffProduct.constraints.max_participants) {
    → 402 PAYWALL (reason: CLUB_REQUIRED_FOR_LARGE_EVENT)
       options: [CLUB_ACCESS only]
  }
  
  // Exceeds free, within oneoff limit
  credit = findAvailableCredit(user_id, 'EVENT_UPGRADE_500')
  
  if (!credit) {
    → 402 PAYWALL (reason: PUBLISH_REQUIRES_PAYMENT)
       options: [ONE_OFF_CREDIT, CLUB_ACCESS]
  }
  
  if (credit && !confirm_credit) {
    → 409 CREDIT_CONFIRMATION_REQUIRED
       meta: { will consume credit }
       cta: { confirm: /publish?confirm_credit=1 }
  }
  
  if (credit && confirm_credit) {
    ATOMIC:
      - Lock credit FOR UPDATE
      - Mark consumed (status, consumed_event_id, consumed_at)
      - Set event.published_at
    → 200 OK
  }
```

### Critical Rules

1. **Free events NEVER consume credits** - даже если credit available
2. **Credit consumed only after confirmation** - 409 → user confirms → consume
3. **One credit per event** - idempotent (re-publish doesn't consume again)
4. **Atomic transaction** - credit + publish in single DB transaction

---

## ⚡ API Endpoints v4

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/billing/products` | List active products (EVENT_UPGRADE_500) |
| POST | `/api/billing/purchase-intent` | Unified purchase (one-off + clubs) |
| GET | `/api/billing/transactions/status` | Poll transaction status |
| POST | `/api/dev/billing/settle` | DEV: manual settlement (stub) |
| POST | `/api/events/:id/publish` | Publish with enforcement |

### Deleted Endpoints (v3)

- ❌ `/api/billing/credits/purchase` → use purchase-intent
- ❌ `/api/billing/credits/confirm` → use dev/billing/settle

### Response Contracts

**402 PAYWALL:**
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL",
    "reason": "PUBLISH_REQUIRES_PAYMENT",
    "meta": { "requestedParticipants": 100, "freeLimit": 15 },
    "options": [
      {
        "type": "ONE_OFF_CREDIT",
        "product_code": "EVENT_UPGRADE_500",
        "price_kzt": 1000,
        "provider": "kaspi"
      },
      {
        "type": "CLUB_ACCESS",
        "recommended_plan_id": "club_50"
      }
    ]
  }
}
```

**409 CREDIT_CONFIRMATION_REQUIRED:**
```json
{
  "success": false,
  "error": {
    "code": "CREDIT_CONFIRMATION_REQUIRED",
    "reason": "EVENT_UPGRADE_WILL_BE_CONSUMED",
    "meta": {
      "eventId": "...",
      "creditCode": "EVENT_UPGRADE_500",
      "requestedParticipants": 100
    },
    "cta": {
      "type": "CONFIRM_CONSUME_CREDIT",
      "href": "/api/events/:id/publish?confirm_credit=1"
    }
  }
}
```

---

## Migration от v3 to v4

### Database

**Миграции:**
```sql
20241226_create_billing_products.sql     -- SSOT таблица
20241226_add_billing_credits_fk.sql      -- FK integrity
```

**After migration:**
```bash
npx supabase gen types typescript > src/lib/db/types.ts
```

### Backend

**Changes:**
- `enforcePublish()` - reads from billing_products (no hardcode)
- New repo: `billingProductsRepo.ts`
- Unified API: `purchase-intent/route.ts`
- Status polling: `transactions/status/route.ts`

**Deleted:**
- `src/app/api/billing/credits/purchase/route.ts`
- `src/app/api/billing/credits/confirm/route.ts`

### Frontend

**TODO (not yet done):**
- Update PaywallModal to use `/api/billing/purchase-intent`
- Add polling for transaction status
- Remove old endpoint references

### Testing

**Integration tests required:**
- Publish within free → no credit consumed ✅
- Publish with credit → 409 → confirm → consumed ✅
- Concurrency (2 confirms) → only one succeeds ✅
- Idempotent publish ✅

---

**END OF V4 UPDATES**

