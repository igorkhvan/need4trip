# UX_COMPLIANCE_MATRIX.md

> **Purpose**  
> Canonical audit matrix mapping all existing pages to UX taxonomy, loading patterns, state handling, and SSOT deviations.  
> This document is **descriptive, not prescriptive**. It captures reality as-is.

> **Status**: Non-canonical  
> **Next step**: Use as input for SSOT enforcement & refactoring backlog

---

## Legend

- **Page Type**: per SSOT_UX_GOVERNANCE
- **Width Mode**: STANDARD | NARROW | FULL
- **Loading Pattern**:
  - SSR_BLOCKING
  - SUSPENSE_STREAM
  - CLIENT_FETCH
  - SKELETON
  - TRANSITION
- **States**:
  - EMPTY
  - ERROR
  - FORBIDDEN
  - ARCHIVED
- **Deviation**:
  - ✅ compliant
  - ⚠️ partially compliant
  - ❌ violation

---

## EVENTS DOMAIN

### /events/[id]
| Aspect | Value |
|------|------|
| Page Type | CONTENT_DETAIL |
| Width Mode | STANDARD |
| Loading Pattern | SSR_BLOCKING + SUSPENSE_STREAM |
| States | EMPTY, ERROR, FORBIDDEN |
| Notes | Duplicate participants fetch (page + async) |
| Deviation | ⚠️ (data duplication, mixed loading responsibility) |

---

### /events/[id]/edit
| Aspect | Value |
|------|------|
| Page Type | MANAGEMENT |
| Width Mode | STANDARD |
| Loading Pattern | SSR_BLOCKING + CLIENT_FETCH |
| States | ERROR, PAYWALL, CONFIRMATION |
| Notes | Categories & vehicle data load client-side without skeleton |
| Deviation | ⚠️ (missing skeleton, mixed async UX) |

---

## CLUBS – INDEX & CREATE

### /clubs
| Aspect | Value |
|------|------|
| Page Type | CONTENT_LIST |
| Width Mode | STANDARD |
| Loading Pattern | CLIENT_FETCH + SKELETON + TRANSITION |
| States | EMPTY, ERROR |
| Notes | Good transition delay; no server rendering |
| Deviation | ⚠️ (no error-specific UI, empty/error conflation) |

---

### /clubs/create
| Aspect | Value |
|------|------|
| Page Type | MANAGEMENT |
| Width Mode | STANDARD |
| Loading Pattern | SSR_BLOCKING + CLIENT_DYNAMIC_IMPORT |
| States | ERROR |
| Notes | No skeleton for dynamic form import |
| Deviation | ⚠️ (layout shift risk, missing loading placeholder) |

---

## CLUB PROFILE

### /clubs/[id]
| Aspect | Value |
|------|------|
| Page Type | CONTENT_DETAIL |
| Width Mode | STANDARD |
| Loading Pattern | SSR_BLOCKING + SUSPENSE_STREAM |
| States | EMPTY, ERROR, FORBIDDEN, ARCHIVED |
| Notes | Good separation of async previews |
| Deviation | ✅ compliant |

---

## CLUB MEMBERS

### /clubs/[id]/members
| Aspect | Value |
|------|------|
| Page Type | MANAGEMENT |
| Width Mode | STANDARD |
| Loading Pattern | SSR_BLOCKING + CLIENT_FETCH + SKELETON |
| States | EMPTY, ERROR, FORBIDDEN, ARCHIVED |
| Notes | Duplicate back buttons in forbidden state |
| Deviation | ⚠️ (forbidden UX duplication) |

---

## CLUB EVENTS

### /clubs/[id]/events
| Aspect | Value |
|------|------|
| Page Type | CONTENT_LIST |
| Width Mode | STANDARD |
| Loading Pattern | SSR_BLOCKING + SUSPENSE + CLIENT_FETCH |
| States | EMPTY, ERROR, FORBIDDEN, ARCHIVED |
| Notes | Good skeleton match to final layout |
| Deviation | ⚠️ (client-only data without cache) |

---

## CLUB SETTINGS

### /clubs/[id]/settings
| Aspect | Value |
|------|------|
| Page Type | MANAGEMENT |
| Width Mode | ❌ NARROW |
| Loading Pattern | SSR_BLOCKING |
| States | ERROR, ARCHIVED |
| Notes | Width inconsistent with other management pages |
| Deviation | ❌ **SSOT VIOLATION** (width governance) |

---

## SUMMARY BY CATEGORY

### Width Mode Violations
| Page | Issue |
|----|----|
| /clubs/[id]/settings | Uses NARROW instead of STANDARD |

---

### Loading Pattern Issues
| Pattern | Pages | Issue |
|------|------|------|
| CLIENT_FETCH w/o skeleton | /events/[id]/edit | Poor perceived performance |
| Dynamic import w/o placeholder | /clubs/create | Layout shift risk |

---

### State Handling Issues
| State | Pages | Issue |
|-----|------|------|
| FORBIDDEN | /clubs/[id]/members | Duplicate navigation |
| ERROR | /clubs | No distinct error UI |

---

## HIGH-RISK INCONSISTENCIES (SSOT-LEVEL)

1. **Width Governance Drift**
   - Management pages not visually unified
2. **Async Responsibility Blur**
   - Same data fetched in server + client layers
3. **Error vs Empty Conflation**
   - Particularly on list pages
4. **Forbidden UX Duplication**
   - Multiple “back” affordances

---

## RECOMMENDED NEXT ACTIONS (NON-CODE)

1. Lock width rule: `MANAGEMENT → STANDARD`
2. Define canonical forbidden layout (single entry point)
3. Enforce skeleton presence for:
   - client fetch > 300ms
   - dynamic imports
4. Split ERROR vs EMPTY contract explicitly

---

> This matrix is the **ground truth snapshot**.  
> All SSOT decisions must reference this document explicitly.
