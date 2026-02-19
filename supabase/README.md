# Supabase Database Setup

This directory contains database migrations and configuration for the Nirman Smart Waste Management system.

## Directory Structure

```
supabase/
├── migrations/
│   ├── 00001_initial_schema.sql    # Core tables and schemas
│   ├── 00002_rls_policies.sql      # Row-level security policies
│   ├── 00003_functions.sql         # Utility functions
│   └── 00004_realtime.sql          # Realtime configuration
└── seed.sql                         # Sample data for development
```

## Database Schema

### Core Tables

1. **profiles** - User profiles linked to auth.users
2. **households** - Household registration with GPS coordinates
3. **signals** - "Waste Ready" signals from residents
4. **marketplace_items** - P2P marketplace for building materials
5. **chats** - Encrypted messaging between users
6. **delivery_tasks** - HKS delivery task management
7. **offline_sync_queue** - Offline-first sync queue

### Key Features

- **PostGIS Integration**: Spatial queries for nearby items and signals
- **Row-Level Security (RLS)**: Fine-grained access control
- **Realtime**: Live updates for signals, chats, and marketplace
- **Role-Based Access**: Support for citizen, worker, and admin roles

## Setup Instructions

### Option 1: Supabase Cloud Dashboard

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run each migration file in order:
   ```
   00001_initial_schema.sql
   00002_rls_policies.sql
   00003_functions.sql
   00004_realtime.sql
   ```
4. Optionally run `seed.sql` for test data

### Option 2: Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Push migrations:
   ```bash
   supabase db push
   ```

### Option 3: Direct SQL Execution

```bash
# Set environment variables
export SUPABASE_URL="your-project-url"
export SUPABASE_SERVICE_KEY="your-service-role-key"

# Run migrations (requires psql or similar)
psql $DATABASE_URL -f supabase/migrations/00001_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/00002_rls_policies.sql
psql $DATABASE_URL -f supabase/migrations/00003_functions.sql
psql $DATABASE_URL -f supabase/migrations/00004_realtime.sql
```

## Environment Variables

Ensure these are set in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Key Functions

### Spatial Queries

- `get_nearby_marketplace_items(lat, lon, radius)` - Find items within radius
- `get_nearby_pending_signals(lat, lon, radius)` - Find pending signals for workers

### Business Logic

- `generate_household_qr()` - Generate unique QR code for household
- `award_green_credits(signal_id, credits)` - Award credits for collection
- `get_conversation(user1, user2, limit)` - Fetch chat history
- `mark_messages_as_read(user1, user2)` - Mark messages as read

### Analytics

- `get_user_stats(user_id)` - Get user statistics
- `get_marketplace_stats()` - Get marketplace statistics
- `get_signal_stats(time_range)` - Get signal statistics

## Row-Level Security (RLS)

All tables have RLS enabled with policies:

- **profiles**: Users can update their own profile
- **households**: Users can CRUD their own, workers can verify any
- **signals**: Users create their own, workers can view/update all
- **marketplace_items**: Public read, owner-only write
- **chats**: Strictly private to sender and receiver
- **delivery_tasks**: Visible to involved parties and workers

## Realtime Subscriptions

### Signals (for Workers)

```typescript
supabase
  .channel('signals')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'signals' },
    (payload) => console.log('New signal:', payload)
  )
  .subscribe()
```

### Chats (for Users)

```typescript
supabase
  .channel('chats')
  .on('postgres_changes',
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'chats',
      filter: `receiver_id=eq.${userId}`
    },
    (payload) => console.log('New message:', payload)
  )
  .subscribe()
```

### Marketplace (for Feed)

```typescript
supabase
  .channel('marketplace')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'marketplace_items' },
    (payload) => console.log('Marketplace update:', payload)
  )
  .subscribe()
```

## PostGIS Queries

### Finding Nearby Items

```sql
SELECT * FROM get_nearby_marketplace_items(8.8932, 76.5841, 5000);
```

### Finding Nearby Signals (for Workers)

```sql
SELECT * FROM get_nearby_pending_signals(8.8932, 76.5841, 10000);
```

## Migration Safety

All migrations are **idempotent** - safe to run multiple times:

- Uses `IF NOT EXISTS` for tables and extensions
- Uses `DO $$` blocks for custom types
- Checks for existing policies before creating
- Safely handles trigger recreation

## Testing

1. Run migrations in local Supabase instance
2. Create test users via Auth UI
3. Update `seed.sql` with user IDs
4. Run seed script
5. Test API endpoints with sample data

## Production Checklist

- [ ] Run all migrations in production database
- [ ] Verify RLS policies are enabled on all tables
- [ ] Test spatial queries with real coordinates
- [ ] Set up database backups
- [ ] Enable Realtime on required tables
- [ ] Monitor PostGIS performance
- [ ] Set up database connection pooling
- [ ] Review and optimize indexes

## Troubleshooting

### PostGIS Not Enabled

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### RLS Preventing Queries

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Disable RLS temporarily for testing (NOT for production)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Realtime Not Working

1. Check if table is added to publication:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. Add table if missing:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
   ```

## Support

For more information:
- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
