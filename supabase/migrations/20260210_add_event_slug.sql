-- Migration: Add slug column to events table
-- Per SSOT_SEO.md §3.1: slug-based URLs for events
-- Clean slate: table is empty, so NOT NULL can be applied immediately

-- 1. Add slug column
ALTER TABLE events ADD COLUMN slug TEXT NOT NULL DEFAULT '';

-- 2. Remove default (only needed for migration safety)
ALTER TABLE events ALTER COLUMN slug DROP DEFAULT;

-- 3. Unique index (case-insensitive)
CREATE UNIQUE INDEX events_slug_idx ON events (LOWER(slug));
