# Naming & Project Structure — SSOT

**Version:** 1.0  
**Date:** 25 декабря 2024  
**Status:** ✅ Enforced

---

## 🎯 Purpose

This document defines the **mandatory naming conventions** and project structure rules for Need4Trip codebase.

**Why this matters:**
- Predictable file locations
- Consistent code style
- Single vocabulary (no synonyms)
- Easier onboarding and maintenance

---

## 📁 File & Folder Naming

### 1. Files: `kebab-case`

**Rule:** All files MUST use `kebab-case.ts` or `kebab-case.tsx`

✅ **Good:**
```
src/lib/utils/date-formatter.ts
src/components/events/event-card.tsx
src/hooks/use-profile-data.ts
```

❌ **Bad:**
```
src/lib/utils/dateFormatter.ts       // camelCase
src/components/events/EventCard.tsx  // PascalCase
src/hooks/useProfileData.ts          // camelCase
```

**Exception:** React components at top level MAY use PascalCase IF they are standalone component files:

✅ **Acceptable (but discouraged):**
```
src/components/billing/PaywallModal.tsx       // Exported as PaywallModal
src/components/events/EventLocationsCard.tsx  // Exported as EventLocationsCard
```

**Target:** Gradually migrate all PascalCase component files to kebab-case.

---

### 2. Folders: `kebab-case`

**Rule:** All folders MUST use `kebab-case` (no PascalCase, no camelCase)

✅ **Good:**
```
src/components/events/
src/lib/db/
src/hooks/
```

❌ **Bad:**
```
src/Components/Events/  // PascalCase
src/lib/DB/             // PascalCase
```

---

### 3. React Components: `PascalCase` (export name)

**Rule:** Component function names and exports MUST use `PascalCase`

✅ **Good:**
```typescript
// File: src/components/events/event-card.tsx
export function EventCard() { ... }
export default EventCard;
```

❌ **Bad:**
```typescript
// File: src/components/events/event-card.tsx
export function eventCard() { ... }  // camelCase
```

---

### 4. Hooks: `useXxx` (camelCase with `use` prefix)

**Rule:** All React hooks MUST start with `use` and use camelCase

✅ **Good:**
```typescript
// File: src/hooks/use-profile-data.ts
export function useProfileData() { ... }
export function useEventsData() { ... }
```

❌ **Bad:**
```typescript
// File: src/hooks/profile-data.ts
export function profileData() { ... }       // Missing "use"
export function UseProfileData() { ... }    // PascalCase
```

---

### 5. Server Actions: `verbNounAction` (camelCase + "Action")

**Rule:** Server actions MUST use `verbNounAction` pattern (lowercase verb + Noun + "Action")

✅ **Good:**
```typescript
export async function publishEventAction(eventId: string) { ... }
export async function deleteClubAction(clubId: string) { ... }
export async function updateParticipantAction(...) { ... }
```

❌ **Bad:**
```typescript
export async function publishEvent(eventId: string) { ... }  // Missing "Action"
export async function PublishEvent(eventId: string) { ... }  // PascalCase
export async function eventPublish(eventId: string) { ... }  // Wrong order
```

**Pattern:**
- `publishEventAction` ✅
- `createClubAction` ✅
- `removeParticipantAction` ✅

---

### 6. API Routes: RESTful nouns (no verbs in path)

**Rule:** API routes MUST use RESTful conventions (nouns, not verbs)

✅ **Good:**
```
/api/events         GET (list), POST (create)
/api/events/[id]    GET (detail), PUT (update), DELETE (delete)
/api/clubs
/api/profile
/api/plans
```

❌ **Bad:**
```
/api/getEvents          // Verb in path
/api/createEvent        // Verb in path
/api/events/delete/[id] // Verb in path
```

**HTTP methods determine action:**
- `GET /api/events` → list
- `POST /api/events` → create
- `PUT /api/events/[id]` → update
- `DELETE /api/events/[id]` → delete

---

## 🗣️ Domain Language (Single Vocabulary)

### Rule: One concept = One term

**Why:** Synonyms cause confusion. Use ONE term per domain concept across ALL files.

---

### 1. Event (NOT trip)

**Rule:** Always use **"event"** (never "trip", "occurrence", "gathering")

✅ **Good:**
```typescript
Event
EventDto
event
eventId
createEvent()
getEventById()
/api/events
```

❌ **Bad:**
```typescript
Trip           // Synonym
trip           // Synonym
tripId         // Synonym
createTrip()   // Synonym
```

**Rationale:**
- Database table: `events`
- Type: `Event`
- API route: `/api/events`
- Consistency across codebase

---

### 2. Publish (single meaning)

**Rule:** **"publish"** = make event visible + enforce billing

✅ **Good:**
```typescript
publishEventAction()   // Billing + visibility gate
publishedAt            // Timestamp when published
isPublished            // Boolean check
```

❌ **Bad:**
```typescript
makeVisible()          // Ambiguous
activateEvent()        // Ambiguous
```

**Meaning:**
- `publish` = billing check + set `publishedAt` + update `visibility`
- Draft → Published transition (one-time)

---

### 3. Club, Plan, Subscription, Credit

**Rule:** Billing terminology MUST match SSOT (`docs/BILLING_SYSTEM_ANALYSIS.md`)

| Term | Meaning |
|------|---------|
| **Club** | Entity that has a subscription (can own events) |
| **Plan** | Pricing tier (`free`, `club_50`, `club_500`, `club_unlimited`) |
| **Subscription** | Club's current plan status (`active`, `grace`, `expired`, `pending`) |
| **Credit** | One-time purchase (add-on, top-up) |
| **Upgrade** | Change subscription to higher plan |

✅ **Good:**
```typescript
club.subscription       // Current subscription
plan.limits             // Plan limits
subscription.status     // active/grace/expired
credit.amount           // One-time credit
upgrade                 // Action to change plan
```

❌ **Bad:**
```typescript
club.payment            // Ambiguous
plan.subscription       // Wrong ownership
subscription.plan       // Circular (use planId instead)
```

---

### 4. Free is a limits profile (NOT a subscription)

**Rule:** `free` = limits profile for users without clubs

✅ **Good:**
```typescript
const freeLimits = { maxEventParticipants: 15, ... };
if (!user.club) applyFreeLimits();
```

❌ **Bad:**
```typescript
subscription.plan = 'free';           // Free is NOT a subscription
club.subscriptionStatus = 'free';     // Free clubs don't exist
```

**Rationale:**
- Only **clubs** have subscriptions
- Users without clubs get **free limits**
- No `club_subscriptions` row for free users

---

## 📂 Project Structure

### Current Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                   # Authenticated routes
│   │   ├── events/
│   │   │   ├── page.tsx         # List page
│   │   │   ├── create/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # Detail page
│   │   │       └── edit/page.tsx
│   │   ├── clubs/
│   │   ├── profile/
│   │   └── pricing/
│   ├── (marketing)/             # Public routes
│   │   └── page.tsx             # Landing
│   └── api/                     # API routes
│       ├── events/route.ts
│       ├── clubs/route.ts
│       └── profile/route.ts
├── components/                   # React components
│   ├── events/
│   ├── clubs/
│   ├── billing/
│   ├── auth/
│   ├── layout/
│   └── ui/                      # Shadcn components
├── lib/                         # Business logic
│   ├── db/                      # Repositories
│   ├── services/                # Business logic layer
│   ├── utils/                   # Pure utilities
│   ├── types/                   # TypeScript types
│   ├── cache/                   # Caching layer
│   └── auth/                    # Auth utilities
├── hooks/                       # React hooks
└── middleware.ts                # Next.js middleware
```

---

### Layered Architecture

**Rule:** Follow strict layering (no skipping layers)

```
UI Components (Client)
       ↓
API Routes (Server)
       ↓
Services (Business Logic)
       ↓
Repositories (Data Access)
       ↓
Database
```

**Forbidden:**
- ❌ UI → Repository (skip Services)
- ❌ API → Database (skip Services)
- ❌ Service → UI components

**See:** `docs/ARCHITECTURE.md` for ownership map

---

## 📝 Code Style Conventions

### 1. Function naming

| Type | Pattern | Example |
|------|---------|---------|
| React Component | `PascalCase` | `EventCard()` |
| Hook | `useXxx` | `useProfileData()` |
| Server Action | `verbNounAction` | `publishEventAction()` |
| Service function | `verbNoun` | `getEventById()` |
| Repository function | `verbTableName` | `createEvent()`, `listEvents()` |
| Utility function | `verbNoun` | `formatDate()`, `parseDateTime()` |

---

### 2. Constants

**Rule:** `SCREAMING_SNAKE_CASE` for true constants

✅ **Good:**
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
```

❌ **Bad:**
```typescript
const maxFileSize = 5 * 1024 * 1024;  // camelCase
const DefaultPageSize = 20;           // PascalCase
```

---

### 3. Enums and Union Types

**Rule:** PascalCase for type name, SCREAMING_SNAKE_CASE for values

✅ **Good:**
```typescript
type EventVisibility = 'PUBLIC' | 'UNLISTED' | 'RESTRICTED';
type SubscriptionStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'PENDING';
```

❌ **Bad:**
```typescript
type EventVisibility = 'public' | 'unlisted' | 'restricted';  // lowercase
```

---

## 🔄 Migration Strategy

### ✅ Completed (25 декабря 2024)

All PascalCase component files have been migrated to kebab-case:

**Billing (2 files):**
- ✅ `PaywallModal.tsx` → `paywall-modal.tsx`
- ✅ `CreditConfirmationModal.tsx` → `credit-confirmation-modal.tsx`

**Events (12 files):**
- ✅ `EventLocationsCard.tsx` → `event-locations-card.tsx`
- ✅ `LocationHeaderItem.tsx` → `location-header-item.tsx`
- ✅ `LocationPointDisplay.tsx` → `location-point-display.tsx`
- ✅ 6 form sections (EventBasicInfoSection, etc.)
- ✅ 3 locations (LocationItem, MapPreviewModal, NavigationChooser)

**Result:** 14 files renamed, 20+ imports updated, 0 TypeScript errors ✅

### Current Status

✅ **Files:** All components use kebab-case  
✅ **Domain language:** No "trip" usage found  
✅ **API routes:** RESTful (no verbs in paths)  
✅ **Server actions:** No "use server" directives (Next.js App Router only)

### Enforcement

**Phase 1:** ✅ Completed — All existing violations fixed  
**Phase 2:** Active — New files MUST use kebab-case  
**Phase 3:** Recommended — Add ESLint rule or pre-commit hook

---

## ✅ Compliance Checklist

Before creating/renaming any file, check:

- [ ] File name is `kebab-case.ts` or `kebab-case.tsx`
- [ ] Folder name is `kebab-case`
- [ ] Component export is `PascalCase`
- [ ] Hook name starts with `use` (camelCase)
- [ ] Server action ends with `Action` (camelCase)
- [ ] API route uses RESTful nouns (no verbs)
- [ ] Domain terms match this SSOT (event, publish, club, plan, etc.)

---

## 🔗 Related Documents

- `docs/ARCHITECTURE.md` — Ownership map, module structure
- `docs/BILLING_SYSTEM_ANALYSIS.md` — Billing terminology
- `docs/DATABASE.md` — Table naming conventions

---

**Last Updated:** 25 декабря 2024  
**Next Review:** When adding new major features

