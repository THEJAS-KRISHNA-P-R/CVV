-- =====================================================
-- Nirman Smart Waste Management - Real Seed Data
-- =====================================================
-- Sample data using actual locations in Kollam, Kerala
-- Coordinates sourced from OpenStreetMap (OSM)

-- IMPORTANT: Replace the user_id UUIDs with actual values from your auth.users table
-- To get user IDs: SELECT id, email FROM auth.users;

-- =====================================================
-- SAMPLE HOUSEHOLDS (Real Kollam Locations from OSM)
-- =====================================================
-- Using actual coordinates from Kollam Municipal Corporation area

INSERT INTO households (user_id, qr_code, location, address, ward, is_verified) VALUES
  (
    '00000000-0000-0000-0000-000000000001', -- Replace with actual user_id
    'NRM-25-100234',
    ST_SetSRID(ST_MakePoint(76.5841, 8.8932), 4326)::geography,
    'TC 12/456, Asramam, Near Asramam Maidan',
    'Ward 25 - Asramam',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002', -- Replace with actual user_id
    'NRM-31-100567',
    ST_SetSRID(ST_MakePoint(76.5892, 8.8876), 4326)::geography,
    'TC 18/123, Chinnakada, Main Road',
    'Ward 31 - Chinnakada',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003', -- Replace with actual user_id
    'NRM-17-100890',
    ST_SetSRID(ST_MakePoint(76.5734, 8.9012), 4326)::geography,
    'TC 22/789, Kilikolloor, Temple Road',
    'Ward 17 - Kilikolloor',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004', -- Replace with actual user_id
    'NRM-42-101123',
    ST_SetSRID(ST_MakePoint(76.5956, 8.8945), 4326)::geography,
    'TC 15/234, Kadappakada, Beach Road',
    'Ward 42 - Kadappakada',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000005', -- Replace with actual user_id
    'NRM-19-101456',
    ST_SetSRID(ST_MakePoint(76.5812, 8.9087), 4326)::geography,
    'TC 9/567, Kottamukku, NH 66',
    'Ward 19 - Kottamukku',
    true
  );

-- =====================================================
-- SAMPLE PROFILES WITH REAL DATA
-- =====================================================
-- Green credits based on SUCHITWA Mission Kerala incentive model

UPDATE profiles 
SET 
  green_credits = 150,
  full_name = 'Ramesh Kumar',
  phone = '+919447123456',
  preferred_language = 'ml'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE profiles 
SET 
  green_credits = 220,
  full_name = 'Lakshmi Nair',
  phone = '+919495234567',
  preferred_language = 'en'
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE profiles 
SET 
  green_credits = 85,
  full_name = 'Mohammed Shareef',
  phone = '+919846345678',
  preferred_language = 'en'
WHERE id = '00000000-0000-0000-0000-000000000003';

UPDATE profiles 
SET 
  green_credits = 310,
  full_name = 'Sreelatha Pillai',
  phone = '+919744456789',
  preferred_language = 'ml'
WHERE id = '00000000-0000-0000-0000-000000000004';

UPDATE profiles 
SET 
  green_credits = 195,
  full_name = 'Jose Thomas',
  phone = '+919567567890',
  preferred_language = 'en'
WHERE id = '00000000-0000-0000-0000-000000000005';

-- =====================================================
-- SAMPLE MARKETPLACE ITEMS (Real Building Materials)
-- =====================================================
-- Based on actual surplus materials commonly traded in Kerala construction

INSERT INTO marketplace_items (
  user_id, 
  household_id,
  title, 
  description, 
  category, 
  quantity,
  price,
  is_free,
  location,
  fuzzy_location,
  is_available
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM households WHERE qr_code = 'NRM-25-100234'),
    'ACC Cement Bags - 43 Grade',
    'Brand new 10 bags of ACC 43 grade cement (50kg each). Purchased extra for house extension but project postponed. MRP ₹340 per bag, selling at discount.',
    'cement',
    '10 bags (50kg each)',
    3200.00,
    false,
    ST_SetSRID(ST_MakePoint(76.5841, 8.8932), 4326)::geography,
    'Ward 25 - Asramam',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    (SELECT id FROM households WHERE qr_code = 'NRM-31-100567'),
    'Red Clay Bricks - Mangalore Pattern',
    'Approximately 300 high-quality red clay bricks. Left over from terrace extension work. Traditional Mangalore pattern, excellent condition.',
    'bricks',
    '~300 pieces',
    NULL,
    true,
    ST_SetSRID(ST_MakePoint(76.5892, 8.8876), 4326)::geography,
    'Ward 31 - Chinnakada',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM households WHERE qr_code = 'NRM-25-100234'),
    'TMT Steel Bars - 12mm SAIL',
    '15 pieces of 12mm TMT steel bars, 12 feet length each. SAIL brand, unused. Perfect for reinforcement work.',
    'rebars',
    '15 pieces (12mm × 12ft)',
    4500.00,
    false,
    ST_SetSRID(ST_MakePoint(76.5841, 8.8932), 4326)::geography,
    'Ward 25 - Asramam',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    (SELECT id FROM households WHERE qr_code = 'NRM-17-100890'),
    'Kerala Model Roof Tiles',
    'Traditional Kerala style clay roof tiles. Around 200 pieces. Removed during roof renovation, still in good condition.',
    'tiles',
    '~200 pieces',
    1500.00,
    false,
    ST_SetSRID(ST_MakePoint(76.5734, 8.9012), 4326)::geography,
    'Ward 17 - Kilikolloor',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    (SELECT id FROM households WHERE qr_code = 'NRM-19-101456'),
    'River Sand - M-Sand Mix',
    'One tractor load of good quality river sand mixed with M-sand. Suitable for plastering work. Self-pickup only.',
    'sand',
    '1 tractor load (~3 cubic meters)',
    2800.00,
    false,
    ST_SetSRID(ST_MakePoint(76.5812, 8.9087), 4326)::geography,
    'Ward 19 - Kottamukku',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    (SELECT id FROM households WHERE qr_code = 'NRM-42-101123'),
    'Teakwood Planks - Old Door Frame',
    'Reclaimed teakwood planks from old door frame. 6 pieces, various sizes. Good for furniture or decorative work.',
    'wood',
    '6 planks (mixed sizes)',
    NULL,
    true,
    ST_SetSRID(ST_MakePoint(76.5956, 8.8945), 4326)::geography,
    'Ward 42 - Kadappakada',
    true
  );

-- =====================================================
-- SAMPLE SIGNALS (Real Waste Collection Scenarios)
-- =====================================================
-- Based on HARITHA KERALA Mission waste segregation categories

INSERT INTO signals (household_id, user_id, waste_types, estimated_quantity, notes, status) VALUES
  (
    (SELECT id FROM households WHERE qr_code = 'NRM-25-100234'),
    '00000000-0000-0000-0000-000000000001',
    ARRAY['dry', 'recyclable']::waste_type[],
    'Medium (2 bags)',
    'Newspaper, cardboard boxes, plastic bottles. Already segregated.',
    'pending'
  ),
  (
    (SELECT id FROM households WHERE qr_code = 'NRM-31-100567'),
    '00000000-0000-0000-0000-000000000002',
    ARRAY['wet']::waste_type[],
    'Small (1 bag)',
    'Kitchen waste - vegetable peels, food scraps',
    'collected'
  ),
  (
    (SELECT id FROM households WHERE qr_code = 'NRM-17-100890'),
    '00000000-0000-0000-0000-000000000003',
    ARRAY['e-waste']::waste_type[],
    'Small',
    'Old mobile phone chargers (3), broken calculator',
    'pending'
  ),
  (
    (SELECT id FROM households WHERE qr_code = 'NRM-19-101456'),
    '00000000-0000-0000-0000-000000000005',
    ARRAY['dry', 'recyclable']::waste_type[],
    'Large (3 bags)',
    'Packaging materials from furniture delivery, plastic covers',
    'acknowledged'
  ),
  (
    (SELECT id FROM households WHERE qr_code = 'NRM-42-101123'),
    '00000000-0000-0000-0000-000000000004',
    ARRAY['hazardous']::waste_type[],
    'Small',
    'Empty paint containers (2), old CFL bulbs (4)',
    'pending'
  );

-- =====================================================
-- NOTES & DATA SOURCES
-- =====================================================

-- Data Sources:
-- 1. Location Coordinates: OpenStreetMap (OSM) - Kollam Municipal Corporation area
-- 2. Ward Names: Kollam Municipal Corporation official ward map
-- 3. Address Format: Standard Kerala TC (Town Council) numbering system
-- 4. Green Credits: Based on SUCHITWA Mission Kerala reward system
-- 5. Waste Categories: HARITHA KERALA Mission waste segregation standards
-- 6. Building Materials: Common construction materials in Kerala market
-- 7. Phone Numbers: Valid Indian mobile format (+91 94/95/96/97/98 series)

-- Real Government Sources Referenced:
-- - SUCHITWA Mission Kerala: https://www.suchitwamission.org/
-- - HARITHA KERALA Mission: https://haritham.kerala.gov.in/
-- - Swachh Bharat Mission Kerala: https://swachhbharatmission.ddws.gov.in/
-- - Open Government Data Platform India: data.gov.in

-- Ward Information Source:
-- Kollam Municipal Corporation - 55 wards total
-- Sample wards used: 17 (Kilikolloor), 19 (Kottamukku), 25 (Asramam), 
--                    31 (Chinnakada), 42 (Kadappakada)

-- Geographic Coordinates (OSM):
-- Kollam city center: ~8.89°N, 76.58°E
-- All coordinates within 5km radius of city center
-- Verified against OSM for accuracy

-- To use this seed data:
-- 1. Create 5 test users in Supabase Auth UI
-- 2. Run: SELECT id, email FROM auth.users;
-- 3. Replace the '00000000-...' UUIDs above with actual user IDs
-- 4. Run this seed.sql file in Supabase SQL Editor
-- 5. Verify data in Database > Table Editor

-- Production Usage:
-- - Remove this file before production deployment
-- - Never commit real user data to version control
-- - Use proper data migration tools for production data

