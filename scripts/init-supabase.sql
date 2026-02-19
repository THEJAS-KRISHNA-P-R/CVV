-- Nirman Smart Waste Management Portal - Database Schema
-- Initialize with required tables and relationships

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  green_credits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Households Table
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE,
  location_coordinates JSONB,
  ward_number INTEGER,
  waste_ready_status BOOLEAN DEFAULT FALSE,
  total_waste_collected FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace Products Table
CREATE TABLE IF NOT EXISTS public.marketplace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Cement', 'Rebars', 'Bricks', 'Sand', 'Paint', 'Wood', 'Other')),
  description TEXT,
  location_ward INTEGER,
  images JSONB DEFAULT '[]'::jsonb,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  content TEXT NOT NULL,
  hks_delivery_requested BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waste Segregation History Table
CREATE TABLE IF NOT EXISTS public.waste_detection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Wet', 'Dry', 'Hazardous')),
  confidence FLOAT,
  details TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Requests Table
CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Rooms Table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id TEXT PRIMARY KEY,
  user_1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_households_user_id ON public.households(user_id);
CREATE INDEX IF NOT EXISTS idx_households_waste_status ON public.households(waste_ready_status);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_id ON public.marketplace(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_ward ON public.marketplace(location_ward);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waste_detection_user_id ON public.waste_detection(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_detection_household_id ON public.waste_detection(household_id);
CREATE INDEX IF NOT EXISTS idx_delivery_user_id ON public.delivery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON public.delivery_requests(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for Households
CREATE POLICY "Users can view own households"
  ON public.households FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own households"
  ON public.households FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for Marketplace
CREATE POLICY "Anyone can view marketplace"
  ON public.marketplace FOR SELECT
  USING (is_available = true);

CREATE POLICY "Users can create marketplace listings"
  ON public.marketplace FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own listings"
  ON public.marketplace FOR UPDATE
  USING (auth.uid() = seller_id);

-- RLS Policies for Messages
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for Waste Detection
CREATE POLICY "Users can view own waste history"
  ON public.waste_detection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create waste records"
  ON public.waste_detection FOR INSERT
  WITH CHECK (auth.uid() = user_id);
