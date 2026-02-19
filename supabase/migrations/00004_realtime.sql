-- =====================================================
-- Nirman Smart Waste Management - Realtime Configuration
-- =====================================================
-- Enable Supabase Realtime for live updates
-- Safe to run multiple times (idempotent)

-- =====================================================
-- ENABLE REALTIME ON TABLES
-- =====================================================

-- Enable realtime for signals table
-- Workers will receive live updates when residents signal "Waste Ready"
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE signals;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for chats table
-- Users receive instant message notifications
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chats;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for marketplace_items table
-- Users see new marketplace listings instantly
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for delivery_tasks table
-- Track delivery status in real-time
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tasks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- REALTIME HELPER FUNCTIONS
-- =====================================================

-- Notify workers of new signals via Realtime
CREATE OR REPLACE FUNCTION notify_new_signal()
RETURNS TRIGGER AS $$
BEGIN
  -- The insert itself will trigger Realtime
  -- This function can be extended for additional notifications
  PERFORM pg_notify(
    'new_signal',
    json_build_object(
      'signal_id', NEW.id,
      'household_id', NEW.household_id,
      'user_id', NEW.user_id,
      'waste_types', NEW.waste_types,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for signal notifications
DROP TRIGGER IF EXISTS on_signal_created ON signals;
CREATE TRIGGER on_signal_created
  AFTER INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signal();

-- Notify users of new chat messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'chat_id', NEW.id,
      'sender_id', NEW.sender_id,
      'receiver_id', NEW.receiver_id,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS on_message_created ON chats;
CREATE TRIGGER on_message_created
  AFTER INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- =====================================================
-- REALTIME SUBSCRIPTION HELPERS
-- =====================================================

-- Function to get realtime channel name for user conversations
CREATE OR REPLACE FUNCTION get_chat_channel_name(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Create deterministic channel name for two users
  -- Sort UUIDs to ensure same channel name regardless of order
  IF user1_id < user2_id THEN
    RETURN 'chat:' || user1_id::TEXT || ':' || user2_id::TEXT;
  ELSE
    RETURN 'chat:' || user2_id::TEXT || ':' || user1_id::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE signals IS 'Stores waste collection signals with Realtime enabled for worker notifications';
COMMENT ON TABLE chats IS 'Stores P2P messages with Realtime enabled for instant messaging';
COMMENT ON TABLE marketplace_items IS 'Stores marketplace listings with Realtime enabled for live feed updates';
COMMENT ON TABLE delivery_tasks IS 'Stores HKS delivery tasks with Realtime enabled for status tracking';
