# Nirman Portal - Architecture Reference

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19 + Next.js 14)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Dashboard   │  │  Marketplace │  │  Chat UI     │           │
│  │  (Waste      │  │  (Grid       │  │  (Messages   │           │
│  │  Toggle)     │  │  View)       │  │  + Delivery) │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Segregation │  │  Profile     │  │  Auth Pages  │           │
│  │  (AI Camera) │  │  (User Info) │  │  (Login/Reg) │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│          │                 │                │                    │
│          └─────────────────┼────────────────┘                    │
│                            │                                      │
│                   React Hooks & State                            │
│                   - useWasteDetection()                          │
│                   - useState/useEffect                           │
│                   - useRouter/usePathname                        │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              API LAYER (Next.js Route Handlers)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api/auth/          /api/households/     /api/marketplace/     │
│  ├─ register         ├─ register           ├─ list              │
│  ├─ login            ├─ [id]               ├─ create            │
│  ├─ logout           └─ [id]/waste-status  └─ search            │
│  └─ profile                                                       │
│                                                                   │
│  /api/chat/          /api/signals/                               │
│  ├─ messages         └─ detect (Groq AI)                         │
│  ├─ rooms                                                        │
│  └─ mark-read                                                    │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────┬───────────┐
        │                    │                │           │
┌───────▼────────┐  ┌────────▼──────┐  ┌─────▼────┐  ┌──▼──────┐
│   Supabase     │  │   Groq API    │  │ External │  │  Redis  │
│   (Auth/DB)    │  │   (AI Vision) │  │   APIs   │  │ (Cache) │
├────────────────┤  ├───────────────┤  └──────────┘  └─────────┘
│                │  │               │
│  ┌──────────┐  │  │  Vision Model │
│  │ postgres │  │  │  - Wet        │
│  │ (7 tables)  │  │  - Dry        │
│  └──────────┘  │  │  - Hazardous  │
│                │  │               │
│  RLS Enabled   │  │  Confidence   │
│  - users       │  │  Scoring      │
│  - households  │  │               │
│  - marketplace │  │  Recomm.      │
│  - messages    │  │  Engine       │
│  - chat_rooms  │  │               │
│  - waste_      │  │               │
│    detection   │  │               │
│  - delivery    │  │               │
│    requests    │  │               │
└────────────────┘  └───────────────┘

Real-time: Supabase Broadcast Channels
├─ Chat room:{roomId}
├─ Marketplace updates
└─ Household waste status
```

## Data Flow Examples

### 1. Waste Detection Flow
```
User Camera Input
    ↓
VideoElement → Canvas Capture
    ↓
Base64 Encode
    ↓
POST /api/signals/detect
    ↓
Groq Vision API
    ↓
JSON Response (Category, Confidence, Recommendations)
    ↓
React State Update
    ↓
UI Display (Badge, Recommendations, Save Button)
```

### 2. Real-Time Chat Flow
```
User Types Message
    ↓
POST /api/chat/messages
    ↓
Supabase PostgreSQL Save
    ↓
Broadcast Channel Emit
    ↓
Supabase Realtime Subscription
    ↓
Other User's Component Updates
    ↓
Message Appears in Chat UI
```

### 3. Marketplace Listing Flow
```
Seller Creates Item
    ↓
POST /api/marketplace/create
    ↓
Supabase PostgreSQL Insert
    ↓
Broadcast Channel Emit
    ↓
Other Users' Subscriptions Trigger
    ↓
GET /api/marketplace/list Refetch
    ↓
Grid Updates with New Item
```

## Directory Structure & Responsibility

```
nirman/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   │
│   ├── (main)/                  # Protected routes group
│   │   ├── dashboard/           # Home page
│   │   ├── marketplace/         # Trading grid
│   │   ├── chat/               # Messaging
│   │   ├── segregation/        # AI detection
│   │   ├── profile/            # User settings
│   │   └── layout.tsx
│   │
│   ├── api/                     # Backend endpoints
│   │   ├── auth/               # Authentication
│   │   ├── households/         # Household CRUD
│   │   ├── marketplace/        # Marketplace CRUD
│   │   ├── chat/              # Chat operations
│   │   └── signals/           # AI detection
│   │
│   ├── layout.tsx              # Root layout (theme, i18n)
│   ├── page.tsx               # Redirect to /dashboard
│   └── globals.css            # Global styles + animations
│
├── components/                  # React components
│   ├── dashboard/              # Dashboard widgets
│   ├── marketplace/            # Marketplace components
│   ├── chat/                  # Chat UI components
│   ├── navigation/            # Nav components
│   ├── layout/               # Layout wrappers
│   └── ui/                   # Shadcn/UI (auto-generated)
│
├── lib/                        # Utility functions
│   ├── api-config.ts          # Endpoint definitions
│   ├── groq-client.ts         # Groq AI integration
│   ├── i18n.ts               # i18n utilities
│   ├── supabase/
│   │   ├── client.ts         # Browser Supabase client
│   │   └── server.ts         # Server Supabase client
│   ├── hooks/
│   │   └── use-waste-detection.ts
│   └── utils.ts              # Utility functions (cn, etc)
│
├── public/                     # Static assets
│   ├── locales/              # Translation files
│   │   ├── en.json           # English (500+ strings)
│   │   └── ml.json           # Malayalam (500+ strings)
│   └── images/               # Images & icons
│
├── scripts/                    # Setup & utility scripts
│   ├── init-supabase.sql     # Database schema
│   └── docker-setup.sh       # Docker automation
│
├── middleware.ts              # i18n routing + auth
├── i18n.config.ts            # i18n configuration
│
├── Docker Files
│   ├── Dockerfile            # Production build
│   ├── Dockerfile.dev        # Development with hot-reload
│   ├── docker-compose.yml    # Production services
│   └── docker-compose.dev.yml # Development services
│
├── Configuration Files
│   ├── next.config.mjs       # Next.js config
│   ├── tailwind.config.ts    # Tailwind config
│   ├── tsconfig.json         # TypeScript config
│   ├── package.json          # Dependencies
│   └── .env.example          # Environment template
│
└── Documentation
    ├── README.md             # Main documentation
    ├── SETUP.md             # Setup guide
    ├── PROJECT_SUMMARY.md   # This file
    └── ARCHITECTURE.md      # Architecture diagrams
```

## Component Communication

### State Management Patterns
```
Dashboard Page
├─ useState: wasteReady, greenCredits
├─ Handler: toggleWasteReady() → API call
└─ useEffect: (future) Subscribe to Supabase updates

Marketplace Page
├─ useState: items, filters
├─ useEffect: Fetch from /api/marketplace/list
└─ (Future) Supabase subscription for real-time updates

Chat Page
├─ useState: messages, currentRoom
├─ useEffect: Subscribe to room:{roomId} channel
└─ Handler: sendMessage() → POST /api/chat/messages
```

### Custom Hooks
```
useWasteDetection()
├─ detecting: boolean
├─ result: DetectionResult | null
├─ error: string | null
├─ detectFromBase64(base64: string)
├─ detectFromUrl(url: string)
└─ reset()
```

## Authentication Flow (Placeholder)

```
User navigates to /login
    ↓
LoginPage component
    ↓
Form submission
    ↓
Supabase Auth (TODO: integrate)
    ↓
JWT token stored in cookies
    ↓
Redirect to /dashboard
    ↓
Middleware checks auth
    ↓
Access granted
```

## API Security

### Row Level Security (RLS)
```sql
-- Example: Users can only view own households
CREATE POLICY "Users can view own households"
  ON public.households FOR SELECT
  USING (auth.uid() = user_id);

-- Applied to all tables for data privacy
```

### Authentication Flow
```
Frontend Request
    ↓
Include JWT in Authorization header
    ↓
Next.js API Route verifies token
    ↓
Supabase validates JWT
    ↓
Execute query with RLS policies
    ↓
Only return data user has access to
```

## Scaling Considerations

### Current Setup
- Single PostgreSQL database
- Supabase Broadcast for real-time (30 concurrent connections)
- Groq API calls at 30 req/min (free tier)

### Future Improvements
- Database replication for read scaling
- Redis for caching frequently accessed data
- Message queue for async operations
- CDN for static assets
- Groq API upgrade for higher limits
- WebSocket instead of Broadcast for more connections

## Performance Optimizations

### Frontend
- Next.js Image optimization (lazy loading)
- Code splitting with dynamic imports
- React Compiler for automatic optimization (Next.js 16)
- Component memoization where needed

### Backend
- Database indexes on frequently queried columns
- Query optimization with selective fields
- Real-time subscriptions instead of polling
- API response caching with Redis (optional)

### Deployment
- Multi-stage Docker build (minimal final image)
- Static site generation where applicable
- CDN integration for global distribution

---

**Last Updated**: February 2025
**Architecture Version**: 1.0
**Status**: Production-Ready Foundation
