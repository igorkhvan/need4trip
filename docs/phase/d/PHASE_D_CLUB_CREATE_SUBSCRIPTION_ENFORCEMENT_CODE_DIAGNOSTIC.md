# Phase D — Club Create Subscription Enforcement — Code-Level Diagnostic

**Mode:** READ-ONLY / NO FIXES  
**Executor:** Diagnostic only. No code changes, no suggestions, no fixes.

---

## 1. Overview (Authoritative Documents)

This diagnostic verifies at code level whether a user **without an active club subscription** can create a club, in relation to the following sources of truth:

| Document | Relevant rule |
|----------|----------------|
| **SSOT_BILLING_SYSTEM_ANALYSIS.md** | Club = "Платная сущность (в Free клуб создать нельзя)". Backend is the single source of truth for access and limits. |
| **SSOT_CLUBS_DOMAIN.md** | Club lifecycle is subscription-bound; club ownership implies financial responsibility. |
| **PHASE_B3-*** (Paywall & Enforcement) | All monetization gates must be enforced via backend; UI must never be the only guard. |
| **Working contract (Architect × Executor)** | No code without diagnostics; no fix without explicit Architect go. |

**Goal:** Prove at code level that a user without an active club subscription **can** currently create a club (i.e. that enforcement is absent or insufficient), which violates the SSOT rules above.

---

## 2. Club Creation Entry Points

All code paths that result in creation of a Club entity:

| # | Location | Function / handler | Invocation | Preconditions before creation |
|---|----------|--------------------|------------|-------------------------------|
| 1 | `src/app/api/clubs/route.ts` | `POST` | HTTP POST `/api/clubs` from client (e.g. `ClubForm` with `mode="create"`) | `resolveCurrentUser(req)`; if `!user` → `throw new UnauthorizedError(...)`. No other checks. |
| 2 | `src/lib/services/clubs.ts` | `createClub(input, currentUser)` | Called from API route: `createClub(body, user)` | `if (!currentUser) throw new UnauthorizedError(...)`; `clubCreateSchema.parse(input)`; `ensureUserExists(...)`. No billing/subscription check. |
| 3 | `src/lib/db/clubRepo.ts` | `createClub(payload)` | Called from service: `createClubRepo({ ...parsed, createdBy: currentUser.id })` | None (repository layer). Payload validation already done in service. |

**Exact code references:**

- **API route (POST)** — `src/app/api/clubs/route.ts` lines 55–71:

```ts
export async function POST(req: NextRequest) {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) {
      throw new UnauthorizedError("Авторизация обязательна для создания клуба");
    }
    const body = await req.json();
    const club = await createClub(body, user);
    return respondSuccess({ club }, undefined, 201);
  } catch (error) {
    return respondError(error);
  }
}
```

- **Service** — `src/lib/services/clubs.ts` lines 554–593 (excerpt):

```ts
/**
 * Создать клуб
 * Any authenticated user can create a club (becomes owner)
 */
export async function createClub(input: unknown, currentUser: CurrentUser | null): Promise<Club> {
  if (!currentUser) {
    throw new UnauthorizedError("Требуется авторизация для создания клуба");
  }
  const parsed = clubCreateSchema.parse(input);
  await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
  const dbClub = await createClubRepo({ ...parsed, createdBy: currentUser.id });
  // ... map, audit, return
}
```

- **Repository** — `src/lib/db/clubRepo.ts` lines 150–187: `createClub(payload)` performs DB insert only; no billing or subscription logic.

**Conclusion:** There is exactly one HTTP entry point (POST `/api/clubs`) and one service/repository chain. No server actions or other API routes create clubs.

---

## 3. Enforcement Analysis (Per Entry Point)

| Entry point | Billing / subscription enforcement? | Active club plan required? | Can PaywallError (402) be thrown here? | Limited to auth/userId only? |
|-------------|--------------------------------------|----------------------------|----------------------------------------|------------------------------|
| **POST /api/clubs** (route) | **NO.** Only `resolveCurrentUser`; no call to `enforceClubCreation`, `enforceClubAction`, or any billing check. | **NO.** | **NO.** No code path throws PaywallError in this handler. | **YES.** Only precondition is authenticated user. |
| **createClub** (service) | **NO.** No call to `enforceClubCreation` or any billing utility. Comment states: "Any authenticated user can create a club (becomes owner)". | **NO.** | **NO.** | **YES.** Only precondition is `currentUser` and schema validation. |
| **createClub** (clubRepo) | **NO.** Repository only; no billing. | **NO.** | **NO.** | N/A (no auth in repo). |

**Factual answers:**

- **Is there any billing or subscription enforcement?**  
  **NO.** No such check exists in the API route or in `createClub` (service or repo).

- **Is an ACTIVE CLUB PLAN required?**  
  **NO.** There is no check for user subscription or plan before creating a club.

- **Can a PaywallError / 402 be thrown here?**  
  **NO.** Neither the route nor the service calls any function that throws PaywallError on this path.

- **Is enforcement limited to auth / userId only?**  
  **YES.** The only guard is authentication (`resolveCurrentUser` / `currentUser`). Any authenticated user can create a club.

---

## 4. Billing / Access Utilities Trace

Search results for: `enforce*`, `require*`, `assert*`, `hasActive*`, `hasSubscription*`, `hasClubPlan*`, `checkBilling*`, `PaywallError`.

| Utility | Exists | Used during club creation? |
|---------|--------|----------------------------|
| **enforceClubCreation** | Yes — `src/lib/services/accessControl.ts` (lines 232–250) | **NO.** Not called from `src/app/api/clubs/route.ts` or `src/lib/services/clubs.ts` (createClub). Grep: only definition in accessControl and mention in `docs/archive/BILLING_V2_IMPLEMENTATION_COMPLETE.md`. |
| **enforceClubAction** | Yes — `src/lib/services/accessControl.ts` | **NO.** Used in clubs.ts only for `CLUB_INVITE_MEMBER` (approve join request flow, line 930). Requires `clubId`; not applicable to creation (no club yet). |
| **enforceEventPublish** | Yes — accessControl.ts | No; event publish only. |
| **PaywallError** | Yes — `src/lib/errors.ts`, used by accessControl and API response handling | Not thrown on club creation path; no code on that path throws it. |
| **require* / assert* / hasActive* / hasSubscription* / hasClubPlan* / checkBilling*** | Not found as billing/subscription guards for club creation | N/A. |

**Behavior of `enforceClubCreation` (if it were called):**

- File: `src/lib/services/accessControl.ts` lines 232–250.
- Logic: If `existingClubsCount === 0` → returns (allows). For additional clubs → only `log.warn("Club creation enforcement: MVP allows multiple clubs", ...)`; **no throw, no PaywallError**.
- So even if this function were invoked before creation, it would **not** block creation and would **not** require an active club plan or subscription.

**Conclusion:** No billing or subscription enforcement is used during club creation. `enforceClubCreation` exists but is never called; and by current implementation it would not enforce "active plan required" or throw 402.

---

## 5. Confirmed SSOT Violations

| SSOT rule | Code finding | Violation |
|-----------|--------------|-----------|
| **SSOT_BILLING_SYSTEM_ANALYSIS.md** — "Club = платная сущность (в Free клуб создать нельзя)" | No backend check that user has an active club plan or subscription before creating a club. Any authenticated user can create a club. | **Violation:** Free users can create clubs. |
| **SSOT_BILLING** — "Backend — единственный источник истины" по доступу | Club creation path has no backend enforcement; only auth. | **Violation:** Backend does not enforce "no club creation without plan/subscription". |
| **PHASE_B3** — Monetization gates enforced via backend; UI must not be the only guard | No backend paywall or enforcement on POST `/api/clubs` or `createClub`. | **Violation:** No backend gate for club creation. |
| **SSOT_CLUBS_DOMAIN** — Club lifecycle subscription-bound; ownership implies financial responsibility | Creation does not check subscription or plan; club is created and then subscription is created by DB triggers (as per comment in clubs.ts). | **Violation:** Creation is not gated by subscription/plan requirement. |

---

## 6. UI Masking (Secondary, Brief)

- **"Create Club" visibility:** The button and page use `CreateClubButton` and `CreateClubPageContent`, which depend on `isAuthenticated`. If not authenticated, auth modal or redirect is used; the form is not shown when `!isAuthenticated`.
- **Subscription / plan in UI:** There is no check in the UI for active club plan or subscription. No hiding or disabling of "Create Club" for free users based on billing. The only guard is authentication.
- **Conclusion:** Any restriction for free users would be UI-only if added; currently there is no such UI restriction. Per SSOT, the UI must not be the only guard — so even a future UI-only "hide for free" would not satisfy the requirement without backend enforcement.

---

## 7. Conclusion (Diagnostic Only, No Fix)

- **All club creation paths identified:** One HTTP entry (POST `/api/clubs`) and one service/repository chain (`createClub` → `createClubRepo`).
- **Enforcement:** There is **no** billing or subscription enforcement on any of these paths. The only precondition is authenticated user. **No** PaywallError (402) can be thrown on club creation.
- **Billing utilities:** `enforceClubCreation` exists but is **not** called from the club creation flow; and in its current form it does not require an active plan or throw 402. No other billing utilities are used for club creation.
- **SSOT:** The current implementation allows any authenticated user (including free users) to create a club, which contradicts SSOT_BILLING_SYSTEM_ANALYSIS.md and SSOT_CLUBS_DOMAIN.md and the PHASE_B3 requirement that monetization gates be enforced by the backend.

**Diagnostic complete. No fixes attempted. No code changed.**
