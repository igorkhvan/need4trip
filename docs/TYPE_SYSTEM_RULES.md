### Type System Organization

**Critical Rule:** Domain types and Database types are SEPARATE concerns.

#### Domain Types (`lib/types/`)

**Purpose:** Business logic types that represent application concepts.

**Characteristics:**
- Manually written and maintained
- Use camelCase naming (TypeScript convention)
- Represent business rules and domain models
- Used across services, API routes, and components
- Independent of database schema

**Examples:**
```typescript
// lib/types/event.ts
export interface Event {
  id: string;
  title: string;
  dateTime: string;           // camelCase
  maxParticipants: number | null;
  createdByUserId: string | null;
}

// lib/types/billing.ts
export interface BillingTransaction {
  clubId: string | null;
  productCode: ProductCode;    // Domain enum
  amountKzt: number;
}
```

#### Database Types (`lib/db/types.ts`)

**Purpose:** Auto-generated types from Supabase schema (infrastructure).

**Characteristics:**
- **NEVER edit manually** - always regenerate after migrations
- Use snake_case (PostgreSQL convention)
- Represent DB structure: `Row`, `Insert`, `Update` interfaces
- Used ONLY in repository layer
- Include all Supabase-specific metadata (relationships, enums)

**Generation command:**
```bash
npx supabase gen types typescript --project-id YOUR_ID > src/lib/db/types.ts
```

**Example:**
```typescript
// lib/db/types.ts (AUTO-GENERATED)
export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          date_time: string;         // snake_case
          max_participants: number | null;
          created_by_user_id: string | null;
        }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
    }
  }
}
```

#### Mapping Between Types

**Repositories are responsible for mapping DB types → Domain types:**

```typescript
// lib/db/eventRepo.ts
import type { Database } from "./types";           // DB types
import type { Event } from "@/lib/types/event";    // Domain types

type DbEvent = Database["public"]["Tables"]["events"]["Row"];

function mapDbToEvent(db: DbEvent): Event {
  return {
    id: db.id,
    title: db.title,
    dateTime: db.date_time,              // snake_case → camelCase
    maxParticipants: db.max_participants,
    createdByUserId: db.created_by_user_id,
  };
}
```

#### Rules

**✅ MUST:**
- Repositories import from `lib/db/types` (DB types)
- Services/API routes import from `lib/types/*` (Domain types)
- Repositories return domain types (NOT DB types)
- Regenerate `lib/db/types.ts` after every migration

**❌ MUST NOT:**
- Import `lib/db/types` outside of `lib/db/` folder
- Manually edit `lib/db/types.ts`
- Use DB types (snake_case) in services or API routes
- Mix domain and database concerns

#### Rationale

**Separation of concerns:**
- Domain types = what we think (business logic)
- Database types = what DB stores (infrastructure)

**Colocation:**
- DB types live with DB client and repositories
- Easy to find: everything DB-related in one folder

**Clarity:**
- `lib/types/` = business concepts
- `lib/db/types.ts` = technical schema

**Safety:**
- Auto-generation prevents drift between code and schema
- TypeScript catches schema mismatches at compile time

---

