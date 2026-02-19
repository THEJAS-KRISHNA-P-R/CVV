-- Migration: Home Anchor System
-- Replaces government QR/K-SMART system with user-driven GPS pin-drop
-- Version: 00006

-- ============================================================================
-- 1. MODIFY HOUSEHOLDS TABLE FOR INDEPENDENT LOCATION ANCHORING
-- ============================================================================

-- Drop the government QR requirement
ALTER TABLE households 
DROP COLUMN IF EXISTS qr_code;

-- Add nickname for friendly house name
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT 'My House';

-- Add manual address field (primary text reference for workers)
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS manual_address TEXT;

-- Add reverse geocoded address from Nominatim
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS geocoded_address TEXT;

-- Add waste_ready flag for "Digital Bell" signal
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS waste_ready BOOLEAN DEFAULT false;

-- Add ward number (1-55 for Kollam)
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS ward_number INTEGER CHECK (ward_number >= 1 AND ward_number <= 55);

-- Add last location update timestamp
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- ============================================================================
-- 2. CREATE SPATIAL INDEX FOR ROUTE OPTIMIZATION
-- ============================================================================

-- GIST index for worker's ST_Distance queries
CREATE INDEX IF NOT EXISTS households_location_gist_idx 
ON households USING GIST (location);

-- Index for ward-based queries
CREATE INDEX IF NOT EXISTS households_ward_idx 
ON households (ward_number);

-- Index for waste_ready status (workers need to find ready households quickly)
CREATE INDEX IF NOT EXISTS households_waste_ready_idx 
ON households (waste_ready) WHERE waste_ready = true;

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR GEOSPATIAL OPERATIONS
-- ============================================================================

-- Function to find nearest households to a worker's position
CREATE OR REPLACE FUNCTION find_nearest_households(
  worker_lng DOUBLE PRECISION,
  worker_lat DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 500,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  household_id UUID,
  user_id UUID,
  nickname TEXT,
  manual_address TEXT,
  waste_ready BOOLEAN,
  ward_number INTEGER,
  distance_meters DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id AS household_id,
    h.user_id,
    h.nickname,
    h.manual_address,
    h.waste_ready,
    h.ward_number,
    ST_Distance(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography
    ) AS distance_meters,
    ST_Y(h.location::geometry) AS lat,
    ST_X(h.location::geometry) AS lng
  FROM households h
  WHERE h.location IS NOT NULL
    AND ST_DWithin(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT max_results;
END;
$$;

-- Function to find waste-ready households near worker
CREATE OR REPLACE FUNCTION find_waste_ready_households(
  worker_lng DOUBLE PRECISION,
  worker_lat DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 1000
)
RETURNS TABLE (
  household_id UUID,
  nickname TEXT,
  manual_address TEXT,
  ward_number INTEGER,
  distance_meters DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id AS household_id,
    h.nickname,
    h.manual_address,
    h.ward_number,
    ST_Distance(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography
    ) AS distance_meters,
    ST_Y(h.location::geometry) AS lat,
    ST_X(h.location::geometry) AS lng
  FROM households h
  WHERE h.location IS NOT NULL
    AND h.waste_ready = true
    AND ST_DWithin(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$;

-- ============================================================================
-- 4. RLS POLICIES FOR HOUSEHOLD LOCATION
-- ============================================================================

-- Users can update their own household's waste_ready status
CREATE POLICY "Users can toggle waste ready" ON households
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workers can view all household locations for routing
CREATE POLICY "Workers can view household locations" ON households
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'worker'
    )
  );

-- ============================================================================
-- 5. REALTIME SUBSCRIPTION FOR WASTE READY SIGNALS
-- ============================================================================

-- Trigger to broadcast waste_ready changes to workers
CREATE OR REPLACE FUNCTION broadcast_waste_ready_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.waste_ready IS DISTINCT FROM OLD.waste_ready THEN
    PERFORM pg_notify(
      'waste_ready_change',
      json_build_object(
        'household_id', NEW.id,
        'waste_ready', NEW.waste_ready,
        'ward_number', NEW.ward_number,
        'lat', ST_Y(NEW.location::geometry),
        'lng', ST_X(NEW.location::geometry)
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waste_ready_broadcast ON households;
CREATE TRIGGER waste_ready_broadcast
  AFTER UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_waste_ready_change();

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN households.nickname IS 'User-friendly name for the location (e.g., "Home", "Office")';
COMMENT ON COLUMN households.manual_address IS 'User-entered address string - primary reference for workers';
COMMENT ON COLUMN households.geocoded_address IS 'Auto-filled address from Nominatim reverse geocoding';
COMMENT ON COLUMN households.waste_ready IS 'Digital Bell signal - indicates waste is ready for collection';
COMMENT ON COLUMN households.ward_number IS 'Kollam ward number (1-55) for zone-based routing';
COMMENT ON COLUMN households.location_updated_at IS 'Timestamp of last location pin update';
COMMENT ON FUNCTION find_nearest_households IS 'Find households within radius of worker position for route optimization';
COMMENT ON FUNCTION find_waste_ready_households IS 'Find waste-ready households for worker pickup queue';
