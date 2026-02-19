-- =====================================================
-- Nirman Smart Waste Management - RLS Policies
-- =====================================================
-- Row-Level Security policies for data access control
-- Safe to run multiple times (idempotent)

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view all profiles (public info only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_policy'
  ) THEN
    CREATE POLICY profiles_select_policy ON profiles
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Users can only insert their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_policy'
  ) THEN
    CREATE POLICY profiles_insert_policy ON profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Users can only update their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_policy'
  ) THEN
    CREATE POLICY profiles_update_policy ON profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- =====================================================
-- HOUSEHOLDS TABLE POLICIES
-- =====================================================

-- Users can view all households (for map display)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'households' AND policyname = 'households_select_policy'
  ) THEN
    CREATE POLICY households_select_policy ON households
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Users can only insert their own household
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'households' AND policyname = 'households_insert_policy'
  ) THEN
    CREATE POLICY households_insert_policy ON households
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own household, workers can verify any household
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'households' AND policyname = 'households_update_policy'
  ) THEN
    CREATE POLICY households_update_policy ON households
      FOR UPDATE
      USING (
        auth.uid() = user_id OR 
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('worker', 'admin')
        )
      )
      WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('worker', 'admin')
        )
      );
  END IF;
END $$;

-- =====================================================
-- SIGNALS TABLE POLICIES
-- =====================================================

-- Users can view their own signals, workers/admins can view all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'signals' AND policyname = 'signals_select_policy'
  ) THEN
    CREATE POLICY signals_select_policy ON signals
      FOR SELECT
      USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('worker', 'admin')
        )
      );
  END IF;
END $$;

-- Users can only insert their own signals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'signals' AND policyname = 'signals_insert_policy'
  ) THEN
    CREATE POLICY signals_insert_policy ON signals
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own signals, workers can update assigned signals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'signals' AND policyname = 'signals_update_policy'
  ) THEN
    CREATE POLICY signals_update_policy ON signals
      FOR UPDATE
      USING (
        auth.uid() = user_id OR
        auth.uid() = assigned_to OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('worker', 'admin')
        )
      );
  END IF;
END $$;

-- =====================================================
-- MARKETPLACE_ITEMS TABLE POLICIES
-- =====================================================

-- Everyone can view available marketplace items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_items' AND policyname = 'marketplace_items_select_policy'
  ) THEN
    CREATE POLICY marketplace_items_select_policy ON marketplace_items
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Users can insert their own items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_items' AND policyname = 'marketplace_items_insert_policy'
  ) THEN
    CREATE POLICY marketplace_items_insert_policy ON marketplace_items
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can only update their own items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_items' AND policyname = 'marketplace_items_update_policy'
  ) THEN
    CREATE POLICY marketplace_items_update_policy ON marketplace_items
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_items' AND policyname = 'marketplace_items_delete_policy'
  ) THEN
    CREATE POLICY marketplace_items_delete_policy ON marketplace_items
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================
-- CHATS TABLE POLICIES
-- =====================================================

-- Users can only view chats where they are sender or receiver
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'chats_select_policy'
  ) THEN
    CREATE POLICY chats_select_policy ON chats
      FOR SELECT
      USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
      );
  END IF;
END $$;

-- Users can only send messages as themselves
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'chats_insert_policy'
  ) THEN
    CREATE POLICY chats_insert_policy ON chats
      FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

-- Users can update messages they sent (e.g., mark as edited)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'chats_update_policy'
  ) THEN
    CREATE POLICY chats_update_policy ON chats
      FOR UPDATE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;

-- =====================================================
-- DELIVERY_TASKS TABLE POLICIES
-- =====================================================

-- Users can view delivery tasks where they are involved
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_tasks' AND policyname = 'delivery_tasks_select_policy'
  ) THEN
    CREATE POLICY delivery_tasks_select_policy ON delivery_tasks
      FOR SELECT
      USING (
        auth.uid() = requester_id OR
        auth.uid() = seller_id OR
        auth.uid() = assigned_to OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('worker', 'admin')
        )
      );
  END IF;
END $$;

-- Users can create delivery tasks as requester
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_tasks' AND policyname = 'delivery_tasks_insert_policy'
  ) THEN
    CREATE POLICY delivery_tasks_insert_policy ON delivery_tasks
      FOR INSERT
      WITH CHECK (auth.uid() = requester_id);
  END IF;
END $$;

-- Workers and admins can update delivery tasks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_tasks' AND policyname = 'delivery_tasks_update_policy'
  ) THEN
    CREATE POLICY delivery_tasks_update_policy ON delivery_tasks
      FOR UPDATE
      USING (
        auth.uid() = assigned_to OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('worker', 'admin')
        )
      );
  END IF;
END $$;

-- =====================================================
-- OFFLINE_SYNC_QUEUE TABLE POLICIES
-- =====================================================

-- Users can only view their own sync queue
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offline_sync_queue' AND policyname = 'offline_sync_queue_select_policy'
  ) THEN
    CREATE POLICY offline_sync_queue_select_policy ON offline_sync_queue
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can only insert to their own sync queue
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offline_sync_queue' AND policyname = 'offline_sync_queue_insert_policy'
  ) THEN
    CREATE POLICY offline_sync_queue_insert_policy ON offline_sync_queue
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own sync queue
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offline_sync_queue' AND policyname = 'offline_sync_queue_update_policy'
  ) THEN
    CREATE POLICY offline_sync_queue_update_policy ON offline_sync_queue
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own synced items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offline_sync_queue' AND policyname = 'offline_sync_queue_delete_policy'
  ) THEN
    CREATE POLICY offline_sync_queue_delete_policy ON offline_sync_queue
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================
-- PROFILE CREATION TRIGGER
-- =====================================================
-- Automatically create a profile when a new user signs up

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, preferred_language)
  VALUES (
    NEW.id,
    'citizen',
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
