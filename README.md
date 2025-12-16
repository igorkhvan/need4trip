# 🚗 Need4Trip

**Платформа для организации автомобильных поездок и управления автоклубами**

Modern web application built with Next.js 15, React 19, TypeScript, and Supabase.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Fill in your Supabase and Telegram credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./QUICK_START.md)** - Step-by-step setup
- **[Architecture Overview](./docs/architecture/)** - System design
- **[Full Documentation](./docs/)** - Complete technical docs

### Key Topics
- **[Billing System v2.0](./docs/billing/)** - Payment plans & limits
- **[Development Guide](./docs/development/)** - Code style & patterns
- **[Design System](./docs/design/)** - UI components & styling
- **[API Security](./docs/architecture/security.md)** - Auth & permissions

### Guides
- **[Telegram Setup](./docs/guides/telegram-setup.md)** - Configure auth
- **[Database Migrations](./docs/guides/)** - Working with DB
- **[Deployment](./docs/guides/)** - Deploy to production

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.4 + shadcn/ui
- **State:** Server State (RSC) + React hooks
- **Forms:** Zod validation

### Backend
- **API:** Next.js API Routes
- **Server Components:** React Server Components
- **Database:** Supabase (PostgreSQL 15)
- **Caching:** StaticCache (in-memory, TTL-based)
- **Auth:** Telegram Login Widget
- **ORM:** Supabase Client

### DevOps
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **CI/CD:** GitHub Actions (future)

---

## 📁 Project Structure

```
need4trip/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   └── [pages]/           # Pages & components
│   │
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components (shadcn)
│   │   └── [feature]/        # Feature components
│   │
│   ├── lib/                   # Core logic
│   │   ├── cache/            # Caching infrastructure
│   │   ├── db/               # Database repositories
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utilities
│   │
│   └── hooks/                 # React hooks
│
├── docs/                      # Documentation
│   ├── architecture/          # System design
│   ├── billing/               # Payment system
│   ├── development/           # Dev guidelines
│   ├── design/                # Design system
│   └── guides/                # How-to guides
│
├── supabase/
│   └── migrations/            # Database migrations
│
├── public/                    # Static assets
└── figma/                     # Figma design files
```

---

## 🎨 Design System

### Colors
- **Primary:** `#FF6F2C` (orange)
- **Text:** `#111827` (primary), `#6B7280` (secondary)
- **Border:** `#E5E7EB`
- **Background:** `#FFFFFF`, `#F9FAFB` (muted)

### Typography
- **Font:** Inter (Latin + Cyrillic)
- **Sizes:** 48px (hero), 36px (h1), 24px (h2), 16px (body)
- **Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Components
All components follow [shadcn/ui](https://ui.shadcn.com/) + custom design system.

See **[Design System Docs](./docs/design/)** for complete guidelines.

---

## 💳 Billing System

### Plans
| Plan | Participants | Members | Price |
|------|--------------|---------|-------|
| **Free** | 15 | - | 0 ₸ |
| **Club 50** | 50 | 50 | 3,490 ₸/mo |
| **Club 500** | 500 | 500 | 11,990 ₸/mo |
| **Unlimited** | ∞ | ∞ | Custom |

**Since v2.1:** All plans (including FREE) stored in database for unified architecture.

See **[Billing Docs](./docs/billing/)** for complete specification.

---

## ⚡ Performance

### Optimizations (v2.1)
- **StaticCache** - Production-ready caching for reference data
- **-96% DB queries** - Only 20 queries/min (was 500/min)
- **-93% latency** - Forms load in 10ms (was 150ms)
- **N+1 solved** - Batch loading for currencies, categories, brands
- **Serverless-friendly** - Works on Vercel without Redis

### Key Metrics
```
DB Load:        500 queries/min → 20 queries/min
Event Form:     150ms → 10ms
Event List:     200ms → 50ms
Cost Savings:   -$48/month on Supabase
```

See **[Caching Strategy](./docs/architecture/CACHING_STRATEGY_ANALYSIS.md)** for details.

---

## 🔐 Authentication

**Telegram Login Widget** integration:
1. User clicks "Login with Telegram"
2. Telegram validates user
3. Backend creates session
4. JWT stored in HttpOnly cookie

See **[Security Docs](./docs/architecture/security.md)** for details.

---

## 📊 Key Features

### For Users
- ✅ Create & manage events
- ✅ Register for events
- ✅ Custom registration fields
- ✅ Profile management

### For Clubs
- ✅ Club management
- ✅ Member roles (owner/organizer/member)
- ✅ Event limits based on plan
- ✅ CSV export (paid plans)
- ✅ Paid events (paid plans)

### Technical
- ✅ Server-Side Rendering (SSR)
- ✅ Streaming with Suspense
- ✅ Optimistic UI updates
- ✅ Type-safe API
- ✅ Row Level Security (RLS)

---

## 🧪 Development

### Scripts
```bash
npm run dev     # Start dev server (Turbopack)
npm run build   # Build for production
npm run start   # Run production build
npm run lint    # Run ESLint
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Telegram
NEXT_PUBLIC_TELEGRAM_BOT_NAME=your_bot_name

# Auth
JWT_SECRET=your_jwt_secret
```

### Code Style
- **TypeScript strict mode**
- **ESLint 9** with custom config
- **Prettier** for formatting (implicit via editor)

See **[Development Guide](./docs/development/)** for full guidelines.

---

## 📦 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Manual
```bash
npm run build
npm run start
```

See **[Deployment Guide](./docs/guides/)** for details.

---

## 🤝 Contributing

1. Follow **[Code Style](./docs/development/code-style.md)**
2. Use **[Patterns](./docs/development/patterns.md)**
3. Update documentation if needed
4. Test before committing

---

## 📝 License

Private project - all rights reserved.

---

## 🔗 Links

- **Documentation:** [/docs](/docs)
- **Design System:** [/docs/design](/docs/design)
- **Billing Spec:** [/docs/billing](/docs/billing)
- **Architecture:** [/docs/architecture](/docs/architecture)

---

## 📧 Contact

For questions and support, contact the development team.

---

**Version:** 2.0  
**Last Updated:** December 16, 2024  
**Status:** 🟢 Production Ready
