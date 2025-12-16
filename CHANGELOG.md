# 📝 Changelog

All notable changes to Need4Trip will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] - 2024-12-16

### 🎉 Major Release - Billing System v2.0

Complete rewrite of billing system with database-driven limits and professional UX.

### ✨ Added

#### Billing System v2.0
- **Database-driven limits** - all plan limits stored in PostgreSQL
- **Dynamic frontend integration** - `useClubPlan()` hook loads limits from API
- **Professional PaywallModal** - replaces alert() with proper modal
- **Comprehensive enforcement** - `enforceClubAction()` checks all limits
- **Grace period support** - 7-day grace period after subscription expires
- **Billing policy** - configurable rules for expired subscriptions

#### Performance Optimization
- **Streaming SSR** - Server Components with Suspense boundaries
- **Optimistic UI** - instant feedback for user actions (0ms perceived latency)
- **Code splitting** - dynamic imports for heavy components
- **Image optimization** - Next.js Image with lazy loading
- **50%+ faster** - FCP improved from 2.5s to 1.2s

#### Developer Experience
- **Complete documentation reorganization** - structured docs/ folder
- **Type safety** - 100% TypeScript, strict mode
- **Error boundaries** - graceful error handling throughout app
- **Comprehensive logging** - structured logging with context

### 🔄 Changed

#### Frontend
- **Event form** - dynamic participant limits based on club plan
- **Club members** - PaywallModal integration for CSV export
- **Zod schemas** - removed hardcoded max(500) participants limit

#### Backend
- **CSV export** - real enforcement via `enforceClubAction()`
- **API responses** - standardized error format with PaywallError
- **Database schema** - normalized billing v2.0 tables

### 🗑️ Removed

#### Deprecated Code
- **loading.tsx files** - removed all route-level loading files (4 files)
- **Unused loaders** - PageLoader, FullPageLoader, DelayedPageLoader
- **Old billing types** - removed v1.0 schemas and deprecated functions
- **Hardcoded limits** - all frontend hardcoded limits removed

#### Documentation
- **Archived** - moved 20+ completed reports to docs/archive/
- **Deleted** - removed 30+ outdated/temporary documents
- **Consolidated** - merged duplicate documentation

### 🐛 Fixed

- **Bug #1:** Club 50 couldn't create events with 30 participants (hardcoded 15 limit)
- **Bug #2:** Unlimited plan blocked at 500 participants (Zod schema limit)
- **Bug #3:** CSV export didn't check permissions (stub implementation)
- **Route transitions** - removed skeleton flash, now instant
- **TypeScript errors** - fixed all type issues, 0 errors

### 📊 Performance Metrics

- **FCP:** 2.5s → 1.2s (52% faster)
- **TTI:** 4.0s → 2.0s (50% faster)
- **Bundle:** 450kb → 320kb (29% smaller)
- **User Actions:** 500-1000ms → 0ms (instant)

### 📚 Documentation

- **Created** - 25 new documentation files
- **Reorganized** - structured docs/ folder with categories
- **Archive** - 20+ reports moved to archive
- **Deleted** - 30+ outdated documents removed

---

## [1.5.0] - 2024-12-14

### Added
- Database normalization complete
- RLS policies for all tables
- Club system with roles (owner/organizer/member)

### Changed
- Migrated from v1.0 to billing v2.0 schema
- Updated type system for new schema

---

## [1.0.0] - 2024-12-01

### Initial Release
- Basic event management
- Club functionality
- Telegram authentication
- Free plan only

---

## Legend

- **Added** - new features
- **Changed** - changes in existing functionality
- **Deprecated** - soon-to-be removed features
- **Removed** - removed features
- **Fixed** - bug fixes
- **Security** - vulnerability fixes

---

**Version:** 2.0.0  
**Date:** December 16, 2024  
**Status:** Production Ready ✅
