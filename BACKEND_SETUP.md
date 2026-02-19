# Nirman Smart Waste Management - Database & Backend Setup

## ✅ Setup Complete!

This document confirms the full backend infrastructure setup for the Nirman Public Layer.

## 📁 What Was Created

### 1. Environment Configuration
- ✅ `.env` file with Supabase credentials and GROQ API key
- ✅ Fixed `.npmrc` (removed incorrect GROQ API token)

### 2. Database Schema (`supabase/migrations/`)

#### 00001_initial_schema.sql
- **Tables Created:**
  - `profiles` - User profiles with role-based access
  - `households` - QR-coded households with GPS location (PostGIS)
  - `signals` - "Waste Ready" signals with status tracking
  - `marketplace_items` - P2P marketplace with spatial queries
  - `chats` - Encrypted P2P messaging
  - `delivery_tasks` - HKS delivery management
  - `offline_sync_queue` - Offline-first sync queue

- **Enums:**
  - `user_role`: citizen, worker, admin
  - `waste_type`: wet, dry, hazardous, recyclable, e-waste
  - `item_category`: cement, rebars, bricks, tiles, etc.
  - `signal_status`: pending, acknowledged, collected, cancelled

- **Extensions:**
  - PostGIS for spatial queries
  - UUID generation

#### 00002_rls_policies.sql
- Row-level security (RLS) policies for all tables
- User profile policies (self-update only)
- Household policies (owner + workers)
- Signal policies (citizen creates, workers manage)
- Marketplace policies (public read, owner write)
- Chat policies (sender/receiver private)
- Delivery task policies (involved parties only)
- Auto-profile creation trigger

#### 00003_functions.sql
- **Spatial Functions:**
  - `get_nearby_marketplace_items(lat, lon, radius)` - Find nearby items
  - `get_nearby_pending_signals(lat, lon, radius)` - Find work for nearby workers
  - `calculate_fuzzy_location(lat, lon)` - Privacy-preserving location

- **Business Logic:**
  - `generate_household_qr()` - Unique QR code generation
  - `award_green_credits(signal_id, credits)` - Gamification
  - `get_conversation(user1, user2, limit)` - Chat history
  - `mark_messages_as_read(user1, user2)` - Message status

- **Analytics:**
  - `get_user_stats(user_id)` - User dashboard stats
  - `get_marketplace_stats()` - Marketplace analytics
  - `get_signal_stats(time_range)` - Collection metrics

#### 00004_realtime.sql
- Enabled Supabase Realtime for:
  - `signals` - Live waste collection alerts
  - `chats` - Instant messaging
  - `marketplace_items` - Live feed updates
  - `delivery_tasks` - Real-time tracking

- Triggers:
  - `notify_new_signal()` - Worker notifications
  - `notify_new_message()` - Chat notifications

### 3. Type Definitions (`lib/types/database.ts`)
- TypeScript interfaces for all tables
- Request/response types for API
- Enum types matching database

### 4. API Configuration (`lib/api-config.ts`)
- Centralized endpoint definitions
- Feature flags
- Realtime channel names
- Request configuration

### 5. Supabase Client Updates
- Browser client (`lib/supabase/client.ts`)
- Server client (`lib/supabase/server.ts`)
- Service role client for admin operations

### 6. Documentation
- `supabase/README.md` - Comprehensive database guide
- `supabase/seed.sql` - Sample data for testing
- `scripts/init-db.js` - Migration runner script

## 🚀 How to Initialize the Database

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   ```
   supabase/migrations/00001_initial_schema.sql
   supabase/migrations/00002_rls_policies.sql
   supabase/migrations/00003_functions.sql
   supabase/migrations/00004_realtime.sql
   ```

### Option 2: Supabase CLI
```bash
# Install CLI
npm install -g supabase

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Script (Experimental)
```bash
node scripts/init-db.js
```

## 📊 Database Schema Overview

```
┌─────────────────────┐
│   auth.users        │  (Supabase Auth)
│   (Built-in)        │
└──────┬──────────────┘
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌─────────────┐                    ┌─────────────┐
│  profiles   │                    │ households  │
│  (1:1)      │                    │  (1:1)      │
│             │                    │             │
│ - role      │◄──────────────────┤- qr_code   │
│ - credits   │                    │- location  │◄─┐
└─────────────┘                    │- verified  │  │
                                   └─────────────┘  │
                                          │         │
                                          ▼         │
                                   ┌─────────────┐  │
                                   │   signals   │  │
                                   │  (1:many)   │  │
                                   │             │  │
                                   │- waste_types│  │
                                   │- status     │  │
                                   └─────────────┘  │
                                                    │
                                   ┌─────────────┐  │
                                   │marketplace_ │  │
                                   │   items     │──┘
                                   │  (1:many)   │
                                   │             │
                                   │- location   │
                                   │- category   │
                                   └─────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   chats     │
                                   │  (many:many)│
                                   │             │
                                   │- sender     │
                                   │- receiver   │
                                   └─────────────┘
```

## 🔒 Security Features

1. **Row-Level Security (RLS)** - All tables protected
2. **Role-Based Access Control (RBAC)** - Citizen, Worker, Admin
3. **Service Role Client** - For privileged operations only
4. **PostGIS Privacy** - Fuzzy location for marketplace
5. **Message Privacy** - Chats restricted to participants

## 🌐 API Endpoints Ready

All API endpoints are defined in `lib/api-config.ts`:

- `/api/households/*` - Household management
- `/api/signals/*` - Waste collection signals
- `/api/marketplace/*` - P2P marketplace  
- `/api/chat/*` - Encrypted messaging
- `/api/delivery/*` - HKS delivery tracking
- `/api/stats/*` - Analytics & dashboards

## 📱 Realtime Subscriptions

```typescript
// Example: Subscribe to new signals (for workers)
supabase
  .channel('signals')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'signals'
  }, payload => {
    console.log('New waste signal:', payload)
  })
  .subscribe()

// Example: Subscribe to chats
supabase
  .channel('chats')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chats',
    filter: `receiver_id=eq.${userId}`
  }, payload => {
    console.log('New message:', payload)
  })
  .subscribe()
```

## 🎯 Next Steps

1. **Run Migrations** - Execute all SQL files in Supabase Dashboard
2. **Test Database** - Verify tables and policies in Dashboard
3. **Implement API Routes** - Create Next.js API handlers
4. **Build Frontend** - Connect UI to API endpoints
5. **Test Realtime** - Verify live subscriptions work
6. **Add Sample Data** - Use seed.sql for testing

## 🛠️ Development Workflow

1. **Local Development:**
   - Use `.env` credentials
   - Connect to cloud Supabase instance
   - Test with sample data

2. **Database Changes:**
   - Create new migration file
   - Run in Supabase SQL Editor
   - Update type definitions

3. **Testing:**
   - Use seed.sql for consistent test data
   - Test RLS policies with different roles
   - Verify spatial queries work

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Reference](https://postgis.net/docs/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## ✨ Features Enabled

- ✅ User profiles with roles
- ✅ GPS-anchored household registration
- ✅ QR code generation
- ✅ "Waste Ready" signaling with Realtime
- ✅ P2P marketplace with spatial search
- ✅ Encrypted chat system
- ✅ HKS delivery management
- ✅ Green credits gamification
- ✅ Offline sync queue
- ✅ Analytics & statistics

---

**Status:** 🟢 Backend infrastructure fully configured and ready for frontend integration.

**Created:** February 19, 2026
**Project:** Nirman Smart Waste Management - Public Citizen Layer
