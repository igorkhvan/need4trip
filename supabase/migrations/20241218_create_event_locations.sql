-- ============================================================================
-- Event Locations Feature - Multiple Points per Event
-- ============================================================================
-- Creates event_locations table to support multiple locations per event
-- Migrates existing location data from events table
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: Create event_locations table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL CHECK (sort_order > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  latitude NUMERIC(10, 7), -- nullable until coordinates are entered
  longitude NUMERIC(10, 7), -- nullable until coordinates are entered
  raw_input TEXT, -- stores original user input for audit/debugging
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Guarantee unique sort_order per event
  CONSTRAINT uq_event_location_sort UNIQUE(event_id, sort_order),
  
  -- Coordinate validation constraints
  CONSTRAINT chk_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT chk_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_locations_event_id 
  ON event_locations(event_id);

CREATE INDEX IF NOT EXISTS idx_event_locations_sort_order 
  ON event_locations(event_id, sort_order);

-- Enable RLS
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Same as events - public read, creator can modify
CREATE POLICY event_locations_select ON event_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_locations.event_id
      AND (
        events.visibility = 'public'
        OR events.visibility = 'unlisted'
        OR events.created_by_user_id = auth.uid()
      )
    )
  );

CREATE POLICY event_locations_insert ON event_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_locations.event_id
      AND events.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY event_locations_update ON event_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_locations.event_id
      AND events.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY event_locations_delete ON event_locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_locations.event_id
      AND events.created_by_user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- PART 2: Migrate existing location data
-- ----------------------------------------------------------------------------

-- Migrate existing location_text + coordinates to first location point
-- Only for events that don't already have locations (idempotent)
INSERT INTO event_locations (event_id, sort_order, title, latitude, longitude, raw_input)
SELECT 
  e.id AS event_id,
  1 AS sort_order,
  'Точка сбора' AS title, -- Default title in Russian
  e.location_lat AS latitude,
  e.location_lng AS longitude,
  e.location_text AS raw_input
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM event_locations el
  WHERE el.event_id = e.id AND el.sort_order = 1
)
AND e.id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- PART 3: Trigger for updated_at
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_event_locations_updated_at ON event_locations;
CREATE TRIGGER update_event_locations_updated_at
  BEFORE UPDATE ON event_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- PART 4: Comments
-- ----------------------------------------------------------------------------

COMMENT ON TABLE event_locations IS 
  'Stores multiple location points for events. Each event has at least one location (sort_order=1, "Meeting point"). Users can add unlimited additional waypoints.';

COMMENT ON COLUMN event_locations.sort_order IS 
  'Display order (1-based). First location (1) is mandatory and cannot be deleted.';

COMMENT ON COLUMN event_locations.raw_input IS 
  'Original user input string (for audit/debugging). Can be coordinates, address, or description.';

COMMENT ON COLUMN event_locations.latitude IS 
  'Latitude in decimal degrees format (DD). Range: -90 to 90. Nullable until coordinates are parsed.';

COMMENT ON COLUMN event_locations.longitude IS 
  'Longitude in decimal degrees format (DD). Range: -180 to 180. Nullable until coordinates are parsed.';

-- ----------------------------------------------------------------------------
-- PART 5: Helper function to get locations count
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_locations_count(p_event_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM event_locations
  WHERE event_id = p_event_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_event_locations_count IS 
  'Returns the number of location points for a given event.';

-- ----------------------------------------------------------------------------
-- PART 6: Validation function for first location
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_first_location_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of first location (sort_order = 1)
  IF OLD.sort_order = 1 THEN
    RAISE EXCEPTION 'Cannot delete the first location (sort_order=1). Events must have at least one location point.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_first_location_delete ON event_locations;
CREATE TRIGGER prevent_first_location_delete
  BEFORE DELETE ON event_locations
  FOR EACH ROW
  EXECUTE FUNCTION validate_first_location_exists();

COMMENT ON FUNCTION validate_first_location_exists IS 
  'Trigger function that prevents deletion of the first location point (sort_order=1) to ensure every event has at least one location.';
