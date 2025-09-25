# Tiny Diner Weddings Portal

Standalone Next.js + shadcn/ui microservice for Tiny Diner wedding intake, booking, and vendor coordination.

## Local development

```bash
cd partner-tools/tiny-diner-app
npm install
npm run dev -- --port 5410
```

The host app embeds the tool via `<iframe>` and defaults to `http://localhost:5410`. Override by setting `VITE_TINY_DINER_URL` in the main app (or deploy URL).

## Feature map

- Availability-first calendar with hold/booked status.
- Streamlined booking path with preset $4k offer and instant deposit summary.
- Custom intake path capturing guest count, dining style, beverage, dessert, floral, coordination, officiant, and freeform notes.
- Estimate builder with dynamic line items, deposit calculation, and payment milestones.
- Shared dashboard tabs for summary, preferred vendors, message log, and payment schedule.
- Square payment stubs (`/api/payments/deposit`) prepared for ACH vs card collection.
- HoneyBook sync stub (`/api/honeybook`) for pushing intakes into HoneyBook projects.
- Admin console (`/admin`) gated by Firebase Authentication with Google sign-in. Surfaced list of every request with linked
  estimate, profile, and message thread that emails the couple and logs the update to the estimate.

## Environment setup

Create a `.env.local` file (or copy `.env.local.example`) with Firebase web credentials so admins can authenticate:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
# Optional if you use analytics/GA4
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

The admin console uses these values to initialise Firebase Auth in the browser. Missing variables surface an inline warning.

## Integration hooks

- Replace `POST /api/honeybook` with real HoneyBook API calls (use `booking` + `estimate` payload).
- Replace `POST /api/payments/deposit` with Square ACH / card payment intent logic.
- Extend messaging tab to persist to Supabase/Firestore if needed; currently local state mock.
- Replace `POST /api/notifications/email` with transactional email provider (Postmark, Resend) to deliver admin ↔ guest
  messages.

## Theming notes

- Tailwind + shadcn tokens tuned for neutral base with rose accents. Update `STREAMLINED_PACKAGE`, vendor list, or color classes (`bg-rose-600`, `bg-emerald-600`) to match final Tiny Diner brand kit once provided.

## Deployment

Any standard Next.js workflow (Vercel, Netlify, SSR). Expose the app URL via `VITE_TINY_DINER_URL` in the host app so partners can access it from `/partners/tiny-diner`.
# tiny-wedding
