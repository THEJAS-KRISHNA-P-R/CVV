# Nirman Portal - Complete Setup Guide

This guide covers everything needed to get Nirman running locally and in production.

## Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account (free tier available at supabase.com)
- Groq API key (free tier at console.groq.com)

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your credentials
nano .env.local
# or use your preferred editor
```

### 3. Install & Run
```bash
# Install dependencies
pnpm install

# Start development server
npm run dev
```

Visit http://localhost:3000 and you're done!

---

## Detailed Setup

### Step 1: Supabase Configuration

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create new organization/project
4. Save your:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

#### Initialize Database
```bash
# Run the schema initialization
psql -h <your-db-host> -U postgres -d postgres -f scripts/init-supabase.sql
```

Or use Supabase SQL editor:
1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Copy-paste contents of `scripts/init-supabase.sql`
4. Click "Run"

### Step 2: Groq AI Setup

1. Create account at [console.groq.com](https://console.groq.com)
2. Navigate to API Keys
3. Create new API key
4. Add to `.env.local`:
   ```env
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   ```

### Step 3: Environment Variables

Complete `.env.local`:
```env
# App
NEXT_PUBLIC_APP_NAME="Nirman"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxxxx"
SUPABASE_SERVICE_ROLE_KEY="xxxxx"

# Groq AI
GROQ_API_KEY="gsk_xxxxx"

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE="en"
NEXT_PUBLIC_SUPPORTED_LOCALES="en,ml"

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_MARKETPLACE=true
NEXT_PUBLIC_ENABLE_SEGREGATION=true
NEXT_PUBLIC_ENABLE_AI_DETECTION=true
```

---

## Docker Setup

### Development with Docker

```bash
# Start dev environment
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh dev

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop
./scripts/docker-setup.sh stop
```

Services:
- App: http://localhost:3000
- PostgreSQL: localhost:5432 (postgres/postgres)
- Redis: localhost:6379

### Production Deployment

```bash
# Build image
docker build -t nirman:latest .

# Run with compose
./scripts/docker-setup.sh prod

# Or manually
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -e GROQ_API_KEY=$GROQ_API_KEY \
  nirman:latest
```

### Docker Compose Services

**Development** (`docker-compose.dev.yml`):
- Next.js app with hot-reload
- PostgreSQL with init script
- Redis for caching
- Volume mounts for live editing

**Production** (`docker-compose.yml`):
- Multi-stage optimized build
- Minimal runtime image
- Separated database & cache services
- Health checks on all services

---

## Project Features Walkthrough

### 1. Dashboard (`/dashboard`)
- Waste Ready toggle with pulsing animation
- Green credits display
- Next collection date
- Quick action buttons

**Key Files:**
- `app/(main)/dashboard/page.tsx`
- `components/layout/main-layout.tsx`
- `app/globals.css` (animations)

### 2. Marketplace (`/marketplace`)
- Grid of available items (Cement, Rebars, Bricks, etc.)
- Search and filter by category
- Ward-based location display
- Chat button to contact sellers

**Key Files:**
- `app/(main)/marketplace/page.tsx`
- `app/api/marketplace/list/route.ts`
- `lib/api-config.ts` (endpoints)

### 3. AI Waste Segregation (`/segregation`)
- Camera integration for real-time detection
- Groq Vision API for classification
- Wet/Dry/Hazardous categorization
- Confidence scoring & recommendations

**Key Files:**
- `app/(main)/segregation/page.tsx`
- `app/api/signals/detect/route.ts` (Groq endpoint)
- `lib/groq-client.ts` (AI integration)
- `lib/hooks/use-waste-detection.ts` (detection hook)

### 4. Real-time Chat (`/chat`)
- Supabase Broadcast Channels for real-time messaging
- HKS Delivery request toggle
- Message persistence in PostgreSQL
- Typing indicators (presence)

**Key Files:**
- `app/(main)/chat/page.tsx`
- `app/api/chat/messages/route.ts`
- `lib/supabase/client.ts` (real-time subscriptions)

### 5. User Profile (`/profile`)
- Personal information management
- Statistics (waste collected, credits, listings)
- Account settings
- Logout functionality

**Key Files:**
- `app/(main)/profile/page.tsx`

### 6. Authentication
- Login and registration flows
- Multi-step registration with QR and location
- Supabase Auth integration (placeholder)

**Key Files:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`

---

## API Endpoints Reference

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/profile
```

### Households
```
POST   /api/households/register
GET    /api/households/list
GET    /api/households/[id]
PUT    /api/households/[id]/waste-status
```

### Marketplace
```
GET    /api/marketplace/list
POST   /api/marketplace/create
GET    /api/marketplace/[id]
DELETE /api/marketplace/[id]
GET    /api/marketplace/search
```

### Chat
```
POST   /api/chat/messages
GET    /api/chat/messages?roomId=xxx
GET    /api/chat/rooms
POST   /api/chat/mark-read
```

### AI Signals
```
POST   /api/signals/detect
GET    /api/signals/history
```

See `lib/api-config.ts` for complete endpoint definitions.

---

## Customization Guide

### Change Color Scheme

Edit `app/globals.css`:
```css
:root {
  --primary: oklch(0.55 0.17 142); /* Change this */
  --secondary: oklch(0.75 0.12 142); /* And this */
  /* ... other colors ... */
}
```

### Add New Routes

1. Create folder in `app/(main)/your-route/`
2. Add `page.tsx`
3. Use `MainLayout` component wrapper
4. Update navigation in `components/navigation/bottom-nav.tsx`

### Integrate Real Database

Replace mock endpoints in `/app/api/` with actual Supabase queries:
```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('marketplace')
    .select('*')
  return Response.json(data)
}
```

---

## Testing

### Manual Testing Checklist
- [ ] Dashboard loads without errors
- [ ] Waste Ready toggle animates
- [ ] Navigate all routes (mobile & desktop)
- [ ] Camera permission request works
- [ ] Test with different languages (EN/ML)
- [ ] Dark mode toggle works
- [ ] Responsive design on mobile

### API Testing
```bash
# Test waste detection endpoint
curl -X POST http://localhost:3000/api/signals/detect \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/waste.jpg"}'

# Test marketplace list
curl http://localhost:3000/api/marketplace/list?limit=10
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Database Connection Error
- Check `.env.local` has correct Supabase credentials
- Verify database is running: `docker-compose ps`
- Restart database: `docker-compose down && docker-compose up`

### Camera Permission Denied
- Site must be HTTPS (or localhost for testing)
- Check browser camera permissions in settings
- Mobile: Ensure app has camera permission

### Groq API Errors
- Verify API key in `.env.local`
- Check account has credits at console.groq.com
- Monitor rate limits (free tier: 30 requests/minute)

### Docker Issues
```bash
# Clean up and restart
./scripts/docker-setup.sh clean
./scripts/docker-setup.sh dev

# View detailed logs
docker-compose logs --follow
```

---

## Deployment Checklist

- [ ] All environment variables set in host
- [ ] Database schema initialized
- [ ] Supabase RLS policies verified
- [ ] Groq API key validated
- [ ] SSL/HTTPS configured
- [ ] Health checks passing
- [ ] Backup strategy in place
- [ ] Monitoring & logging setup

---

## Additional Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/UI Components](https://ui.shadcn.com)

---

## Support & Issues

For problems:
1. Check this setup guide
2. Review README.md
3. Check application logs: `docker-compose logs app`
4. Check database: Supabase dashboard → SQL Editor
5. Create GitHub issue with error details

Happy building! 🚀
