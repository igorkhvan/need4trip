# Club Creation Billing Gate — Diagnostic Report (Diagnostic ONLY, NO CODE CHANGES)

**Phase:** P1  
**Document type:** Diagnostic  
**Date:** 2026-02-06  
**Mode:** Diagnostic ONLY — no fixes, no new guards/components/contracts.

---

## 1. Scenario / Inputs / Expected vs Actual

### Inputs (fixed scenario)

| Input | Value |
|-------|--------|
| User | Authenticated (JWT) |
| Personal one-off credits | 2 (e.g. EVENT_UPGRADE_500 available) |
| Club subscription | None (user is not owner of any club with active/paid subscription) |
| Action | User creates a club (submit form on `/clubs/create`) |

### Expected (per SSOT Billing)

- **Backend:** Request to create club MUST be rejected with **HTTP 402** and paywall reason **`CLUB_CREATION_REQUIRES_PLAN`**.
- **UI:** Paywall modal (or equivalent canonical paywall flow) with copy/CTA per SSOT; no club created.
- **Rule:** Free user (no club subscription) must not be able to create a club. Personal one-off credits do **not** satisfy club creation eligibility.

**Source:**  
`docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` — PaywallError reason table:

> | Reason | When Thrown |
> |--------|-------------|
> | `CLUB_CREATION_REQUIRES_PLAN` | Free user tries to create club |

### Actual (observed)

- **Backend:** POST `/api/clubs` returns **201 Created**; club is created.
- **UI:** Success flow (toast + redirect to `/clubs/[id]`); no paywall.
- **Conclusion:** Billing enforcement for “create club” is **absent**; Free user can create a club.

---

## 2. Authoritative Rules (Citations)

### 2.1 Billing — Free → club creation forbidden

- **SSOT_BILLING_SYSTEM_ANALYSIS.md**  
  - Paywall reasons: `CLUB_CREATION_REQUIRES_PLAN` = “Free user tries to create club”.  
  - One-off credits: “Только для личных событий” — club events use club billing; one-off does not replace club / plan for club creation.

### 2.2 API — auth and paywall semantics

- **SSOT_API.md**  
  - §2.3: API routes MUST use `resolveCurrentUser(req)`; no cookie/header parsing.  
  - §5.2: Paywall 402 payload shape (`code: "PAYWALL"`, `details.reason`, etc.).  
  - §6.1: `PaywallError` → 402, code `PAYWALL`.  
  - **API-015 (POST /api/clubs):** Documented as “Authorization: Any authenticated user can create club” and errors only 400/401 — **no 402**; this contradicts SSOT Billing (doc gap, see §7).

### 2.3 Architecture — enforcement placement

- **SSOT_ARCHITECTURE.md**  
  - §5: Service layer holds business rules and policy enforcement; API calls Service, returns response envelope.  
  - §5.2: Services MUST NOT return Response/status; enforcement throws (e.g. PaywallError).  
  - Forbidden: UI → Repository; API → DB; enforcement only in UI.

### 2.4 Blueprint — billing touchpoints

- **CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt).md**  
  - §2: “Frontend **never** decides RBAC, limits, or billing outcomes”; backend errors are the only trigger for paywall/forbidden.  
  - No explicit “club creation gating” subsection; rule is inherited from SSOT Billing (Free → no club creation).

---

## 3. Call Path Inventory

### 3.1 UI entry points (Create Club)

| # | Entry point | File (path + line range) | Condition enabling | Shared guard/hook? |
|---|-------------|---------------------------|--------------------|---------------------|
| 1 | Page route `/clubs/create` | `src/app/(app)/clubs/create/page.tsx` (full file) | Route exists for all; page content gated by auth only | `useProtectedAction` (auth only) |
| 2 | Create Club CTA (clubs list) | `src/app/(app)/clubs/page.tsx` (~14, ~143, ~318) | Rendered for authenticated user; no billing check | None (links to `/clubs/create`) |
| 3 | Create Club button component | `src/components/clubs/create-club-button.tsx` (~13–27) | If not authenticated → auth modal; if authenticated → navigate to `/clubs/create` | Auth only (no billing) |
| 4 | User clubs list (profile) | `src/components/profile/user-clubs-list.tsx` (~14, ~48) | Uses `CreateClubButton` | Same as above |
| 5 | Pricing card | `src/components/pricing/pricing-card-button.tsx` (~4) | Imports `CreateClubButton` | Same as above |

**Summary:** Every “Create Club” entry point is gated only by **auth**. No billing guard, no `usePaywall`, no check for “user has plan / can create club”.

### 3.2 Form submit → API

| Step | Location | What happens |
|------|----------|----------------|
| Submit | `src/components/clubs/club-form.tsx` ~75–99 | `POST /api/clubs` with JSON body; no 402 handling |
| Error handling | Same, ~97–99, ~124–126 | `if (!res.ok)` → throw generic `Error`; `showError()` toast — **no** `res.status === 402` or `showPaywall(details)` |
| Success | Same, ~101–121 | Parses `data.club`, toast, redirect to `/clubs/${id}` |

So: **402 is not detected**; if backend ever returned 402, UI would show a generic error message, not the paywall modal.

### 3.3 API route & service chain

| Layer | File | Function / handler | Billing enforcement? |
|-------|------|-------------------|------------------------|
| API | `src/app/api/clubs/route.ts` | `POST` → `createClub(body, user)` | No |
| Service | `src/lib/services/clubs.ts` | `createClub()` ~560–595 | No |
| Service | `src/lib/services/clubs.ts` | — | Only: auth check, `clubCreateSchema.parse`, `ensureUserExists`, `createClubRepo`, audit log |
| Repo | `src/lib/db/clubRepo.ts` | `createClub` (insert) | No |
| DB | — | Insert `clubs`; triggers (post v2.0) do **not** create `club_subscriptions` (trigger dropped in `20241215_drop_auto_subscription_trigger.sql`) | N/A |

**Conclusion:** There is **no** call to `enforceClubAction` or any other billing check in the “Create Club” path. The only enforcement in the clubs service is `enforceClubAction(..., CLUB_INVITE_MEMBER)` in **addMember** (~930), i.e. for an **existing** club.

### 3.4 Bypass paths

- **Single write path:** The only way to create a club from the app is POST `/api/clubs` → `createClub()`. There is no alternative “create club” endpoint (e.g. no direct Supabase from client, no other API route).
- **Bypass vector:** The backend simply **never checks** billing for “create club”; so any authenticated user can create a club. No bypass in the sense of “alternative route” — the **canonical** route is the one that omits enforcement.

---

## 4. Violation Classification

| Type | Description | Broken rule reference |
|------|-------------|------------------------|
| **Missing enforcement** | No billing check before creating a club | SSOT_BILLING_SYSTEM_ANALYSIS.md: “CLUB_CREATION_REQUIRES_PLAN \| Free user tries to create club”; enforcement must be backend-only |
| **Wrong/missing API contract** | API-015 documents “Any authenticated user can create club” and only 400/401 errors | SSOT_API.md API-015 vs SSOT_BILLING (402 required for Free) |
| **UI not handling 402** | Club form does not treat 402 as paywall; no `usePaywall` / `showPaywall(details)` | SSOT_BILLING § Paywall UI: frontend must react to 402; SSOT_API §5.3 PaywallModal trigger |
| **Enforcement only in UI** | Not applicable — there is no enforcement in UI either | — |

**Single root cause:** Enforcement is **missing** in the backend (service/API) for the “create club” action. The intended behaviour (402 + `CLUB_CREATION_REQUIRES_PLAN`) is documented but never invoked.

---

## 5. Canonical Reuse Map (No New Mechanisms)

### 5.1 Paywall reason code

- **Canonical code:** `CLUB_CREATION_REQUIRES_PLAN`  
- **Defined:**  
  - `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` (reason table).  
  - `src/lib/types/billing.ts` — `PAYWALL_REASONS`.  
  - `src/lib/billing/ui/reasonMapping.ts` — `CLUB_CREATION_REQUIRES_PLAN` (title, message, primaryCta, uiPattern, allowOneOffCredit: false, allowClubAccess: true).  
- **Use:** Backend must throw `PaywallError({ reason: "CLUB_CREATION_REQUIRES_PLAN", ... })` when a Free user attempts to create a club.

### 5.2 Billing eligibility / enforcement

- **Existing pattern:** `enforceClubAction({ clubId, action, context })` in `src/lib/services/accessControl.ts` — used for actions **on an existing club** (e.g. CLUB_INVITE_MEMBER, CLUB_EXPORT_PARTICIPANTS_CSV).  
- **Limitation:** It requires `clubId`; for “create club” there is no club yet. There is **no** existing “user can create club” or “requires plan for club creation” function in the codebase.  
- **Canonical reuse:** Reuse **PaywallError** and reason `CLUB_CREATION_REQUIRES_PLAN`; the **decision logic** (“user has no club subscription / is Free for club creation”) and its placement (e.g. in `accessControl` or in `clubs` service before `createClubRepo`) are to be defined at fix time, without introducing new **contracts** (reason code and 402 contract already exist).

**Explicit:** Personal one-off credits must **not** satisfy club creation eligibility; only a paid club plan (user is owner of a club with active/grace subscription, or an equivalent normative rule per SSOT) should allow creation if that is the chosen rule.

### 5.3 UI handling (402 / paywall)

- **Canonical component:** `PaywallModal` + `usePaywall()` from `src/components/billing/paywall-modal.tsx`.  
- **Canonical pattern:** On 402, parse `error.details` (or `error`), call `showPaywall(details)` and render `PaywallModalComponent`.  
- **Reference implementation:** `src/components/clubs/club-members-list.tsx` (~41, ~49–55): on `res.status === 402`, reads `errorData.details || errorData`, then `showPaywall(...)`.  
- **Club form today:** Does **not** use `usePaywall`; does **not** check `res.status === 402`; does **not** call `showPaywall`. So the **same** pattern as in club-members-list should be reused on the create-club flow (form or page content).

### 5.4 Copy and states

- **Copy:** Use existing mapping for `CLUB_CREATION_REQUIRES_PLAN` in `reasonMapping.ts` (title/message/CTA). No ad-hoc text; SSOT_UI_COPY.md principles apply.  
- **States:** Paywall = canonical “blocked” state (SSOT_UI_STATES); no custom states.  
- **Loading:** Per SSOT_UI_ASYNC_PATTERNS / SSOT_UI_STRUCTURE: no blank screen; use existing loading/redirect patterns.

### 5.5 Auth context

- **Resolver:** `resolveCurrentUser(req)` in API route — already used in `src/app/api/clubs/route.ts` (POST).  
- **Context type:** User context (authenticated user), not Admin/System. No cookie parsing; matches SSOT_API §2.3 and SSOT_ARCHITECTURE.

---

## 6. Open Questions / Ambiguities

1. **Eligibility rule for “can create club”**  
   SSOT Billing states “Free user tries to create club” → 402, and one-off credits do not count. It does **not** spell out the exact rule (e.g. “user must be owner of at least one club with non-expired subscription” vs “user must have purchased a club plan in current session” vs other). This is a **product/SSOT clarification**; the diagnostic does not fix it, only notes that whatever the rule is, it must be enforced server-side and must not treat one-off credits as sufficient.

2. **API-015 doc gap**  
   SSOT_API.md API-015 does not list 402 or `CLUB_CREATION_REQUIRES_PLAN`. Until the fix is implemented, the doc should be updated to include 402 in the Errors table and to align authorization with SSOT Billing (not “any authenticated user” without a billing gate).

3. **Working Contract / pipeline**  
   No file named “working_contract_architect_exec” or “Working Contract” was found under `docs/`. If such a contract exists elsewhere, it should be aligned with “no club creation for Free” and 402 semantics.

---

## 6.1 Club Creation Eligibility — SSOT Review

### Summary

Authoritative documents were scanned for any **explicit rule** that defines what makes a user **non-Free** (or eligible) for the purpose of **club creation**. The only rule found is the **negative** one: a Free user cannot create a club; no document defines the **positive** criteria (who *may* create a club, or under what condition creation is allowed). **Classification: Rule Missing.** Architect decision is required before implementation.

---

### Evidence found (or explicit absence)

#### 1. SSOT_BILLING_SYSTEM_ANALYSIS.md

**Candidate 1 — Key concepts table (§ Ключевые концепции):**

> | **Club** | Платная сущность (в Free клуб создать нельзя) |

- **Document + section:** SSOT_BILLING_SYSTEM_ANALYSIS.md, § Ключевые концепции (table).
- **Nature:** **NORMATIVE.** Defines Club as a paid entity and states that in Free a club cannot be created.
- **Conclusion:** This is the **prohibition** (negative rule). It does **not** define who *is* allowed to create a club (no "only if", "requires", or positive eligibility).

**Candidate 2 — Paywall reasons table:**

> | `CLUB_CREATION_REQUIRES_PLAN` | Free user tries to create club |

- **Document + section:** SSOT_BILLING_SYSTEM_ANALYSIS.md, § PaywallError reason codes (table).
- **Nature:** **NORMATIVE.** Defines when to throw 402 (Free user tries to create club).
- **Conclusion:** Again a **negative** rule (when to deny). It does **not** define the positive condition for allowance.

No other sentence in this document was found that states "user may create a club only if …", "club creation requires …", "only users with X may create clubs", "first club creation is allowed without subscription", or any user-level "plan"/entitlement for creation.

#### 2. CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt).md

- **Relevant content:** §2 Global Invariants — "Frontend **never** decides RBAC, limits, or billing outcomes"; "Backend errors are the **only trigger** for forbidden / paywall UI."
- **Nature:** NORMATIVE for *where* enforcement lives (backend), not *what* the eligibility rule is.
- **Conclusion:** No definition of who is allowed to create a club. Blueprint defers to SSOTs and does not add a club-creation eligibility rule.

#### 3. SSOT_CLUBS_DOMAIN.md

- **Search:** Creation, owner, membership, lifecycle. Document defines: one owner per club, owner authority, membership roles, entry methods (invite, join request), transitions. No section or table defines "who may create a club" or "club creation eligibility".
- **Conclusion:** **Not defined.** Domain describes the club *after* it exists; it does not define the precondition for creation.

#### 4. SSOT_API.md

- **API-015:** "**Authorization:** Any authenticated user can create club"; Errors table lists 400, 401 only (no 402).
- **Nature:** Current API documentation (contradicts SSOT Billing).
- **Conclusion:** This is an **informative** API contract, not a normative eligibility rule from billing/domain. It does not define "non-Free" criteria; it currently states the wrong behaviour (any authenticated user), which the diagnostic already flags as a doc gap.

#### 5. SSOT_ARCHITECTURE.md

- **Relevant:** §5 Service layer holds "authorization checks and policy enforcement"; billing enforcement entrypoints in ownership map.
- **Conclusion:** Defines *where* enforcement lives, not *what* the club-creation eligibility rule is. **Not defined** in this document.

---

### Classification: Rule Exists / Rule Missing

**Rule MISSING (outcome B).**

No authoritative document defines **eligibility for club creation** beyond the negative rule "Free user cannot create club."

- The **prohibition** is explicit and normative (SSOT_BILLING: "в Free клуб создать нельзя" / "Free user tries to create club" → 402).
- The **positive criteria** (what makes a user non-Free for the purpose of club creation, or under what condition creation is allowed) are **not** defined in any of the scanned authorities.
- Therefore: **only the prohibition exists; the positive criteria do not.**

---

### If missing: Minimal policy options (2–3)

The following are minimal policy options the Architect could choose from. No recommendation is made; no UX or implementation detail is implied.

1. **Option 1:** User may create a club only if they already own at least one club with an active (or grace) subscription.
2. **Option 2:** User may create exactly one club without a paid plan (first club free); any additional club requires the user to be owner of a club with an active (or grace) subscription.
3. **Option 3:** User must have completed a club plan purchase (user-context entitlement or pre-creation intent) before creating any club; creation is allowed only when that entitlement exists.

(All options use only existing billing vocabulary: plan, subscription, owner, active/grace; no new concepts.)

---

### Explicit statement

**Architect decision required before implementation.**

The backend cannot enforce "who may create a club" in a way that is traceable to SSOT until the positive eligibility rule is defined and recorded in an authoritative document. Implementation of the 402 gate for club creation should proceed only after that decision.

---

## 7. Appendix: Evidence

### 7.1 Backend (current behaviour)

- **Request:** `POST /api/clubs` with valid body and auth cookie.  
- **Response (actual):** `201` with `{ success: true, data: { club: { id, name, ... } } }`.  
- **Evidence:** No call to `enforceClubAction` or any billing check in `createClub()`; `src/app/api/clubs/route.ts` only calls `createClub(body, user)` and `respondSuccess`.

### 7.2 UI (current behaviour)

- **Flow:** User opens `/clubs/create` (auth only), fills form, submits → POST → 201 → toast “Клуб создан” (or equivalent) and redirect to `/clubs/[id]`.  
- **If backend returned 402:** Current code would treat it as generic error and show `showError(..., "Не удалось создать клуб")` (or similar) — not the paywall modal.

### 7.3 Reason code and payload (canonical)

- **Reason:** `CLUB_CREATION_REQUIRES_PLAN`.  
- **402 payload shape (SSOT_API §5.2):**  
  `success: false`, `error.code: "PAYWALL"`, `error.details.reason: "CLUB_CREATION_REQUIRES_PLAN"`, plus optional `currentPlanId`, `requiredPlanId`, `meta`, `options`, `cta`.

---

## 8. What the Architect Needs from Cursor to Give GO for Fixes

### 8.1 Single authoritative enforcement point

- **Per SSOT/Blueprint:** Enforcement must be in the **backend** (Service layer), before the club is created; API only forwards errors.  
- **Current state:** There is **no** enforcement for “create club” anywhere.  
- **Intended location:** Either (a) a dedicated check in `createClub()` in `src/lib/services/clubs.ts` before `createClubRepo()`, or (b) a shared helper (e.g. in `accessControl`) that expresses “user may create club” and is called from `createClub()`. No second enforcement point in UI — UI only reacts to 402.

### 8.2 Exact bypass vector

- Club creation is possible **because** there is **no backend check** for “user may create club”.  
- There is no “wrong branch” or “alternative endpoint”: the single POST `/api/clubs` path is the one that omits the check.  
- No multiple create paths found.

### 8.3 Reason code correctness

- **Correct paywall reason:** `CLUB_CREATION_REQUIRES_PLAN` (SSOT_BILLING_SYSTEM_ANALYSIS.md).  
- **Where it is defined:** `PAYWALL_REASONS` in `src/lib/types/billing.ts`; UI mapping in `src/lib/billing/ui/reasonMapping.ts`.  
- **Where it should be produced:** When the backend decides “this user is Free for club creation” (no plan / no subscription per normative rule), it must throw `PaywallError({ reason: "CLUB_CREATION_REQUIRES_PLAN", ... })`; `respondError()` in `src/lib/api/response.ts` already maps PaywallError → 402 with correct envelope.

### 8.4 Canonical mechanism reuse (exact names)

| Need | Existing function / component |
|------|------------------------------|
| Billing decision / enforcement | Today: `enforceClubAction(clubId, action, context)` — not applicable to create (no clubId). Reuse: **PaywallError** and **reason** `CLUB_CREATION_REQUIRES_PLAN`; the “user can create club” check is to be implemented using existing types and error, without new contracts. |
| 402 handling / paywall UI | `usePaywall()`, `showPaywall(details)`, `PaywallModal` — `src/components/billing/paywall-modal.tsx`. Reference: `src/components/clubs/club-members-list.tsx` (402 branch). |
| Error parsing / mapping | `respondError(error)` in `src/lib/api/response.ts` (already maps `isPaywallError(error)` → 402 + `error.toJSON()` in `details`). Frontend: parse `res.json()`, then `error.details` for paywall. |
| Copy / state | `reasonMapping.ts` for `CLUB_CREATION_REQUIRES_PLAN`; SSOT_UI_COPY.md, SSOT_UI_STATES.md for principles (no ad-hoc copy/states). |

### 8.5 SSOT/API alignment check

- **API-015 (POST /api/clubs):** Currently documented as “Any authenticated user can create club” and errors 400, 401 only. This is a **doc gap**: 402 and `CLUB_CREATION_REQUIRES_PLAN` must be added when the fix is implemented. Do not “fix” the doc in the diagnostic phase; flag as above.

### 8.6 Risk surface

- **Other CTAs/pages:** Any UI that leads to “Create Club” (clubs list, profile clubs list, pricing CTA, direct `/clubs/create`) currently has no server-side gate; once backend returns 402, **all** these entry points will still need the same client-side handling (402 → showPaywall) if the submit goes through a shared form or API call.  
- **Same pattern:** Any future “user-level” billing gate (no clubId yet) must also be enforced in the backend and use the same 402 + PaywallModal pattern to avoid a similar gap.

---

**End of diagnostic report. No code or doc changes made.**
