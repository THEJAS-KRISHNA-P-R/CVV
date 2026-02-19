# Nirman - Smart Waste Management Portal

A production-ready, mobile-first Public Citizen Portal for Smart Waste Management featuring AI-powered waste segregation, circular marketplace for building materials, real-time peer-to-peer messaging, and green credit rewards.

## Features

### Dashboard
- **Waste Ready Toggle**: Large, pulsing button to signal waste readiness for collection
- **Green Credits**: Track earned credits from proper waste segregation
- **Next Collection**: View scheduled waste collection dates
- **Quick Actions**: Shortcuts to common tasks

### Circular Marketplace
- **Facebook-style Grid**: Browse available building materials (Cement, Rebars, Bricks, Sand, Paint, Wood)
- **Fuzzy Location Display**: See items by Ward number
- **Real-time Updates**: Supabase real-time subscriptions for live inventory
- **Chat Integration**: Direct messaging with sellers

### AI Waste Segregation
- **Camera Integration**: Real-time waste detection using device camera
- **Groq AI Vision**: Classify waste as Wet, Dry, or Hazardous
- **Confidence Scoring**: ML confidence metrics for each classification
- **Smart Recommendations**: Context-specific disposal recommendations

### Real-Time Chat
- **Supabase Broadcast**: Low-latency messaging using Supabase real-time channels
- **HKS Delivery Requests**: Toggle option to request special waste pickup
- **Message Persistence**: All conversations stored in PostgreSQL
- **Typing Indicators**: Real-time presence awareness

### Internationalization
- **English & Malayalam**: Complete support for both languages
- **Mobile-first Navigation**: Bottom nav on mobile, top nav on desktop
- **Accessibility**: WCAG AA compliant with semantic HTML

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/UI
- **Components**: React Bits, 21st.dev premium components
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (Supabase or self-hosted)
- **Real-time**: Supabase Broadcast Channels
- **AI/ML**: Groq Vision API for waste detection
- **Caching**: Redis (optional, for rate limiting)
- **Containerization**: Docker & Docker Compose
- **i18n**: next-intl for multi-language support

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional, for containerized setup)
- Supabase account (for auth & database)
- Groq API key (for waste detection)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nirman
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `GROQ_API_KEY` - Your Groq API key

4. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Setup

**Development Environment:**
```bash
docker-compose -f docker-compose.dev.yml up
# App: http://localhost:3000
# Database: localhost:5432
# Redis: localhost:6379
```

**Production Environment:**
```bash
docker build -t nirman:latest .
docker-compose -f docker-compose.yml up -d
```

**Or use the provided script:**
```bash
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh dev      # Development
./scripts/docker-setup.sh prod     # Production
./scripts/docker-setup.sh stop     # Stop all
./scripts/docker-setup.sh clean    # Clean up
```

## Project Structure

```
nirman/
├── app/
│   ├── (auth)/                 # Auth routes (login, register)
│   ├── (main)/                 # Main app routes
│   │   ├── dashboard/          # Home dashboard
│   │   ├── marketplace/        # Circular marketplace
│   │   ├── chat/              # Real-time chat
│   │   ├── segregation/       # AI waste detection
│   │   └── profile/           # User profile
│   ├── api/                    # API routes
│   │   ├── households/        # Household management
│   │   ├── marketplace/       # Marketplace operations
│   │   ├── chat/             # Chat messaging
│   │   └── signals/          # AI detection endpoint
│   └── layout.tsx            # Root layout
├── components/
│   ├── dashboard/            # Dashboard widgets
│   ├── marketplace/          # Marketplace components
│   ├── chat/                 # Chat components
│   ├── navigation/           # Navigation components
│   ├── layout/              # Layout wrappers
│   └── ui/                  # Shadcn/UI components
├── lib/
│   ├── api-config.ts        # Centralized API endpoints
│   ├── groq-client.ts       # Groq AI integration
│   ├── i18n.ts             # i18n utilities
│   ├── hooks/              # Custom React hooks
│   └── supabase/           # Supabase client setup
├── public/
│   ├── locales/            # i18n JSON files (en.json, ml.json)
│   └── images/             # Static images
├── scripts/
│   ├── init-supabase.sql   # Database schema
│   └── docker-setup.sh     # Docker automation
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Development compose
├── Dockerfile              # Production container
└── Dockerfile.dev          # Development container
```

## API Endpoints

All endpoints are centralized in `lib/api-config.ts`:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Households
- `POST /api/households/register` - Register household
- `GET /api/households/[id]` - Get household details
- `PUT /api/households/[id]/waste-status` - Update waste status

### Marketplace
- `GET /api/marketplace/list` - List all items
- `POST /api/marketplace/create` - Create new listing
- `GET /api/marketplace/search` - Search items

### Chat
- `POST /api/chat/messages` - Send message
- `GET /api/chat/messages` - Fetch conversation
- `GET /api/chat/rooms` - List chat rooms

### AI Signals
- `POST /api/signals/detect` - Detect waste type from image

## Database Schema

### Tables
- `users` - User profiles and authentication
- `households` - Household information and waste status
- `marketplace` - Product listings
- `messages` - Chat messages
- `waste_detection` - Waste detection history
- `delivery_requests` - HKS delivery pickup requests
- `chat_rooms` - Chat room metadata

All tables have Row Level Security (RLS) policies enabled for data privacy.

## Color System

**Light Mode:**
- Primary: Green (#10b981)
- Secondary: Emerald (#059669)
- Background: Off-white (#f0fdf4)

**Dark Mode:**
- Primary: Light Green (#6ee7b7)
- Secondary: Teal (#2dd4bf)
- Background: Dark Green (#064e3b)

See `app/globals.css` for complete color tokens.

## Internationalization

Supports English and Malayalam through `next-intl`. Language files are in `public/locales/`:
- `en.json` - English translations
- `ml.json` - Malayalam translations

Switch languages by changing the URL prefix: `/en/dashboard` or `/ml/dashboard`

## Performance Optimizations

- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js Image component with lazy loading
- **Caching**: Supabase real-time caching for marketplace
- **Database Indexes**: Strategic indexes on frequently queried columns
- **React Compiler**: Enabled in Next.js 16 for automatic optimization

## Security

- **Row Level Security**: All database tables protected with RLS policies
- **Supabase Auth**: Industry-standard JWT-based authentication
- **HTTPS Only**: All external API calls use HTTPS
- **Input Validation**: Zod schemas for API request validation
- **Environment Variables**: Sensitive keys stored in `.env.local`

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker
```bash
docker build -t nirman:latest .
docker run -p 3000:3000 nirman:latest
```

### Self-hosted
1. Set up PostgreSQL database
2. Run `scripts/init-supabase.sql` to initialize schema
3. Build and deploy using your preferred hosting

## Environment Variables

See `.env.example` for complete list. Key variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Groq AI
GROQ_API_KEY=xxxxx

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,ml
```

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions, please:
- Open an issue on GitHub
- Contact: support@nirman.local

## Acknowledgments

- Built with Next.js 14, React 19, and Tailwind CSS
- UI components from Shadcn/UI and premium libraries
- AI powered by Groq Vision
- Database by Supabase
#   C V V  
 