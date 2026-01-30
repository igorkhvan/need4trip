# Phase B5.4: CSV Export Implementation

**Status:** ⚠️ BLOCKED — NO UI ENTRY POINTS  
**Date:** 2026-01-30  
**Type:** UI Wiring (Discovery Only)  
**Scope:** CSV Export billing enforcement UX

---

## Summary

Phase B5.4 was intended to wire `useHandleApiError()` to CSV export actions for 402 PAYWALL handling. 

**Discovery revealed:** There are NO CSV export entry points in the current production UI.

---

## Discovery Results

### Export Entry Point Inventory

| Component | Location | Status |
|-----------|----------|--------|
| **API-024** | `/api/clubs/[id]/export` | ✅ Active, has billing enforcement |
| **Legacy Component** | `src/components/clubs/club-members-list.tsx` | ❌ NOT IMPORTED (dead code) |
| **Active Members Page** | `src/app/(app)/clubs/[id]/members/_components/` | ❌ No export functionality |

### API-024 Details

- **Endpoint:** `GET /api/clubs/[id]/export`
- **Billing Action:** `CLUB_EXPORT_PARTICIPANTS_CSV`
- **402 Reason:** `CSV_EXPORT_NOT_ALLOWED`
- **Authorization:** Owner or Admin only
- **Returns:** CSV file or 402 PAYWALL

Per B3-3 Matrix (`PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md`):

| Reason Code | User Message (RU) | Primary CTA | UI Pattern |
|-------------|-------------------|-------------|------------|
| `CSV_EXPORT_NOT_ALLOWED` | Экспорт участников недоступен на текущем тарифе. | Перейти на расширенный тариф | Inline blocking message |

**409 NOT APPLICABLE** — CSV export has no credit confirmation semantics.

### Legacy Component Analysis

File: `src/components/clubs/club-members-list.tsx`

- Contains `handleExportCSV()` function
- Uses legacy `usePaywall()` hook (not B5.0 infrastructure)
- Has "Экспортировать в CSV" button
- **NOT imported by any file in the codebase**
- Appears to be dead code from previous refactoring

### Active Members Page Analysis

File: `src/app/(app)/clubs/[id]/members/_components/club-members-list.tsx`

- Different component with same name (in `_components` folder)
- Already integrated with B5.3 (has `handleBillingError` prop)
- **Does NOT include export functionality**
- Follows Visual Contract V4 MEMBERS (LOCKED)

### Visual Contract Constraints

**CLUBS_UI_VISUAL_CONTRACT V4 MEMBERS (LOCKED):**
- Defines Members List section content as: Avatar, Name, Role, Joined date
- Does NOT include export button in spec
- Section 5 interaction rules: Member (read-only), Admin (read-only), Owner (remove)

**CLUBS_UI_VISUAL_CONTRACT v1 BILLING (LOCKED):**

```
## 12. Explicitly Forbidden UI (Hard Rules)
The following are NOT allowed in Billing UI v1:
- CSV export
```

---

## Stop Condition Met

Per Phase B5.4 prompt:

> STOP and report if:
> - Export depends on navigation-only download and cannot be handled without major redesign.

**Actual situation:** Export UI does not exist in production. There is no UI entry point to wire.

---

## Root Cause Analysis

1. **Legacy code:** `src/components/clubs/club-members-list.tsx` was likely part of an older club members implementation
2. **Visual Contract V4:** Created new members page structure without export
3. **No migration:** Export functionality was not migrated to new architecture
4. **Dead code:** Legacy component left in codebase but not imported

---

## Recommendations

### Option 1: Skip B5.4 (Recommended for current scope)

- B5.4 wiring is not applicable without UI entry points
- No changes needed to achieve billing enforcement
- API already has proper enforcement via `enforceClubAction()`

### Option 2: Future Phase — Add Export UI

Requires:
1. Amendment to Visual Contract V4 MEMBERS (add export to owner/admin actions)
2. OR new section/page for export functionality
3. Implementation of export button with B5.0 infrastructure

### Option 3: Restore Legacy Component (Not Recommended)

- Would require replacing active members list component
- Legacy component uses old patterns (not aligned with B5.0)
- May conflict with Visual Contract V4

---

## Deliverables

### Code Changes

**None.** No CSV export entry points exist to wire.

### Documentation

- [x] Created `PHASE_B5-4_CSV_EXPORT_IMPLEMENTATION.md` (this document)
- [x] Documented discovery findings
- [x] Identified legacy component as dead code

---

## Verification Checklist

- [x] **B5.0 infrastructure was NOT modified**
- [x] **No scopes outside CSV export were touched**
- [x] **No code changes made** (discovery-only phase)
- [x] API-024 billing enforcement verified at backend level
- [x] Visual Contracts reviewed for export requirements

---

## Related Documents

- [SSOT_API.md](../../ssot/SSOT_API.md) — API-024 specification
- [PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md](../b3/PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md) — CSV_EXPORT_NOT_ALLOWED UX
- [CLUBS_UI_VISUAL_CONTRACT V4 MEMBERS.md](../../ui-contracts/system/CLUBS_UI_VISUAL_CONTRACT%20V4%20MEMBERS.md) — Members page spec (LOCKED)
- [CLUBS_UI_VISUAL_CONTRACT v1 — BILLING.md](../../ui-contracts/pages/CLUBS_UI_VISUAL_CONTRACT%20v1%20—%20BILLING%20(Club%20Settings).md) — Billing page spec (LOCKED)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | AI (Phase B5.4) | Discovery-only — no UI entry points found |

---

**Phase B5.4 complete. No code changes required. Export UI does not exist in production.**
