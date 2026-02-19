-- ============================================================================
-- Migration: 00008_worker_layer.sql
-- Purpose: HKS Worker Layer — collection logs, shift tracking, worker profiles
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. WORKER COLLECTIONS TABLE
--    Immutable audit log — only a worker can create a row (the citizen
--    then sees it reflected on their dashboard as "last pickup").
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS collections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  worker_id     UUID NOT NULL REFERENCES profiles(id),
  citizen_id    UUID NOT NULL REFERENCES profiles(id),

  -- What was collected
  waste_types   waste_type[] DEFAULT '{}',
  weight_kg     DECIMAL(6,2),          -- optional weight
  notes         TEXT,

  -- GPS of the worker at collection time
  collected_lat DOUBLE PRECISION,
  collected_lng DOUBLE PRECISION,

  -- Timestamps
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS collections_household_idx ON collections (household_id);
CREATE INDEX IF NOT EXISTS collections_worker_idx    ON collections (worker_id);
CREATE INDEX IF NOT EXISTS collections_citizen_idx   ON collections (citizen_id);
CREATE INDEX IF NOT EXISTS collections_date_idx      ON collections (collected_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. WORKER SHIFT TRACKING
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS worker_shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id   UUID NOT NULL REFERENCES profiles(id),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  start_lat   DOUBLE PRECISION,
  start_lng   DOUBLE PRECISION,
  end_lat     DOUBLE PRECISION,
  end_lng     DOUBLE PRECISION,
  collections_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shifts_worker_idx ON worker_shifts (worker_id, started_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ADD ward_number TO profiles (so workers are ward-locked)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ward_number INTEGER CHECK (ward_number >= 1 AND ward_number <= 55);

-- Add worker current location columns for live tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_shifts ENABLE ROW LEVEL SECURITY;

-- Collections: workers can INSERT
DROP POLICY IF EXISTS "collections_insert_worker" ON collections;
CREATE POLICY "collections_insert_worker" ON collections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('worker', 'admin')
    )
  );

-- Collections: workers + citizens who own the household can SELECT
DROP POLICY IF EXISTS "collections_select" ON collections;
CREATE POLICY "collections_select" ON collections
  FOR SELECT
  USING (
    worker_id = auth.uid()
    OR citizen_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Worker shifts: own CRUD
DROP POLICY IF EXISTS "shifts_own" ON worker_shifts;
CREATE POLICY "shifts_own" ON worker_shifts
  FOR ALL
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Admins can read all shifts
DROP POLICY IF EXISTS "shifts_admin_select" ON worker_shifts;
CREATE POLICY "shifts_admin_select" ON worker_shifts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. FUNCTION: record_collection (atomic — resets waste_ready, awards credits, logs)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_collection(
  p_household_id UUID,
  p_worker_id UUID,
  p_waste_types waste_type[] DEFAULT '{}',
  p_weight_kg DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_citizen_id UUID;
  v_collection_id UUID;
  v_freq INTEGER;
BEGIN
  -- Get citizen who owns the household
  SELECT user_id INTO v_citizen_id
  FROM households WHERE id = p_household_id;

  IF v_citizen_id IS NULL THEN
    RAISE EXCEPTION 'Household not found';
  END IF;

  -- 1) Insert collection log
  INSERT INTO collections (
    household_id, worker_id, citizen_id,
    waste_types, weight_kg, notes,
    collected_lat, collected_lng
  ) VALUES (
    p_household_id, p_worker_id, v_citizen_id,
    p_waste_types, p_weight_kg, p_notes,
    p_lat, p_lng
  ) RETURNING id INTO v_collection_id;

  -- 2) Reset waste_ready flag
  UPDATE households
  SET waste_ready = false
  WHERE id = p_household_id;

  -- 3) Update last_pickup_at + next_pickup_at
  SELECT COALESCE(pickup_frequency_days, 30) INTO v_freq
  FROM households WHERE id = p_household_id;

  UPDATE households
  SET last_pickup_at = NOW(),
      next_pickup_at = NOW() + (v_freq || ' days')::INTERVAL
  WHERE id = p_household_id;

  -- 4) Award green credits (10 base + bonus for segregation)
  UPDATE profiles
  SET green_credits = green_credits + 10
  WHERE id = v_citizen_id;

  -- 5) Increment worker shift collection count (if shift active)
  UPDATE worker_shifts
  SET collections_count = collections_count + 1
  WHERE worker_id = p_worker_id
    AND ended_at IS NULL;

  RETURN v_collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. REALTIME — publish collections for citizen dashboard live updates
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE collections;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE collections IS 'Immutable audit log of waste pickups. Only workers create rows; citizens view them.';
COMMENT ON TABLE worker_shifts IS 'Track worker active shifts for location broadcasting and analytics.';
COMMENT ON COLUMN profiles.ward_number IS 'Assigned ward for workers (1-55 Kollam). NULL for citizens.';
COMMENT ON FUNCTION record_collection IS 'Atomic one-tap collection: logs pickup, resets waste_ready, schedules next, awards credits.';
