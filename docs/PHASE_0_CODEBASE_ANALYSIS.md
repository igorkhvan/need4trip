# PHASE 0 — CODEBASE ANALYSIS
## Need4Trip Bible v3.0 Implementation Plan

**Date:** 12 декабря 2025  
**Purpose:** Complete analysis of existing codebase to plan Club System, Subscriptions, and Extended Event Logic integration

---

## 📊 EXECUTIVE SUMMARY

**Current State:** Need4Trip is a production Next.js 14 app with:
- ✅ Full event CRUD (create, edit, delete, list, view)
- ✅ Participant registration with custom fields
- ✅ Telegram OAuth + guest sessions
- ✅ Basic event visibility (`public`, `link_registered`)
- ✅ Car brands catalog and filtering
- ✅ Custom fields with smart validation

**Required State:** Extend to support:
- 🆕 Club system (create, manage, memberships)
- 🆕 Club roles (`owner`, `organizer`, `member`, `pending`)
- 🆕 Club subscriptions (`club_free`, `club_basic`, `club_pro`)
- 🆕 Personal subscriptions (`free`, `pro`)
- 🆕 Extended event visibility (`public`, `unlisted`, `restricted`)
- 🆕 Permission engine (who can create/edit events)
- 🆕 User profile pages
- 🆕 Club management pages

**Assessment:** ✅ **FEASIBLE** - Existing architecture supports extension without breaking changes.

---

## 🗄️ DATABASE SCHEMA ANALYSIS

### Existing Tables

#### ✅ `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  telegram_handle TEXT,
  telegram_id TEXT UNIQUE,
  avatar_url TEXT,
  car_model TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'pro')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

**Required Changes:**
- ✅ ADD COLUMN `plan` TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'))

**Impact:** LOW - simple ALTER TABLE, no data migration needed

---

#### ✅ `events`
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('weekend_trip', 'technical_ride', ...)),
  date_time TIMESTAMPTZ NOT NULL,
  location_text TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  max_participants INTEGER,
  custom_fields_schema JSONB NOT NULL DEFAULT '[]',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public',       -- ✅ Already exists!
  vehicle_type_requirement TEXT NOT NULL DEFAULT 'any',
  rules TEXT,
  is_club_event BOOLEAN NOT NULL DEFAULT false,    -- ✅ Already exists!
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2),
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

**Required Changes:**
- ✅ ADD COLUMN `club_id` UUID REFERENCES clubs(id) ON DELETE SET NULL
- ⚠️ MODIFY `visibility` constraint to include `'unlisted'` and `'restricted'`
  - Current: CHECK (visibility IN ('public', 'link_registered'))
  - New: CHECK (visibility IN ('public', 'unlisted', 'restricted'))

**Impact:** MEDIUM
- Need migration to ALTER constraint
- Need to map existing `'link_registered'` → `'restricted'` (semantic match)
- Existing `is_club_event` flag will work alongside `club_id` (redundant but safe)

---

#### ✅ `event_participants`
```sql
CREATE TABLE event_participants (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_session_id TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('leader', 'tail', 'participant')),
  custom_field_values JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL
);
```

**Required Changes:** ❌ NONE - perfect as is

---

#### ✅ `car_brands`
```sql
CREATE TABLE car_brands (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL
);
```

**Required Changes:** ❌ NONE

---

#### ✅ `event_allowed_brands`
```sql
CREATE TABLE event_allowed_brands (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
  PRIMARY KEY (event_id, brand_id)
);
```

**Required Changes:** ❌ NONE

---

#### ✅ `event_user_access`
```sql
CREATE TABLE event_user_access (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(event_id, user_id)
);
```

**Required Changes:** ❌ NONE - already handles restricted events

---

### Missing Tables (to be created)

#### 🆕 `clubs`
```sql
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  city TEXT,
  logo_url TEXT,
  telegram_url TEXT,
  website_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Impact:** NEW - no conflicts

---

#### 🆕 `club_members`
```sql
CREATE TABLE club_members (
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','organizer','member','pending')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);
```

**Impact:** NEW - no conflicts

---

#### 🆕 `club_subscriptions`
```sql
CREATE TABLE club_subscriptions (
  club_id UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('club_free','club_basic','club_pro')),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Impact:** NEW - no conflicts

---

## 📁 TYPE SYSTEM ANALYSIS

### Existing Types

#### ✅ `src/lib/types/user.ts`
```typescript
export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  telegramHandle: string | null;
  telegramId?: string | null;
  avatarUrl?: string | null;
  carModel: string | null;
  experienceLevel: ExperienceLevel | null;
  createdAt: string;
  updatedAt: string;
}
```

**Required Changes:**
- ✅ ADD `plan?: 'free' | 'pro'`

---

#### ✅ `src/lib/types/event.ts`
```typescript
export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory | null;
  dateTime: string;
  locationText: string;
  locationLat: number | null;
  locationLng: number | null;
  maxParticipants: number | null;
  customFieldsSchema: EventCustomFieldSchemaItem[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  visibility: Visibility;                     // ✅ Exists
  vehicleTypeRequirement: VehicleTypeRequirement;
  allowedBrands: CarBrand[];
  rules?: string | null;
  isClubEvent: boolean;                       // ✅ Exists
  isPaid: boolean;
  price?: number | null;
  currency?: string | null;
  participantsCount?: number;
  ownerName?: string | null;
  ownerHandle?: string | null;
}

export type Visibility = "public" | "link_registered";  // ⚠️ Needs update
```

**Required Changes:**
- ⚠️ UPDATE `Visibility` to `"public" | "unlisted" | "restricted"`
- ✅ ADD `clubId?: string | null`
- ✅ ADD `club?: Club` (for hydrated queries)

---

#### ❌ Missing: `src/lib/types/club.ts`
**Required:** Create new file with:
```typescript
export type ClubRole = 'owner' | 'organizer' | 'member' | 'pending';
export type ClubPlan = 'club_free' | 'club_basic' | 'club_pro';

export interface Club {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  logoUrl: string | null;
  telegramUrl: string | null;
  websiteUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClubMember {
  clubId: string;
  userId: string;
  role: ClubRole;
  invitedBy: string | null;
  joinedAt: string;
  user?: User;  // Hydrated
}

export interface ClubSubscription {
  clubId: string;
  plan: ClubPlan;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
}

export interface ClubWithDetails extends Club {
  subscription: ClubSubscription;
  members: ClubMember[];
  memberCount: number;
  eventCount: number;
}
```

---

## 🏗️ SERVICE LAYER ANALYSIS

### Existing Services

#### ✅ `src/lib/services/events.ts`
**Functions:**
- `listEvents()` - Get all events
- `listVisibleEventsForUser(userId)` - Filtered by visibility
- `getEvent(id)` - Single event
- `getEventWithVisibility(id, options)` - With access check
- `createEvent(input, currentUser)` - **NEEDS EXTENSION**
- `updateEvent(id, input, currentUser)` - **NEEDS EXTENSION**
- `deleteEvent(id, currentUser)` - Already checks ownership

**Required Changes:**
1. **`createEvent()`:**
   - ✅ Add permission check: `canCreateEvent(user, club, userPlan, clubPlan)`
   - ✅ Support `clubId` in payload
   - ✅ Auto-assign creator as `organizer` if club event
   - ✅ Validate visibility restrictions (free users can't use `unlisted`/`restricted`)

2. **`updateEvent()`:**
   - ✅ Add permission check: `canEditEvent(user, event, userPlan)`
   - ✅ Support `clubId` updates (only by club owner/organizer)
   - ✅ Validate visibility changes

3. **`listVisibleEventsForUser()`:**
   - ✅ Include `'unlisted'` logic (accessible by direct link)
   - ✅ Include `'restricted'` logic (club members only)

---

#### ✅ `src/lib/services/participants.ts`
**Functions:**
- `listParticipants(eventId)`
- `registerParticipant(eventId, input, currentUser, guestSessionId)`
- `updateParticipant(participantId, input, currentUser, guestSessionId)`
- `deleteParticipant(participantId, currentUser, guestSessionId)`

**Required Changes:** ❌ NONE - works as is

---

#### ❌ Missing: `src/lib/services/clubs.ts`
**Required Functions:**
```typescript
// CRUD
export async function createClub(input, currentUser): Promise<Club>
export async function getClub(clubId, currentUser): Promise<ClubWithDetails>
export async function updateClub(clubId, input, currentUser): Promise<Club>
export async function deleteClub(clubId, currentUser): Promise<boolean>

// Members
export async function addMember(clubId, userId, role, currentUser): Promise<ClubMember>
export async function removeMember(clubId, userId, currentUser): Promise<boolean>
export async function updateMemberRole(clubId, userId, role, currentUser): Promise<ClubMember>
export async function approveMember(clubId, userId, currentUser): Promise<ClubMember>
export async function listClubMembers(clubId): Promise<ClubMember[]>

// Access checks
export async function getUserClubRole(clubId, userId): Promise<ClubRole | null>
export async function listUserClubs(userId): Promise<Club[]>
```

---

#### ❌ Missing: `src/lib/services/subscriptions.ts`
**Required Functions:**
```typescript
export async function getPersonalPlan(userId): Promise<'free' | 'pro'>
export async function getClubPlan(clubId): Promise<ClubPlan>
export async function upgradePersonalPlan(userId, plan): Promise<void>
export async function upgradeClubPlan(clubId, plan, validUntil): Promise<void>
```

---

#### ❌ Missing: `src/lib/services/permissions.ts`
**Required Functions:**
```typescript
// Event permissions
export async function canCreateEvent(
  user: CurrentUser | null, 
  club: Club | null,
  userPlan: 'free' | 'pro',
  clubPlan?: ClubPlan
): Promise<{ allowed: boolean; reason?: string }>

export async function canEditEvent(
  user: CurrentUser | null,
  event: Event,
  userPlan: 'free' | 'pro'
): Promise<{ allowed: boolean; reason?: string }>

export async function canViewEvent(
  user: CurrentUser | null,
  event: Event
): Promise<{ allowed: boolean; reason?: string }>

// Club permissions
export async function canCreateClub(user: CurrentUser | null): Promise<boolean>
export async function canManageClub(user: CurrentUser | null, club: Club): Promise<boolean>
export async function canCreateClubEvent(
  user: CurrentUser | null,
  club: Club,
  clubPlan: ClubPlan
): Promise<{ allowed: boolean; reason?: string }>
```

**Permission Rules (from Bible v3.0):**

**Personal Event Creation:**
- ✅ Free user: Max 1 active public event
- ✅ Free user: Cannot use `unlisted` or `restricted`
- ✅ Free user: Cannot set `isPaid = true`
- ✅ Pro user: Unlimited events, all visibility, paid events OK

**Club Event Creation:**
- ✅ Club free: Max 1 active event
- ✅ Club basic: Max 3 active events
- ✅ Club pro: Unlimited events
- ✅ Only `owner` and `organizer` can create club events
- ✅ Club events inherit club logo/branding

---

## 🗂️ REPOSITORY LAYER ANALYSIS

### Existing Repos

#### ✅ `src/lib/db/eventRepo.ts`
**Functions:**
- `listEvents()`
- `listEventsWithOwner()`
- `getEventById(id)`
- `createEvent(payload)`
- `updateEvent(id, payload)`
- `deleteEvent(id)`
- `replaceAllowedBrands(eventId, brandIds)`
- `getAllowedBrands(eventId)`

**Required Changes:**
- ✅ Support `club_id` field in `createEvent()` and `updateEvent()`
- ✅ Update `visibility` mapping to handle 3 values

---

#### ✅ `src/lib/db/userRepo.ts`
**Functions:**
- `getUserById(id)`
- `getUserByTelegramId(telegramId)`
- `createUser(payload)`
- `updateUser(id, payload)`
- `ensureUserExists(id, name?)`

**Required Changes:**
- ✅ Support `plan` field in SELECT/UPDATE
- ✅ Add `getPlanForUser(userId)` helper

---

#### ❌ Missing: `src/lib/db/clubRepo.ts`
**Required Functions:**
```typescript
export async function createClub(payload): Promise<DbClub>
export async function getClubById(id): Promise<DbClub | null>
export async function listClubs(): Promise<DbClub[]>
export async function updateClub(id, payload): Promise<DbClub | null>
export async function deleteClub(id): Promise<boolean>
export async function getClubWithOwner(id): Promise<DbClubWithOwner | null>
```

---

#### ❌ Missing: `src/lib/db/clubMemberRepo.ts`
**Required Functions:**
```typescript
export async function addMember(clubId, userId, role, invitedBy): Promise<DbClubMember>
export async function getMember(clubId, userId): Promise<DbClubMember | null>
export async function listMembers(clubId): Promise<DbClubMember[]>
export async function listUserClubs(userId): Promise<string[]>  // club IDs
export async function updateMemberRole(clubId, userId, role): Promise<DbClubMember | null>
export async function removeMember(clubId, userId): Promise<boolean>
```

---

#### ❌ Missing: `src/lib/db/subscriptionRepo.ts`
**Required Functions:**
```typescript
export async function getPersonalPlan(userId): Promise<'free' | 'pro'>
export async function getClubSubscription(clubId): Promise<DbClubSubscription | null>
export async function updateClubSubscription(clubId, plan, validUntil, active): Promise<void>
export async function createClubSubscription(clubId, plan): Promise<void>
```

---

## 🎨 FRONTEND COMPONENT ANALYSIS

### Existing Components

#### ✅ `src/components/events/event-form.tsx`
**Current Props:**
```typescript
export type EventFormProps = {
  mode: 'create' | 'edit';
  initialValues?: Partial<EventFormValues>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  backHref: string;
  submitLabel: string;
  lockedFieldIds?: string[];
  disabled?: boolean;
  headerTitle: string;
  headerDescription: string;
};
```

**Required Changes:**
1. ✅ Add "Organizer" field:
   - `<Select>` with options:
     - "Я сам" (personal event, `clubId = null`)
     - List of user's clubs where `role IN ('owner', 'organizer')`
   - Pre-fetch clubs via `listUserClubs(currentUser.id)`

2. ✅ Visibility field:
   - Update options: `['public', 'unlisted', 'restricted']`
   - Disable `unlisted` and `restricted` if:
     - User plan = 'free' AND no club selected
   - Show tooltip: "Доступно только для Pro подписки"

3. ✅ Price field:
   - Disable if user plan = 'free' AND club plan = 'club_free'
   - Show tooltip: "Доступно только для Pro подписки или клубов Basic/Pro"

4. ✅ Pre-submit validation:
   - Call `canCreateEvent(user, club, userPlan, clubPlan)`
   - Show error modal if not allowed with specific reason

**Impact:** MEDIUM - requires API call to load clubs before render

---

#### ✅ `src/components/events/event-card.tsx`
**Current:** Displays event cards on grid

**Required Changes:**
- ✅ Show club logo if `event.clubId` is set
- ✅ Add "Club Event" badge

**Impact:** LOW

---

#### ❌ Missing: Club-related components
**Required:**
```
src/components/clubs/
  club-card.tsx               # For grid display
  club-header.tsx             # Logo, name, city
  club-member-list.tsx        # Table of members with roles
  club-member-actions.tsx     # Approve/remove/change role
  club-event-list.tsx         # Events owned by club
  club-form.tsx               # Create/edit club info
  club-subscription-card.tsx  # Current plan + upgrade button
```

---

#### ❌ Missing: Profile components
**Required:**
```
src/components/profile/
  profile-header.tsx          # Avatar, name, plan badge
  profile-vehicles.tsx        # User's vehicles list
  profile-event-history.tsx   # Created + attended events
  profile-clubs.tsx           # User's clubs with roles
  subscription-card.tsx       # Personal plan + upgrade button
```

---

## 🌐 API ROUTES ANALYSIS

### Existing Routes

#### ✅ `/api/events` (GET, POST)
**Required Changes:**
- **POST:** Add `clubId` support, call permission engine

#### ✅ `/api/events/[id]` (GET, PUT, DELETE)
**Required Changes:**
- **PUT:** Add `clubId` support, validate club ownership
- **GET:** Enforce new visibility rules (`unlisted`, `restricted`)

#### ✅ `/api/auth/telegram` (POST)
**Required Changes:** ❌ NONE

#### ✅ `/api/auth/me` (GET)
**Required Changes:**
- ✅ Include `plan` in response

---

### Missing Routes

#### 🆕 `/api/clubs`
- **GET:** List all clubs (public page)
- **POST:** Create club (requires auth)

#### 🆕 `/api/clubs/[id]`
- **GET:** Get club details + members + subscription
- **PUT:** Update club info (owner/organizer only)
- **DELETE:** Delete club (owner only)

#### 🆕 `/api/clubs/[id]/members`
- **GET:** List members with roles
- **POST:** Add member or invite
- **PUT:** Update member role
- **DELETE:** Remove member

#### 🆕 `/api/clubs/[id]/subscription`
- **GET:** Get current plan
- **PUT:** Upgrade/downgrade plan (owner only)

#### 🆕 `/api/profile`
- **GET:** Current user's full profile
- **PUT:** Update profile

#### 🆕 `/api/profile/vehicles`
- **GET:** List user's vehicles
- **POST:** Add vehicle
- **DELETE:** Remove vehicle

#### 🆕 `/api/profile/subscription`
- **GET:** Current personal plan
- **PUT:** Upgrade/downgrade (mock for now)

---

## 📄 PAGE ROUTES ANALYSIS

### Existing Pages

#### ✅ `/events` (`src/app/events/page.tsx`)
**Required Changes:** ❌ NONE - works as is

#### ✅ `/events/create` (`src/app/events/create/page.tsx`)
**Required Changes:**
- ✅ Pass `currentUser.plan` to form
- ✅ Pass list of user's clubs to form

#### ✅ `/events/[id]` (`src/app/events/[id]/page.tsx`)
**Required Changes:**
- ✅ Show club badge/logo if club event
- ✅ Enforce visibility on server side

#### ✅ `/events/[id]/edit` (`src/app/events/[id]/edit/page.tsx`)
**Required Changes:**
- ✅ Pass `currentUser.plan` to form
- ✅ Pass list of user's clubs to form
- ✅ Call permission engine before allowing edit

---

### Missing Pages

#### 🆕 Club Pages
```
src/app/clubs/
  page.tsx                    # List all clubs (public)
  create/
    page.tsx                  # Create new club
  [id]/
    page.tsx                  # Public club page
    manage/
      page.tsx                # Club dashboard
      members/
        page.tsx              # Manage members
      events/
        page.tsx              # Club events list
      settings/
        page.tsx              # Edit club info
      subscription/
        page.tsx              # Manage subscription
```

#### 🆕 Profile Pages
```
src/app/profile/
  page.tsx                    # Profile view
  edit/
    page.tsx                  # Edit profile
  vehicles/
    page.tsx                  # Manage vehicles
  history/
    page.tsx                  # Event history
  subscription/
    page.tsx                  # Manage subscription
```

---

## ⚠️ CONFLICT ANALYSIS

### 1. Visibility Field Conflict
**Issue:** Current DB has `visibility IN ('public', 'link_registered')` but spec requires `('public', 'unlisted', 'restricted')`

**Resolution:**
- Migration will ALTER constraint
- Map `'link_registered'` → `'restricted'` (semantic match)
- Update TypeScript enum

**Risk:** LOW - semantically compatible

---

### 2. `is_club_event` vs `club_id`
**Issue:** DB already has `is_club_event BOOLEAN` but we're adding `club_id UUID`

**Resolution:**
- Keep both fields (redundant but safe)
- Logic: `is_club_event = (club_id IS NOT NULL)`
- Update forms to set both fields

**Risk:** LOW - redundancy doesn't break functionality

---

### 3. Event Creation Flow
**Issue:** Current flow assumes all logged-in users can create events

**Resolution:**
- Add permission check before submission
- Show error modal with upgrade prompt if not allowed
- Graceful degradation (free users can still create 1 event)

**Risk:** MEDIUM - UX change, needs clear messaging

---

### 4. CurrentUser Type
**Issue:** `CurrentUser` doesn't include `plan`

**Resolution:**
- Add `plan?: 'free' | 'pro'` to type
- Update `getCurrentUser()` to SELECT plan
- Update `/api/auth/me` response

**Risk:** LOW - backward compatible (optional field)

---

## 🚨 OBSOLETE CODE DETECTION

### None Found
**Status:** ✅ No obsolete components detected

All existing code serves a purpose and will continue to work after extension.

---

## 🔧 SERVICE EXPANSION POINTS

### 1. Event Service (`src/lib/services/events.ts`)

**Expansion Point:** `createEvent()` line 237
```typescript
// BEFORE
export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  if (!currentUser) {
    throw new AuthError(...);
  }
  const parsed = eventCreateSchema.parse(input);
  // ...
}

// AFTER
export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  if (!currentUser) {
    throw new AuthError(...);
  }
  
  // TODO: Need4Trip: Add permission check
  const userPlan = await getPersonalPlan(currentUser.id);
  const clubPlan = input.clubId ? await getClubPlan(input.clubId) : null;
  const permissionCheck = await canCreateEvent(
    currentUser, 
    input.clubId, 
    userPlan, 
    clubPlan
  );
  if (!permissionCheck.allowed) {
    throw new AuthError(permissionCheck.reason ?? 'Недостаточно прав');
  }
  
  const parsed = eventCreateSchema.parse(input);
  // ... continue
}
```

---

### 2. Event Form (`src/components/events/event-form.tsx`)

**Expansion Point:** After line 92 (state initialization)
```typescript
// TODO: Need4Trip: Load user's clubs for organizer selector
const [userClubs, setUserClubs] = useState<Club[]>([]);
const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

useEffect(() => {
  if (!currentUser) return;
  fetch(`/api/clubs?userId=${currentUser.id}`)
    .then(res => res.json())
    .then(data => setUserClubs(data.clubs ?? []));
}, [currentUser]);
```

**Expansion Point:** Before submit (line ~600)
```typescript
// TODO: Need4Trip: Add pre-submit permission check
const checkPermissions = async () => {
  const res = await fetch('/api/permissions/can-create-event', {
    method: 'POST',
    body: JSON.stringify({ clubId: selectedClubId }),
  });
  const data = await res.json();
  if (!data.allowed) {
    alert(data.reason);
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  const allowed = await checkPermissions();
  if (!allowed) return;
  // ... continue
};
```

---

### 3. Main Header (`src/components/layout/main-header.tsx`)

**Expansion Point:** Navigation links
```typescript
// TODO: Need4Trip: Add links to profile and clubs
<nav>
  <Link href="/events">События</Link>
  <Link href="/clubs">Клубы</Link>
  {currentUser && (
    <>
      <Link href="/profile">Профиль</Link>
      <Link href="/profile/subscription">
        <Badge variant={user.plan === 'pro' ? 'solid-purple' : 'neutral'}>
          {user.plan === 'pro' ? 'PRO' : 'FREE'}
        </Badge>
      </Link>
    </>
  )}
</nav>
```

---

### 4. Event Details Page (`src/app/events/[id]/page.tsx`)

**Expansion Point:** After event data fetch
```typescript
// TODO: Need4Trip: Load club info if club event
let club = null;
if (event.clubId) {
  const clubRes = await fetch(`/api/clubs/${event.clubId}`);
  if (clubRes.ok) {
    club = await clubRes.json();
  }
}
```

**Expansion Point:** In JSX (after event title)
```typescript
{/* TODO: Need4Trip: Show club badge */}
{club && (
  <div className="flex items-center gap-2">
    {club.logoUrl && <img src={club.logoUrl} className="h-8 w-8 rounded" />}
    <Link href={`/clubs/${club.id}`}>
      <Badge variant="club">{club.name}</Badge>
    </Link>
  </div>
)}
```

---

## 📊 MIGRATION DEPENDENCY GRAPH

```
PHASE 1: Database Migrations
  ├─ Step 1: Create clubs table
  ├─ Step 2: Create club_members table
  ├─ Step 3: Create club_subscriptions table
  ├─ Step 4: ALTER events (add club_id, modify visibility)
  └─ Step 5: ALTER users (add plan)

PHASE 2: Type System
  ├─ Create src/lib/types/club.ts
  ├─ Update src/lib/types/user.ts (add plan)
  ├─ Update src/lib/types/event.ts (add clubId, update Visibility)
  └─ Update src/lib/types/supabase.ts (generate from DB)

PHASE 3: Repository Layer
  ├─ Create src/lib/db/clubRepo.ts
  ├─ Create src/lib/db/clubMemberRepo.ts
  ├─ Create src/lib/db/subscriptionRepo.ts
  ├─ Update src/lib/db/userRepo.ts (add getPlanForUser)
  └─ Update src/lib/db/eventRepo.ts (support club_id)

PHASE 4: Service Layer
  ├─ Create src/lib/services/clubs.ts
  ├─ Create src/lib/services/subscriptions.ts
  ├─ Create src/lib/services/permissions.ts
  ├─ Update src/lib/services/events.ts (add permission checks)
  └─ Test: All existing event flows still work

PHASE 5: API Layer
  ├─ Create /api/clubs (CRUD endpoints)
  ├─ Create /api/clubs/[id]/members
  ├─ Create /api/clubs/[id]/subscription
  ├─ Create /api/profile/*
  ├─ Update /api/events (add permission checks)
  └─ Update /api/auth/me (include plan)

PHASE 6: Frontend Components
  ├─ Update src/components/events/event-form.tsx (add organizer selector)
  ├─ Update src/components/events/event-card.tsx (show club badge)
  ├─ Create src/components/clubs/* (all club components)
  └─ Create src/components/profile/* (all profile components)

PHASE 7: Pages
  ├─ Update src/app/events/create/page.tsx (pass plan and clubs)
  ├─ Update src/app/events/[id]/page.tsx (show club info)
  ├─ Create src/app/clubs/* (all club pages)
  └─ Create src/app/profile/* (all profile pages)

PHASE 8: Polish
  ├─ Update src/components/layout/main-header.tsx (add nav links)
  ├─ Add loading states for all new pages
  ├─ Add error boundaries
  └─ Test entire flow end-to-end
```

---

## ✅ DEPLOYMENT SAFETY CHECKLIST

### Before Each Phase
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Manual smoke test of existing flows:
  - [ ] Create event (personal)
  - [ ] Register participant
  - [ ] Edit event
  - [ ] Delete event

### After Each Phase
- [ ] New code has TODO markers for future work
- [ ] New endpoints return proper error codes
- [ ] Loading states implemented
- [ ] Backward compatibility verified
- [ ] Database rollback script prepared (if applicable)

---

## 📝 SUMMARY OF REQUIRED MODIFICATIONS

### High Priority (Core Functionality)
1. ✅ **Database Migrations** (3 new tables, 2 table alterations)
2. ✅ **Type System** (1 new file, 3 file updates)
3. ✅ **Repository Layer** (3 new files, 2 file updates)
4. ✅ **Service Layer** (3 new files, 1 file update)
5. ✅ **Permission Engine** (1 new file, critical for auth)

### Medium Priority (User-Facing Features)
6. ✅ **API Routes** (8 new endpoints, 3 endpoint updates)
7. ✅ **Event Form** (add organizer selector, visibility rules)
8. ✅ **Club Pages** (7 new pages)
9. ✅ **Profile Pages** (5 new pages)

### Low Priority (Polish)
10. ✅ **Navigation** (add links to header)
11. ✅ **Badges** (club badges, plan badges)
12. ✅ **Loading States** (skeleton UI for new pages)

---

## 🎯 NEXT STEPS

**STATUS:** ✅ **PHASE 0 COMPLETE**

**Ready to proceed to:**
- **PHASE 1:** Database Migrations
  - Create SQL migration files
  - Test migrations on dev database
  - Generate updated TypeScript types

**Estimated Effort:**
- Phase 1: 2-3 hours
- Phase 2-4: 6-8 hours
- Phase 5-7: 10-12 hours
- Phase 8-9: 4-6 hours
- **Total:** ~25-30 hours of development

**Risk Assessment:** ✅ LOW
- Existing architecture is well-structured
- No major refactoring needed
- Extension points are clear
- Backward compatibility maintained

---

**Analysis completed successfully. No breaking changes detected. System ready for extension.**

---

_Generated by: AI Assistant (Claude Sonnet 4.5)_  
_Date: 12 декабря 2025_  
_Document Version: 1.0_

