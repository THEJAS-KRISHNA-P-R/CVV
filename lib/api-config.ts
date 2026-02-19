/**
 * Centralized API Configuration for Nirman Smart Waste Management Portal
 * All API endpoints defined in one place for easy maintenance and updates
 */

export const API_CONFIG = {
  // Authentication endpoints
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
  },

  // Household management
  households: {
    register: '/api/households/register',
    getById: (id: string) => `/api/households/${id}`,
    update: (id: string) => `/api/households/${id}`,
    verify: (id: string) => `/api/households/${id}/verify`,
    wasteStatus: (id: string) => `/api/households/${id}/waste-status`,
    list: '/api/households/list',
  },

  // Circular Marketplace
  marketplace: {
    list: '/api/marketplace/list',
    nearby: '/api/marketplace/nearby',
    create: '/api/marketplace/create',
    getById: (id: string) => `/api/marketplace/${id}`,
    update: (id: string) => `/api/marketplace/${id}`,
    delete: (id: string) => `/api/marketplace/${id}`,
    reserve: (id: string) => `/api/marketplace/${id}/reserve`,
    search: '/api/marketplace/search',
  },

  // Real-time Chat & Messaging
  chat: {
    messages: '/api/chat/messages',
    send: '/api/chat/send',
    rooms: '/api/chat/rooms',
    conversation: (userId: string) => `/api/chat/conversation/${userId}`,
    conversations: '/api/chat/conversations',
    getRoomMessages: (roomId: string) => `/api/chat/rooms/${roomId}/messages`,
    markAsRead: '/api/chat/mark-read',
  },

  // AI Waste Segregation & Signals
  signals: {
    detect: '/api/signals/detect',
    trigger: '/api/signals/trigger',
    list: '/api/signals',
    getById: (id: string) => `/api/signals/${id}`,
    update: (id: string) => `/api/signals/${id}`,
    acknowledge: (id: string) => `/api/signals/${id}/acknowledge`,
    collect: (id: string) => `/api/signals/${id}/collect`,
    nearby: '/api/signals/nearby',
    getHistory: '/api/signals/history',
  },

  // Delivery & Logistics (HKS)
  delivery: {
    create: '/api/delivery/create',
    list: '/api/delivery/list',
    getById: (id: string) => `/api/delivery/${id}`,
    update: (id: string) => `/api/delivery/${id}`,
    assign: (id: string) => `/api/delivery/${id}/assign`,
    requestPickup: '/api/delivery/request-pickup',
    trackStatus: '/api/delivery/track',
  },

  // Analytics & Statistics
  stats: {
    user: '/api/stats/user',
    marketplace: '/api/stats/marketplace',
    signals: '/api/stats/signals',
    system: '/api/stats/system',
  },

  // Offline Sync
  sync: {
    queue: '/api/sync/queue',
    process: '/api/sync/process',
  },
} as const

/**
 * Type-safe API endpoints
 * Use this to ensure all endpoints are available
 */
export type ApiEndpoints = typeof API_CONFIG

/**
 * Supabase Realtime channels
 */
export const REALTIME_CHANNELS = {
  signals: 'signals',
  chats: 'chats',
  marketplace: 'marketplace',
  deliveries: 'delivery_tasks',
} as const

/**
 * Feature flags from environment
 */
export const FEATURES = {
  enableChat: process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true',
  enableMarketplace: process.env.NEXT_PUBLIC_ENABLE_MARKETPLACE === 'true',
  enableSegregation: process.env.NEXT_PUBLIC_ENABLE_SEGREGATION === 'true',
  enableAIDetection: process.env.NEXT_PUBLIC_ENABLE_AI_DETECTION === 'true',
} as const

/**
 * API request configuration
 */
export const REQUEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
} as const

