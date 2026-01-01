# SSOT Billing Implementation Examples (Archived)

> **NON-NORMATIVE / Implementation Examples (Archived)**
>
> This document contains implementation code examples that were previously embedded in SSOT_BILLING_SYSTEM_ANALYSIS.md.
> These are **NOT normative rules**. They are reference implementations for developers.
>
> **For authoritative billing rules, see:** `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`
>
> **Archived:** 2026-01-01 (SSOT cleanup — removed framework-specific code from SSOT per §27 SSOT-Linter)

---

## 1. Repository Layer Examples

### 1.1 Plan Repository (planRepo.ts)

```typescript
// src/lib/db/planRepo.ts
export async function listPublicPlans(): Promise<ClubPlan[]> {
  const allPlans = await plansCache.getAll();
  return allPlans.filter(plan => plan.isPublic);
}

export async function getPlanById(planId: PlanId): Promise<ClubPlan> {
  const plan = await plansCache.getByKey(planId);
  if (!plan) throw new NotFoundError(`Plan '${planId}' not found`);
  return plan;
}
```

### 1.2 StaticCache Implementation

```typescript
// src/lib/cache/staticCache.ts
const plansCache = new StaticCache<ClubPlan>(
  {
    ttl: 5 * 60 * 1000, // 5 minutes
    name: 'club_plans',
  },
  async () => {
    const { data } = await supabase
      .from('club_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    
    return data.map(mapDbPlanToDomain);
  },
  (plan) => plan.id // Key extractor
);

export async function invalidatePlansCache(): Promise<void> {
  plansCache.clear();
  log.info("Club plans cache invalidated");
}
```

---

## 2. Service Layer Examples

### 2.1 enforceClubAction() Signature

```typescript
// src/lib/services/accessControl.ts
export async function enforceClubAction(params: {
  clubId: string;
  action: BillingActionCode;
  context?: {
    eventParticipantsCount?: number;
    clubMembersCount?: number;
    isPaidEvent?: boolean;
  };
}): Promise<void>
```

### 2.2 Enforcement Algorithm (Pseudo-code)

```
1. Load club_subscriptions by club_id
2. If NULL → FREE plan
   - Load FREE plan from DB (cached)
   - Check FREE limits
   - Throw PaywallError if violated
3. If subscription exists:
   a. Load plan from DB (cached)
   b. Check status:
      - active → check plan limits only
      - grace/pending/expired → check billing_policy_actions + limits
   c. If action not allowed → throw PaywallError
   d. Check plan limits (max_members, max_event_participants, etc.)
   e. If limits exceeded → throw PaywallError
```

### 2.3 Participant Limit Check

```typescript
// src/lib/services/accessControl.ts (enforcePlanLimits)
if (plan.maxEventParticipants !== null && 
    context.eventParticipantsCount > plan.maxEventParticipants) {
  
  const requiredPlan = await getRequiredPlanForParticipants(
    context.eventParticipantsCount
  );
  
  throw new PaywallError({
    message: `Event with ${context.eventParticipantsCount} participants exceeds limit`,
    reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
    currentPlanId: plan.id,
    requiredPlanId: requiredPlan,
    meta: {
      requested: context.eventParticipantsCount,
      limit: plan.maxEventParticipants,
    },
  });
}
```

### 2.4 CSV Export Check

```typescript
if (action === "CLUB_EXPORT_PARTICIPANTS_CSV") {
  if (!plan.allowCsvExport) {
    throw new PaywallError({
      message: "CSV export not allowed on your plan",
      reason: "CSV_EXPORT_NOT_ALLOWED",
      currentPlanId: plan.id,
      requiredPlanId: "club_50",
    });
  }
}
```

### 2.5 Subscription Status Check

```typescript
// If status != 'active'
const isAllowed = await isActionAllowed(subscription.status, action);

if (!isAllowed) {
  throw new PaywallError({
    message: `Action "${action}" not allowed for status "${subscription.status}"`,
    reason: "SUBSCRIPTION_NOT_ACTIVE",
    currentPlanId: subscription.planId,
    meta: { status: subscription.status },
  });
}
```

### 2.6 createEvent() with Billing

```typescript
// src/lib/services/events.ts
export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  const validated = EventCreateSchema.parse(input);
  
  if (validated.clubId) {
    // Club events
    await enforceClubAction({
      clubId: validated.clubId,
      action: validated.isPaid ? "CLUB_CREATE_PAID_EVENT" : "CLUB_CREATE_EVENT",
      context: {
        eventParticipantsCount: validated.maxParticipants ?? undefined,
        isPaidEvent: validated.isPaid,
      },
    });
  } else {
    // Personal events (FREE plan)
    const freePlan = await getPlanById("free");
    
    if (validated.isPaid && !freePlan.allowPaidEvents) {
      throw new PaywallError({
        message: "Платные события доступны только на платных тарифах",
        reason: "PAID_EVENTS_NOT_ALLOWED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
      });
    }
    
    if (validated.maxParticipants && freePlan.maxEventParticipants !== null && 
        validated.maxParticipants > freePlan.maxEventParticipants) {
      throw new PaywallError({
        message: `Превышен лимит участников (${validated.maxParticipants} > ${freePlan.maxEventParticipants})`,
        reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
        currentPlanId: "free",
        requiredPlanId: "club_50",
        meta: {
          requested: validated.maxParticipants,
          limit: freePlan.maxEventParticipants,
        },
      });
    }
  }
  
  const event = await createEventRecord({...validated, createdByUserId: currentUser.id});
  return event;
}
```

---

## 3. API Route Examples

### 3.1 GET /api/plans

```typescript
// src/app/api/plans/route.ts
export async function GET() {
  const plans = await listPublicPlans();
  return NextResponse.json({
    success: true,
    data: { plans },
  });
}
```

### 3.2 GET /api/clubs/[id]/export (CSV)

```typescript
// src/app/api/clubs/[id]/export/route.ts
export async function GET(req: NextRequest, { params }: Params) {
  const { id: clubId } = await params;
  const user = await getCurrentUserFromMiddleware(req);
  
  // Authorization check
  const userRole = await getUserClubRole(user.id, clubId);
  if (userRole !== "owner" && userRole !== "admin") {
    throw new ForbiddenError("Нет доступа");
  }
  
  // Billing check
  await enforceClubAction({
    clubId,
    action: "CLUB_EXPORT_PARTICIPANTS_CSV",
  });
  
  // Export
  const members = await listMembers(clubId);
  const csv = generateCSV(members);
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="members.csv"`,
    },
  });
}
```

### 3.3 GET /api/clubs/[id]/current-plan

```typescript
// src/app/api/clubs/[id]/current-plan/route.ts
export async function GET(req: NextRequest, { params }: Params) {
  const { id: clubId } = await params;
  const user = await getCurrentUserFromMiddleware(req);
  
  const { planId, plan, subscription } = await getClubCurrentPlan(clubId);
  
  return respondSuccess({
    planId: plan.id,
    planTitle: plan.title,
    subscription: subscription ? {
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      graceUntil: subscription.graceUntil,
    } : null,
    limits: {
      maxMembers: plan.maxMembers,
      maxEventParticipants: plan.maxEventParticipants,
      allowPaidEvents: plan.allowPaidEvents,
      allowCsvExport: plan.allowCsvExport,
    },
  });
}
```

### 3.4 POST /api/events (v5+)

```typescript
// src/app/api/events/route.ts
export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromMiddleware(request);
  const url = new URL(request.url);
  const confirmCredit = url.searchParams.get("confirm_credit") === "1";
  
  const payload = await request.json();
  const event = await createEvent(payload, currentUser, confirmCredit);
  
  return respondJSON({ event }, undefined, 201);
}
// createEvent() calls enforceEventPublish() which throws 402/409
```

### 3.5 PUT /api/events/[id] (v5+)

```typescript
// src/app/api/events/[id]/route.ts
export async function PUT(request: Request, { params }: Params) {
  const currentUser = await getCurrentUserFromMiddleware(request);
  const url = new URL(request.url);
  const confirmCredit = url.searchParams.get("confirm_credit") === "1";
  
  const payload = await request.json();
  const { id } = await params;
  const updated = await updateEvent(id, payload, currentUser, confirmCredit);
  
  return respondJSON({ event: updated });
}
// updateEvent() calls enforceEventPublish() which throws 402/409
```

---

## 4. Error Handling Examples

### 4.1 respondError() Implementation

```typescript
// src/lib/api/response.ts
export function respondError(error: AppError | Error | unknown) {
  if (isPaywallError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,              // "PAYWALL"
          message: error.message,
          details: error.toJSON(),
        },
      },
      { status: 402 }
    );
  }
  
  if (isAppError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }
  
  return NextResponse.json({ error: "Internal Error" }, { status: 500 });
}
```

### 4.2 Frontend 402 Handling

```typescript
// In component
const { showPaywall, PaywallModalComponent } = usePaywall();

const handleSubmit = async (data) => {
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 402) {
        const json = await response.json();
        showPaywall(json.error.details);
        return;
      }
      throw new Error('Server error');
    }
    
    const result = await response.json();
    // Success handling
  } catch (err) {
    // Error handling
  }
};

return (
  <>
    <form onSubmit={handleSubmit}>...</form>
    {PaywallModalComponent}
  </>
);
```

---

## 5. Credit Consumption Examples

### 5.1 Compensating Transaction Pattern (v5.1)

```typescript
// src/lib/services/creditTransaction.ts
export async function executeWithCreditTransaction<T extends { id: string }>(
  userId: string,
  creditCode: "EVENT_UPGRADE_500",
  eventId: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  let createdEventId: string | undefined;
  
  try {
    // Step 1: Execute operation FIRST (create event, get eventId)
    const result = await operation();
    createdEventId = result.id;
    
    // Step 2: Consume credit with ACTUAL eventId
    const actualEventId = eventId ?? createdEventId;
    await consumeCredit(userId, creditCode, actualEventId);
    
    return result;
    
  } catch (error) {
    // Step 3: Rollback on failure
    if (createdEventId && !eventId) {
      await deleteEventForRollback(createdEventId);
    }
    
    throw error;
  }
}
```

### 5.2 Integration in createEvent/updateEvent

```typescript
if (shouldUseCredit) {
  event = await executeWithCreditTransaction(
    userId,
    "EVENT_UPGRADE_500",
    eventId, // undefined for new, actual ID for update
    async () => {
      const db = await createEventRecord(validated);
      await saveLocations(db.id, validated.locations);
      await replaceAllowedBrands(db.id, validated.allowedBrandIds);
      return mapDbEventToDomain(db);
    }
  );
} else {
  event = await createEventRecord(validated);
}
```

---

## 6. Frontend UI Examples

### 6.1 useClubPlan Hook Usage

```typescript
// src/components/events/event-form.tsx
export function EventForm({ club, ...props }) {
  const { plan, limits, loading } = useClubPlan(club?.id);
  const { showPaywall, PaywallModalComponent } = usePaywall();
  
  const maxAllowedParticipants = limits?.maxEventParticipants ?? 15;
  
  const handleSubmit = async (data) => {
    try {
      await createEvent(data);
    } catch (err) {
      if (err.response?.status === 402) {
        showPaywall(err.response.data.error.details);
        return;
      }
      throw err;
    }
  };
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        <Input
          label="Макс. участников"
          max={maxAllowedParticipants}
          hint={`Ваш план поддерживает до ${maxAllowedParticipants} участников`}
        />
        <Button type="submit">Создать</Button>
      </form>
      
      {PaywallModalComponent}
    </>
  );
}
```

### 6.2 Create Event Client (v5+)

```typescript
// src/app/(app)/events/create/create-event-client.tsx
const handleSubmit = async (payload, retryWithCredit = false) => {
  const url = retryWithCredit ? "/api/events?confirm_credit=1" : "/api/events";
  const res = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
  
  if (res.status === 409) {
    setPendingPayload(payload);
    showConfirmation({ ... });
    return;
  }
  
  if (res.status === 402) {
    showPaywall({ ... });
    return;
  }
  
  router.push('/events');
};

// On credit confirmation
onConfirm={() => handleSubmit(pendingPayload, true)}
```

---

## 7. Cron Job Examples (TODO)

### 7.1 Subscription Status Update

```typescript
// Pseudo-code for /api/cron/billing-status-update
async function updateExpiredSubscriptions() {
  const policy = await getDefaultBillingPolicy();
  
  // active → grace
  const activeExpired = await findSubscriptions({
    status: 'active',
    where: 'current_period_end < now()',
  });
  
  for (const sub of activeExpired) {
    const graceUntil = addDays(sub.currentPeriodEnd, policy.gracePeriodDays);
    await setClubSubscriptionStatus(sub.clubId, 'grace', graceUntil);
  }
  
  // grace → expired
  const graceExpired = await findSubscriptions({
    status: 'grace',
    where: 'grace_until < now()',
  });
  
  for (const sub of graceExpired) {
    await setClubSubscriptionStatus(sub.clubId, 'expired', null);
  }
}
```

### 7.2 Pending Transaction Cleanup

```typescript
async function cleanupPendingTransactions() {
  const policy = await getDefaultBillingPolicy();
  const ttlMinutes = policy.pendingTtlMinutes;
  
  const expired = await supabaseAdmin
    .from('billing_transactions')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString());
  
  for (const tx of expired.data) {
    await markTransactionFailed(tx.id);
  }
}
```

---

## 8. Test Examples

### 8.1 accessControl Tests (Jest)

```typescript
describe('enforceClubAction', () => {
  it('should throw PaywallError when FREE user creates event with 20 participants', async () => {
    mockGetClubSubscription.mockResolvedValue(null);
    mockGetPlanById.mockResolvedValue({
      id: 'free',
      maxEventParticipants: 15,
    });
    
    await expect(
      enforceClubAction({
        clubId: 'test-club',
        action: 'CLUB_CREATE_EVENT',
        context: { eventParticipantsCount: 20 },
      })
    ).rejects.toThrow(PaywallError);
  });
});
```

---

## 9. Database Schema Examples

### 9.1 club_drafts (Future Feature)

```sql
CREATE TABLE public.club_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES club_plans(id),
  
  -- Draft club data
  name TEXT NOT NULL,
  description TEXT,
  city_ids UUID[],
  
  -- Payment intent
  transaction_id UUID REFERENCES billing_transactions(id),
  
  expires_at TIMESTAMPTZ NOT NULL, -- created_at + pending_ttl_minutes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_club_drafts_user_id ON club_drafts(user_id);
CREATE INDEX idx_club_drafts_expires_at ON club_drafts(expires_at);
```

---

**END OF ARCHIVED IMPLEMENTATION EXAMPLES**

*These examples are provided for reference only. For authoritative billing system rules, see `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`*

