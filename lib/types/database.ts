/**
 * Database Type Definitions
 * Auto-generated types for Supabase tables and enums
 */

export type UserRole = 'citizen' | 'worker' | 'admin'

export type WasteType = 'wet' | 'dry' | 'hazardous' | 'recyclable' | 'e-waste'

export type ItemCategory = 
  | 'cement' 
  | 'rebars' 
  | 'bricks' 
  | 'tiles' 
  | 'sand' 
  | 'gravel' 
  | 'wood' 
  | 'metal' 
  | 'other'

export type SignalStatus = 'pending' | 'acknowledged' | 'collected' | 'cancelled'

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled'

export interface Profile {
  id: string
  role: UserRole
  full_name?: string
  phone?: string
  preferred_language: string
  green_credits: number
  created_at: string
  updated_at: string
}

export interface Household {
  id: string
  user_id: string
  qr_code: string
  location: { lat: number; lon: number }
  address?: string
  ward?: string
  district: string
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

export interface Signal {
  id: string
  household_id: string
  user_id: string
  waste_types: WasteType[]
  estimated_quantity?: string
  notes?: string
  status: SignalStatus
  assigned_to?: string
  acknowledged_at?: string
  collected_at?: string
  created_at: string
  updated_at: string
}

export interface MarketplaceItem {
  id: string
  user_id: string
  household_id?: string
  title: string
  description?: string
  category: ItemCategory
  quantity?: string
  price?: number
  is_free: boolean
  location?: { lat: number; lon: number }
  fuzzy_location?: string
  images: string[]
  is_available: boolean
  is_reserved: boolean
  reserved_by?: string
  views_count: number
  created_at: string
  updated_at: string
}

export interface Chat {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  marketplace_item_id?: string
  request_hks_delivery: boolean
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface DeliveryTask {
  id: string
  marketplace_item_id: string
  requester_id: string
  seller_id: string
  pickup_location?: { lat: number; lon: number }
  delivery_location?: { lat: number; lon: number }
  assigned_to?: string
  status: DeliveryStatus
  estimated_delivery?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OfflineSyncQueue {
  id: string
  user_id: string
  action_type: 'signal' | 'chat' | 'marketplace'
  payload: Record<string, any>
  is_synced: boolean
  synced_at?: string
  created_at: string
}

// Database query result types
export interface NearbyMarketplaceItem extends MarketplaceItem {
  distance_meters: number
}

export interface NearbySignal extends Signal {
  distance_meters: number
  household_address?: string
  household_ward?: string
}

export interface UserStats {
  total_signals: number
  collected_signals: number
  green_credits: number
  marketplace_items: number
  total_chats: number
}

export interface MarketplaceStats {
  total_items: number
  available_items: number
  total_value: number
  items_by_category: Record<ItemCategory, number>
}

export interface SignalStats {
  total_signals: number
  pending_signals: number
  collected_signals: number
  avg_collection_time: string
}

// API request/response types
export interface CreateHouseholdRequest {
  qr_code: string
  lat: number
  lon: number
  address?: string
  ward?: string
}

export interface CreateSignalRequest {
  household_id: string
  waste_types: WasteType[]
  estimated_quantity?: string
  notes?: string
}

export interface CreateMarketplaceItemRequest {
  title: string
  description?: string
  category: ItemCategory
  quantity?: string
  price?: number
  is_free?: boolean
  lat?: number
  lon?: number
  fuzzy_location?: string
  images?: string[]
}

export interface SendMessageRequest {
  receiver_id: string
  message: string
  marketplace_item_id?: string
  request_hks_delivery?: boolean
}

export interface CreateDeliveryTaskRequest {
  marketplace_item_id: string
  seller_id: string
  pickup_lat?: number
  pickup_lon?: number
  delivery_lat?: number
  delivery_lon?: number
  notes?: string
}
