-- ============================================================================
-- Migration: 00007_pickup_schedule.sql
-- Purpose: Add pickup schedule tracking to households
--   - pickup_frequency : how often the user wants collection (15 days, 1 month, 2 months, 3 months)
--   - last_pickup_at    : timestamp of the last recorded pickup
--   - next_pickup_at    : computed next pickup = last_pickup_at + frequency
-- ============================================================================

-- Add pickup_frequency_days (default 30 days = 1 month)
ALTER TABLE households
ADD COLUMN IF NOT EXISTS pickup_frequency_days INTEGER DEFAULT 30
  CHECK (pickup_frequency_days IN (15, 30, 60, 90));

-- Add last_pickup_at timestamp
ALTER TABLE households
ADD COLUMN IF NOT EXISTS last_pickup_at TIMESTAMPTZ;

-- Add next_pickup_at (computed & stored for easy querying)
ALTER TABLE households
ADD COLUMN IF NOT EXISTS next_pickup_at TIMESTAMPTZ;

-- ============================================================================
-- Function: compute and update next_pickup_at whenever frequency or last_pickup changes
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_next_pickup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_pickup_at IS NOT NULL AND NEW.pickup_frequency_days IS NOT NULL THEN
    NEW.next_pickup_at := NEW.last_pickup_at + (NEW.pickup_frequency_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compute_next_pickup ON households;
CREATE TRIGGER trigger_compute_next_pickup
  BEFORE INSERT OR UPDATE OF last_pickup_at, pickup_frequency_days
  ON households
  FOR EACH ROW
  EXECUTE FUNCTION compute_next_pickup();

-- ============================================================================
-- Index for workers to query who needs collection soon
-- ============================================================================
CREATE INDEX IF NOT EXISTS households_next_pickup_idx
  ON households (next_pickup_at)
  WHERE next_pickup_at IS NOT NULL;

-- Documentation
COMMENT ON COLUMN households.pickup_frequency_days IS 'User-selected collection interval in days. Allowed: 15, 30, 60, 90. Default 30 (1 month).';
COMMENT ON COLUMN households.last_pickup_at IS 'Timestamp when the last physical pickup was recorded by the user.';
COMMENT ON COLUMN households.next_pickup_at IS 'Auto-computed: last_pickup_at + pickup_frequency_days. Used for dashboard display and worker routing.';
