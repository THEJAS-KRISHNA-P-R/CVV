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
  qr_code?: string // Optional - deprecated in favor of GPS anchoring
  location: { lat: number; lon: number } | string // PostGIS POINT or GeoJSON
  address?: string
  ward?: string
  district: string
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  // New Home Anchor fields
  nickname?: string
  manual_address?: string
  geocoded_address?: string
  waste_ready?: boolean
  ward_number?: number
  location_updated_at?: string
  created_at: string
  updated_at: string
}

// Home Anchor Location Types
export interface GeoCoordinates {
  lat: number
  lng: number
}

export interface HouseholdLocation {
  id: string
  userId: string
  nickname: string
  manualAddress: string | null
  geocodedAddress: string | null
  wasteReady: boolean
  wardNumber: number | null
  location: GeoCoordinates
  locationUpdatedAt: string | null
  createdAt: string
}

// Nearest Household (from PostGIS query)
export interface NearestHousehold {
  householdId: string
  userId: string
  nickname: string
  manualAddress: string | null
  wasteReady: boolean
  wardNumber: number | null
  distanceMeters: number
  lat: number
  lng: number
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

// ===========================================
// CITIZEN LAYER TYPES
// Public Citizen Layer features
// ===========================================

export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export type ReportCategory = 
  | 'dumping' 
  | 'overflow' 
  | 'hazardous' 
  | 'construction_debris' 
  | 'dead_animal' 
  | 'other'

export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'rejected'

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'waived'

export interface PublicReport {
  id: string
  reporter_id: string
  photo_url: string
  location: { lat: number; lon: number }
  ward?: number
  category: ReportCategory
  description?: string
  severity: number // 1-5
  status: ReportStatus
  assigned_to?: string
  resolved_at?: string
  resolution_notes?: string
  resolution_photo_url?: string
  created_at: string
  updated_at: string
}

export interface UserPayment {
  id: string
  household_id: string
  amount: number
  month: number
  year: number
  status: PaymentStatus
  transaction_ref?: string
  payment_method?: string
  paid_at?: string
  collected_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Extended household with verification fields
export interface HouseholdWithVerification extends Household {
  verification_status: VerificationStatus
  anchored_at?: string
  anchored_by?: string
  rejection_reason?: string
}

// Blackspot report request
export interface CreateBlackspotReportRequest {
  photo: string // Base64 encoded
  latitude: number
  longitude: number
  category: ReportCategory
  description?: string
  severity?: number
}

// Payment status response
export interface PaymentStatusData {
  household_id: string
  current_month: {
    month: number
    year: number
    month_name: string
    amount: number
    status: PaymentStatus
    due_date: string
  }
  summary: {
    total_pending: number
    total_overdue: number
    total_paid_this_year: number
    last_payment_date: string | null
  }
  history: UserPayment[]
}

// Household verification status response
export interface HouseholdStatusData {
  household_id: string
  qr_code: string
  verification_status: VerificationStatus
  can_signal: boolean
  anchored_at: string | null
  anchored_by_name: string | null
  rejection_reason: string | null
  ward: number | null
  tc_address: string | null
}

// Nearby blackspot for workers
export interface NearbyBlackspot {
  id: string
  photo_url: string
  category: ReportCategory
  description?: string
  severity: number
  status: ReportStatus
  reporter_name: string
  created_at: string
  distance_meters: number
  latitude: number
  longitude: number
}

