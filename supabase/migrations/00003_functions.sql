-- =====================================================
-- Nirman Smart Waste Management - Utility Functions
-- =====================================================
-- Helper functions for spatial queries and business logic
-- Safe to run multiple times (idempotent)

-- =====================================================
-- SPATIAL QUERY FUNCTIONS
-- =====================================================

-- Get nearby marketplace items within a radius (in meters)
CREATE OR REPLACE FUNCTION get_nearby_marketplace_items(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category item_category,
  quantity TEXT,
  price DECIMAL(10, 2),
  is_free BOOLEAN,
  fuzzy_location TEXT,
  distance_meters DOUBLE PRECISION,
  user_id UUID,
  images TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.title,
    mi.description,
    mi.category,
    mi.quantity,
    mi.price,
    mi.is_free,
    mi.fuzzy_location,
    ST_Distance(
      mi.location,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) AS distance_meters,
    mi.user_id,
    mi.images,
    mi.created_at
  FROM marketplace_items mi
  WHERE 
    mi.is_available = true
    AND ST_DWithin(
      mi.location,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get nearby pending signals for workers
CREATE OR REPLACE FUNCTION get_nearby_pending_signals(
  worker_lat DOUBLE PRECISION,
  worker_lon DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 10000
)
RETURNS TABLE (
  id UUID,
  household_id UUID,
  user_id UUID,
  waste_types waste_type[],
  estimated_quantity TEXT,
  notes TEXT,
  status signal_status,
  distance_meters DOUBLE PRECISION,
  household_address TEXT,
  household_ward TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.household_id,
    s.user_id,
    s.waste_types,
    s.estimated_quantity,
    s.notes,
    s.status,
    ST_Distance(
      h.location,
      ST_SetSRID(ST_MakePoint(worker_lon, worker_lat), 4326)::geography
    ) AS distance_meters,
    h.address,
    h.ward,
    s.created_at
  FROM signals s
  JOIN households h ON s.household_id = h.id
  WHERE 
    s.status = 'pending'
    AND ST_DWithin(
      h.location,
      ST_SetSRID(ST_MakePoint(worker_lon, worker_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Generate unique QR code for household
CREATE OR REPLACE FUNCTION generate_household_qr()
RETURNS TEXT AS $$
DECLARE
  qr_code TEXT;
  qr_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate QR code format: NRM-WARD-XXXXXX
    qr_code := 'NRM-' || 
               LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0') || '-' ||
               LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if QR code already exists
    SELECT EXISTS(SELECT 1 FROM households WHERE qr_code = qr_code) INTO qr_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT qr_exists;
  END LOOP;
  
  RETURN qr_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Award green credits for waste collection
CREATE OR REPLACE FUNCTION award_green_credits(
  signal_id UUID,
  credits INTEGER DEFAULT 10
)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user_id from the signal
  SELECT user_id INTO target_user_id
  FROM signals
  WHERE id = signal_id;
  
  -- Award credits to the user
  UPDATE profiles
  SET green_credits = green_credits + credits
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Get conversation between two users
CREATE OR REPLACE FUNCTION get_conversation(
  user1_id UUID,
  user2_id UUID,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  message TEXT,
  marketplace_item_id UUID,
  request_hks_delivery BOOLEAN,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.sender_id,
    c.receiver_id,
    c.message,
    c.marketplace_item_id,
    c.request_hks_delivery,
    c.is_read,
    c.created_at
  FROM chats c
  WHERE 
    (c.sender_id = user1_id AND c.receiver_id = user2_id)
    OR (c.sender_id = user2_id AND c.receiver_id = user1_id)
  ORDER BY c.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  user1_id UUID,
  user2_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE chats
  SET is_read = true, read_at = NOW()
  WHERE 
    sender_id = user2_id 
    AND receiver_id = user1_id 
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
  total_signals INTEGER,
  collected_signals INTEGER,
  green_credits INTEGER,
  marketplace_items INTEGER,
  total_chats INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM signals WHERE user_id = target_user_id),
    (SELECT COUNT(*)::INTEGER FROM signals WHERE user_id = target_user_id AND status = 'collected'),
    (SELECT green_credits FROM profiles WHERE id = target_user_id),
    (SELECT COUNT(*)::INTEGER FROM marketplace_items WHERE user_id = target_user_id AND is_available = true),
    (SELECT COUNT(*)::INTEGER FROM chats WHERE sender_id = target_user_id OR receiver_id = target_user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Calculate fuzzy location from coordinates
CREATE OR REPLACE FUNCTION calculate_fuzzy_location(
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
)
RETURNS TEXT AS $$
DECLARE
  ward_name TEXT;
BEGIN
  -- Find the nearest ward (this is a simplified version)
  -- In production, you'd query against a wards table
  SELECT ward INTO ward_name
  FROM households
  WHERE location IS NOT NULL
  ORDER BY ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
  ) ASC
  LIMIT 1;
  
  RETURN COALESCE(ward_name, 'Ward Unknown');
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Get marketplace statistics
CREATE OR REPLACE FUNCTION get_marketplace_stats()
RETURNS TABLE (
  total_items INTEGER,
  available_items INTEGER,
  total_value DECIMAL(10, 2),
  items_by_category JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_items,
    COUNT(*) FILTER (WHERE is_available = true)::INTEGER AS available_items,
    SUM(price)::DECIMAL(10, 2) AS total_value,
    jsonb_object_agg(
      category, 
      COUNT(*)
    ) AS items_by_category
  FROM marketplace_items;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get signal statistics
CREATE OR REPLACE FUNCTION get_signal_stats(time_range INTERVAL DEFAULT '7 days')
RETURNS TABLE (
  total_signals INTEGER,
  pending_signals INTEGER,
  collected_signals INTEGER,
  avg_collection_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_signals,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_signals,
    COUNT(*) FILTER (WHERE status = 'collected')::INTEGER AS collected_signals,
    AVG(collected_at - created_at) AS avg_collection_time
  FROM signals
  WHERE created_at >= NOW() - time_range;
END;
$$ LANGUAGE plpgsql STABLE;
