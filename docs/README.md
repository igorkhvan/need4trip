# Need4Trip Documentation

**Last Updated:** 26 December 2024

---

## 🎯 SSOT Documents (Single Source of Truth)

**CRITICAL:** These 3 documents are the ONLY authoritative sources. All other docs must defer to them.

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md) — System Architecture
- **Version:** 2.2 (5,000+ lines)
- **Sections:** 15 sections covering all architectural decisions
- Module ownership & boundaries
- Server/Client/Edge runtime constraints
- Data access patterns (Repositories → Services → API)
- Caching policies & performance
- Authentication flows
- **NEW:** Naming conventions (§12)
- **NEW:** Client data fetching patterns (§13)
- **NEW:** Performance optimizations (§14)
- **NEW:** Error handling & validation (§15)

**Rule:** Before ANY architectural change, read ARCHITECTURE.md. After change, update it IN THE SAME COMMIT.

### 2. [DATABASE.md](./DATABASE.md) — Database Schema
- **Version:** 4.8 (1,066 lines)
- 20 tables with full CREATE TABLE schemas
- Performance indexes (compound, covering, partial)
- RLS policies summary
- Database functions & triggers
- Migration history (70+ migrations)
- ERD diagram

**Rule:** Before ANY database change, read DATABASE.md. After migration, update it IN THE SAME COMMIT.

### 3. [BILLING_SYSTEM_ANALYSIS.md](./BILLING_SYSTEM_ANALYSIS.md) — Billing & Limits
- **Version:** 4.0 (2,689 lines)
- Тарифы (free, club_50, club_500, club_unlimited)
- Лимиты для каждого тарифа
- Enforcement логика (enforceClubAction)
- PaywallError структура
- Frontend integration patterns
- One-time credit purchases

**Rule:** Before ANY billing change, read BILLING_SYSTEM_ANALYSIS.md. After change, update it IN THE SAME COMMIT.

---

## 📁 Other Documentation

### Design System
- **[design/design-system.md](./design/design-system.md)** — UI components, colors, typography

### Development Guides
- **[development/AI_FEATURES.md](./development/AI_FEATURES.md)** — AI event rules generation
- **[development/CACHE_MANAGEMENT.md](./development/CACHE_MANAGEMENT.md)** — Caching strategy
- **[development/NOTIFICATIONS_ARCHITECTURE.md](./development/NOTIFICATIONS_ARCHITECTURE.md)** — Notification system

### Deployment Guides
- **[guides/telegram-setup.md](./guides/telegram-setup.md)** — Telegram authentication setup

---

## 🗂️ Archive

**Path:** `docs/archive/`

Contains historical documents:
- Session reports (refactoring, billing implementations)
- Audit reports (codebase analysis)
- Implementation completion docs
- Gap analysis documents

**Rule:** Archive documents are historical records ONLY. Do NOT use for current decisions.

---

## ⚠️ Documentation Principles

### SSOT Rules

1. **3 главных SSOT:** ARCHITECTURE.md, DATABASE.md, BILLING_SYSTEM_ANALYSIS.md
2. **Обновление:** При изменении кода ВСЕГДА обновляй SSOT в том же коммите
3. **Архивация:** Временные документы (sessions, analysis) → удалять/архивировать
4. **Версионирование:** SSOT имеют версии и даты обновления
5. **Синхронизация:** Memory правила (.cursor) синхронизированы с SSOT файлами

### When to Update SSOT

**ARCHITECTURE.md:**
- Adding/removing modules
- Changing runtime boundaries (server/client/edge)
- New data access patterns
- Caching strategy changes
- Auth flow modifications
- Naming convention changes
- Client fetching pattern changes

**DATABASE.md:**
- New tables/columns
- Index changes
- RLS policy updates
- Database functions/triggers
- After EVERY migration

**BILLING_SYSTEM_ANALYSIS.md:**
- New plans/tiers
- Limit changes
- Enforcement logic updates
- Payment flow modifications
- Paywall behavior changes

### Commit Message Pattern

```bash
# When updating SSOT
git commit -m "feat: add feature X + update ARCHITECTURE.md

Code changes:
- ...

SSOT update:
- ARCHITECTURE.md § N: documented new pattern
"
```

---

## 🚫 Deprecated Documents

The following documents are NO LONGER MAINTAINED:

- ❌ GAP_ANALYSIS_PRESCRIPTIVE_REFACTOR.md → archived
- ❌ AUDIT_REPORT.md → archived
- ❌ REFACTOR_PLAN.md → archived
- ❌ NAMING_AND_STRUCTURE.md → merged into ARCHITECTURE.md § 12
- ❌ CLIENT_FETCHING_MODEL.md → merged into ARCHITECTURE.md § 13
- ❌ docs/sessions/* → removed (ephemeral)

**If you find references to these, update them to point to ARCHITECTURE.md.**

---

## 📊 Documentation Stats

| Document | Lines | Sections | Status |
|----------|-------|----------|--------|
| ARCHITECTURE.md | 5,000+ | 15 | ✅ Active |
| DATABASE.md | 1,066 | 8 | ✅ Active |
| BILLING_SYSTEM_ANALYSIS.md | 2,689 | 10 | ✅ Active |
| design/design-system.md | 800+ | 5 | ✅ Active |
| development/* | ~2,000 | Various | ✅ Active |
| **Total SSOT** | **~9,500** | **38+** | **✅** |

---

**Remember:** When in doubt, check ARCHITECTURE.md first!
