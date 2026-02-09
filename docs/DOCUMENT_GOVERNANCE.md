# Document Governance

**Last Updated:** 2026-02-09  
**Status:** ACTIVE  
**Scope:** All documentation in `/docs/` directory

---

## 1. Purpose

This document establishes governance rules for documentation in the Need4Trip project.

**Goals:**
- Ensure deterministic document organization
- Prevent documentation sprawl and duplication
- Provide clear rules for Cursor AI-generated documents
- Maintain single source of truth for each domain

**Cursor AI MUST follow these rules** when creating, modifying, or referencing documentation.

---

## 2. Document Types (Glossary)

| Type | Prefix/Pattern | Description | Authority Level |
|------|----------------|-------------|-----------------|
| **SSOT** | `SSOT_*.md` | Single Source of Truth — canonical reference for a domain | **NORMATIVE** |
| **Blueprint** | `*_BLUEPRINT*.md` | Implementation specification for major features | **NORMATIVE** |
| **UI Contract** | `*_UI_VISUAL_CONTRACT*.md` | Visual/behavioral contract for UI components | **NORMATIVE** |
| **Phase Artifact** | `PHASE_*.md` | Phase-specific analysis, audit, or planning document | **NORMATIVE** (during phase) |
| **ADR** | `ADR-*.md` | Architecture Decision Record | **NORMATIVE** (if active) |
| **Audit/Analysis** | `*_AUDIT*.md`, `*_ANALYSIS*.md`, `*_DIAGNOSTICS*.md`, `*_VERIFICATION*.md` | Investigation or validation report | **INFORMATIVE** |
| **Security / Platform** | `*_CAPABILITIES*.md`, `*_POSTURE*.md` | Current-state inventory of security mechanisms | **INFORMATIVE** |
| **Guide** | Free-form | How-to documentation | **INFORMATIVE** |
| **Development Doc** | Free-form | Development-related notes | **INFORMATIVE** |
| **Generated Working Document** | Any | Cursor-generated interim documents | **DRAFT** |

### Authority Levels

- **NORMATIVE**: Authoritative source. Code MUST align with it.
- **INFORMATIVE**: Useful context but not binding.
- **DRAFT**: Work in progress. NOT authoritative.

---

## 3. Directory Structure

```
docs/
├── DOCUMENT_GOVERNANCE.md    # This file
├── README.md                 # Documentation index
├── ssot/                     # Single Source of Truth documents
│   └── archive/              # Deprecated SSOT versions
├── blueprint/                # Implementation blueprints
├── ui-contracts/             # UI visual contracts
│   ├── system/               # v2+ and system-wide contracts
│   └── pages/                # v1 page-specific contracts
├── phase/                    # Phase-specific artifacts
│   └── {phase-id}/           # e.g., b3/, b4/
├── adr/                      # Architecture Decision Records
│   ├── active/               # Current active ADRs
│   └── archive/              # Superseded/deprecated ADRs
├── security/                 # Security & anti-abuse capability documents
├── audits/                   # Audits, analysis, verification reports
├── guides/                   # How-to guides
├── development/              # Development documentation
└── archive/                  # All archived/deprecated documents
```

---

## 4. Lifecycle Rules

### 4.1 SSOT Documents

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/ssot/SSOT_*.md` |
| **Who can create** | Human developer only (explicit instruction required) |
| **Naming** | `SSOT_{DOMAIN}.md` (e.g., `SSOT_BILLING_SYSTEM_ANALYSIS.md`) |
| **Archival** | Move to `docs/ssot/archive/` when superseded |
| **Cursor reference** | ✅ Authoritative — Cursor MUST read before changes |

### 4.2 Blueprint Documents

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/blueprint/` |
| **Who can create** | Human developer or Cursor (with explicit instruction) |
| **Naming** | `{FEATURE}_BLUEPRINT*.md` |
| **Archival** | Move to `docs/archive/` when implemented or deprecated |
| **Cursor reference** | ✅ Authoritative for implementation |

### 4.3 UI Contracts

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/ui-contracts/system/` (v2+), `docs/ui-contracts/pages/` (v1 page-specific) |
| **Who can create** | Human developer or Cursor (with explicit instruction) |
| **Naming** | `{COMPONENT}_UI_VISUAL_CONTRACT*.md` |
| **Archival** | Move to `docs/archive/` when superseded |
| **Cursor reference** | ✅ Authoritative for UI implementation |

### 4.4 Phase Artifacts

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/phase/{phase-id}/` |
| **Who can create** | Cursor or human |
| **Naming** | `PHASE_{PHASE-ID}-{SEQ}_{DESCRIPTION}.md` |
| **Archival** | Move to `docs/archive/` when phase completes |
| **Cursor reference** | ✅ Authoritative during active phase |

### 4.5 ADR (Architecture Decision Records)

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/adr/active/` (active), `docs/adr/archive/` (superseded) |
| **Who can create** | Human developer only |
| **Naming** | `ADR-{NNN}.md` (main), `ADR-{NNN}.{revision}.md` (amendments) |
| **Archival** | Move to `docs/adr/archive/` when superseded |
| **Cursor reference** | ✅ Authoritative (active only) |

### 4.6 Audits / Analysis

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/audits/` |
| **Who can create** | Cursor or human |
| **Naming** | Contains `AUDIT`, `ANALYSIS`, `DIAGNOSTICS`, or `VERIFICATION` |
| **Archival** | Move to `docs/archive/` after 90 days or when obsolete |
| **Cursor reference** | ⚠️ Informative only — NOT authoritative |

### 4.7 Security / Platform Documents

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/security/` |
| **Who can create** | Cursor or human (with explicit instruction) |
| **Naming** | `{DOMAIN}_CAPABILITIES.md` or `{DOMAIN}_POSTURE.md` |
| **Archival** | Move to `docs/archive/` when superseded |
| **Cursor reference** | ⚠️ Informative — describes current state of security mechanisms |

### 4.8 Guides / Development Docs

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/guides/` or `docs/development/` |
| **Who can create** | Cursor or human |
| **Archival** | Move to `docs/archive/` when obsolete |
| **Cursor reference** | ⚠️ Informative only |

### 4.9 Archive

| Attribute | Rule |
|-----------|------|
| **Location** | `docs/archive/` |
| **Content** | Deprecated, superseded, or obsolete documents |
| **Cursor reference** | ❌ NOT authoritative — historical reference only |

---

## 5. Cursor Generation Rules

### 5.1 General Rules

1. **Cursor MUST NOT create SSOT files** unless explicitly instructed by human.
2. **Cursor MUST NOT create files in `docs/` root** — use appropriate subdirectory.
3. **Cursor MUST place Phase artifacts** under `docs/phase/{phase-id}/`.
4. **Cursor MUST include status header** in generated documents:

```markdown
---
Status: DRAFT | ACCEPTED | ARCHIVED
Created: YYYY-MM-DD
Author: Cursor AI
Phase: {phase-id} (if applicable)
---
```

### 5.2 Before Creating a Document

Cursor MUST:
1. Check if SSOT exists for the domain → read it first
2. Check if similar document exists → update instead of create
3. Determine correct directory per this governance
4. Use correct naming convention

### 5.3 Document Naming

| Type | Pattern | Example |
|------|---------|---------|
| Phase Artifact | `PHASE_{ID}-{SEQ}_{DESC}.md` | `PHASE_B3-1_ENFORCEMENT_INVENTORY.md` |
| Audit | `{DOMAIN}_AUDIT_REPORT.md` | `BILLING_AUDIT_REPORT.md` |
| Analysis | `{DOMAIN}_ANALYSIS.md` | `CLUBS_AUTH_RESOLUTION_ANALYSIS.md` |
| Blueprint | `{FEATURE}_BLUEPRINT*.md` | `CLUBS_IMPLEMENTATION_BLUEPRINT v1.md` |
| UI Contract | `{COMPONENT}_UI_VISUAL_CONTRACT*.md` | `CLUBS_UI_VISUAL_CONTRACT v2.md` |

### 5.4 Updating Documents

1. **SSOT files**: Cursor MAY update ONLY when explicitly instructed
2. **Phase artifacts**: Cursor MAY update freely during active phase
3. **Audits/Analysis**: Cursor MAY create and update as needed
4. **Archive**: Cursor MUST NOT modify archived documents

---

## 6. Anti-Patterns (Forbidden Behaviors)

### ❌ FORBIDDEN

| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| Multiple active SSOTs for same domain | Conflicting truth sources | Keep ONE SSOT per domain |
| Multiple active ADRs for same decision | Ambiguous decisions | Supersede old ADR, archive it |
| Writing analysis directly into SSOT | Pollutes authoritative source | Write separate audit, update SSOT summary |
| Leaving temporary files unclassified | Clutters documentation | Always use correct directory |
| Creating docs in `docs/` root | Breaks organization | Use subdirectory per type |
| Creating SSOT without instruction | Unauthorized normative doc | Only human creates SSOT |
| Referencing archived docs as truth | Stale information | Use active SSOT/ADR only |
| Duplicating content across documents | Sync drift risk | Single source, reference it |

---

## 7. Enforcement

### For Cursor AI

Before any documentation task:
1. ✅ Read `docs/DOCUMENT_GOVERNANCE.md`
2. ✅ Check relevant SSOT for domain
3. ✅ Determine correct directory
4. ✅ Follow naming conventions
5. ✅ Include status header

### For Human Developers

- Review Cursor-generated documents for correct placement
- Move misplaced documents to correct directory
- Archive obsolete documents (don't delete)
- Update SSOT when implementation changes

---

## 8. Quick Reference

| I want to... | Go to... |
|--------------|----------|
| Find authoritative rules for a domain | `docs/ssot/SSOT_{DOMAIN}.md` |
| Find implementation spec for feature | `docs/blueprint/` |
| Find UI contract for component | `docs/ui-contracts/` |
| Find current phase work | `docs/phase/{phase-id}/` |
| Find architecture decisions | `docs/adr/active/` |
| Find audit/analysis reports | `docs/audits/` |
| Find security capability inventories | `docs/security/` |
| Find how-to guides | `docs/guides/` |
| Find historical/deprecated docs | `docs/archive/` |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-29 | Initial governance document created | Cursor AI |
| 2026-02-09 | Added `docs/security/` directory, Security/Platform document type (§4.7), registered `ANTI_ABUSE_CAPABILITIES.md` | Cursor AI |
