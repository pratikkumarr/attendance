# Attendance Planner 🎓📊

A polished, production-quality shared attendance dashboard designed for a group of college friends. Features instant live sync via Supabase Realtime, optimistic updates with TanStack Query, what-if attendance projection simulation, and detailed analytics charts with Recharts.

---

## 🌟 Key Features

1. **Open Collaboration**: No authentication or passwords required. Anyone with the URL can view and update records or subject totals.
2. **Deterministic Calculations & Pure Functions** ([`src/lib/plan.ts`](file:///c:/Users/prati/Documents/attendance/src/lib/plan.ts)):
   - Evaluates remaining classes ($R = \max(T - D, 0)$) and live attendance percentage.
   - Computes whole-semester required classes, needed classes, and skippable classes for both **86%** (recommended safe margin) and **75%** (statutory requirement).
   - Generates automated plain-language insights ranked by urgency (e.g. *“You must attend all 14 remaining classes...”*).
3. **Interactive "What-If" Simulator**:
   - Test skipping $N$ classes per subject or globally across all subjects to predict semester-end final percentages.
4. **Data Visualizations (Recharts)**:
   - Live attendance bars with 75% and 86% reference lines.
   - Stacked class breakdown (Attended / Missed / Remaining).
   - Skip budget comparisons across subjects.
   - Multi-subject historical trend line chart.
   - Radial attendance gauge.
5. **Realtime Live Sync**:
   - Subscribes to Postgres table changes (`entries`, `subjects`, `entry_history`) and invalidates cache seamlessly in background.
   - Preserves user input focus and includes optimistic rollbacks on failure.
6. **Audit History & CSV Export**:
   - Drawer timeline tracking attendance changes over time.
   - 1-click CSV report export.

---

## 🔐 Security & Access Model

> [!IMPORTANT]
> **No Authentication & Anon Key Usage**:
> This application is intentionally built without authentication so that friends can share a single link.
> - The `VITE_SUPABASE_ANON_KEY` is **public by design** in client-side code.
> - Security and write boundaries are managed via Supabase Row Level Security (RLS) policies.
> - **Never use or expose your `service_role` secret key anywhere in this client.**

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- `pnpm` (or `npm`)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```

Populate the keys in `.env.local`:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
*(Note: `.env*` files with secrets are ignored in `.gitignore`)*

### 3. Database Schema Setup
Execute the complete schema and trigger definitions in your Supabase SQL Editor:
- Open [`supabase/schema.sql`](file:///c:/Users/prati/Documents/attendance/supabase/schema.sql)
- Paste all statements into the SQL Editor and run once.
- This creates the `entry_history` audit table, RLS policies, trigger function `log_entry_history()`, adds it to `supabase_realtime`, and runs an initial backfill.

### 4. Running Locally
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### 5. Running Tests & Verification
```bash
# Run Vitest test suite
pnpm test

# Build for production
pnpm build
```

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. In the [Vercel Dashboard](https://vercel.com), select **Add New Project** and import the repository.
3. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
4. Add the Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
5. Click **Deploy**.
