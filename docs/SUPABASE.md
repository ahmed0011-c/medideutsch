# Accounts and progress (later)

Guests play every lesson. Scores are stored in `localStorage` under `medideutsch:v1:<lessonId>`, with an index at `medideutsch:v1:index`. Comic “gelernt” marks use `medideutsch:v1:comic:<lessonId>`. The personal Wortbank is one document at `medideutsch:v1:wortbank`. The lesson player talks only to the `ProgressStore` interface in `lib/storage.ts`.

`SupabaseProgressStore` currently delegates to the local store. It switches on when both of these are set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No Supabase client is installed, and no credentials are required to run the app.

## When you connect it

1. Create a Supabase project and run `supabase/migrations/0001_progress.sql`.
2. Add `@supabase/supabase-js` and implement `load` / `save` on `SupabaseProgressStore`.
3. Debounce writes by about a second. On login, merge the guest `localStorage` records into `lesson_progress` (keep the higher point value per key, keep the furthest step).
4. Map `word_seen` from `progress.seen`.

Stripe is not part of this build. A later checkout can gate nothing: the course stays free for guests until you decide otherwise. A typical next step is a Stripe Customer Portal linked from `/account`, with the webhook updating `profiles`. Deploy the Next.js app on Vercel with the same env vars; `npm run build` is the production build.
