# nobsppt

> AI slides that don't embarrass you in the boardroom.

[![CI](https://github.com/vedpawar2254/noBSppt/actions/workflows/ci.yml/badge.svg)](https://github.com/vedpawar2254/noBSppt/actions/workflows/ci.yml)

---

## What is this

You paste your notes. You get a deck. That deck has exactly what it needs and nothing it doesn't.

That's the whole pitch.

---

## The problem with every other AI slide tool

You paste 500 words into Gamma. You get 14 slides. Slide 7 is titled "Moving Forward Together" with a bullet that says "Leveraging synergies to unlock transformative value." You didn't write that. No one wrote that. It emerged from the void fully formed, confidently wrong, and now it's on the projector.

nobsppt runs a two-layer restraint engine:

**Layer 1 — Hard constraints (non-negotiable):**
- Max 10 slides per deck
- Max 3 bullets per slide
- Max 10 words per bullet
- Enforced at prompt level AND post-processed as a safety net

**Layer 2 — Signal scoring:**
- Every bullet is evaluated for information density
- Low-signal content is cut before it reaches you
- The AI's primary function is removal, not generation

The result: decks you can present without opening them first to check if the AI said something stupid.

---

## Tech stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| AI | Anthropic claude-haiku-4-5 |
| Auth | JWT via `jose` + httpOnly cookie |
| Payments | Stripe (hosted checkout — we never touch your card number) |
| PDF export | pdfkit |
| Styling | Tailwind CSS |
| Testing | Vitest |

---

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted — Supabase, Railway, Vercel Postgres all work)
- An Anthropic API key
- A Stripe account (for payment features — skip for pure dev)

### Setup

```bash
git clone https://github.com/your-username/nobsppt
cd nobsppt
npm install
cp .env.example .env.local
# fill in .env.local (see Environment Variables below)
npm run db:push    # push schema to your DB
npm run dev        # http://localhost:3000
```

### Environment variables

```bash
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/nobsppt

# Auth — generate with: openssl rand -base64 32
JWT_SECRET=your-secret-minimum-32-chars

# AI — get from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional for local dev — skip if not testing payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

For local Stripe webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run test         # run test suite (Vitest)
npm run test:watch   # watch mode

npm run db:generate  # generate Drizzle migrations
npm run db:migrate   # apply migrations
npm run db:push      # push schema directly (dev only)
npm run db:studio    # open Drizzle Studio (DB GUI)
```

---

## How the product works

1. **You create an account.** Free. No credit card. You get 3 decks.
2. **You paste text or an outline.** The AI distills it. You get slides.
3. **You share a link.** Recipients view in-browser. No account required. No app to download.
4. **You export PDF.** One click. Done.
5. **After 3 decks, you subscribe.** Because at that point you've already presented without editing and you know it works.

---

## Project structure

```
src/
  app/
    (auth)/          # /register, /login — noindex
    create/          # deck creation page
    deck/[id]/       # creator deck viewer (auth required)
    s/[token]/       # public shared deck viewer (SSR, no auth)
    dashboard/       # user's deck history
    account/         # billing & subscription management
    upgrade/         # paywall → Stripe checkout
    admin/           # platform metrics, user inspection, generation logs
    api/
      auth/          # register, login, logout
      decks/         # generate, list, delete, export
      subscription/  # checkout, cancel, status
      webhooks/      # stripe
      og/            # og:image generation (Next.js ImageResponse)
  components/
    auth/
    decks/
  lib/
    ai/              # Anthropic client singleton
    auth/            # password, session, rate-limit, guard, validation
    db/              # Drizzle schema + client
    decks/           # restraint engine, validation
    pdf/             # PDF generation (pdfkit)
    stripe/          # Stripe client singleton
tests/
  auth/
  decks/
  subscription/
```

---

## What this is NOT

- **Not Gamma.** Gamma is a design tool that generates a lot of slides. nobsppt is a distillation tool that generates fewer, better slides. Different goals.
- **Not a presentation editor.** You don't tweak slides here. If you're tweaking, the AI didn't do its job. File a bug report against the restraint engine.
- **Not a team product** (at MVP). One user. One deck. Share the link.

---

## Business model

Freemium. 3 free decks. Then ₹X/month (set your price in Stripe Dashboard).

The bet: if someone uses all 3 free decks without editing a single slide, they'll pay. The product has to earn that. That's the whole quality bar.

---

## Contributing

Solo founder project. PRs welcome if you've found a bug or have a tight improvement. Please don't open PRs that add slides to the output.

---

## License

MIT. Go build something with less BS.
