# Pramana — SAT Bluebook Portal

## Environment variables (local & production)

This project uses Supabase for auth and data. Set these environment variables for local development and in your deployment platform (Vercel).

Required (copy these into `.env.local` for local development or add to Vercel env vars):

- NEXT_PUBLIC_SUPABASE_URL: your Supabase project URL (e.g., https://xyz.supabase.co)
- NEXT_PUBLIC_SUPABASE_ANON_KEY: your public anon API key

Server-only (do NOT expose to client or commit):

- SUPABASE_SERVICE_ROLE_KEY: service role key used by admin server routes

Local setup:

1. Copy `.env.example` to `.env.local`.
2. Fill in the real values (do NOT commit `.env.local`).
3. Run `npm run dev` or `npm run build`.

Vercel setup (recommended for production):

1. Go to your Vercel Project → Settings → Environment Variables.
2. Add the variables above for the appropriate environments (Preview/Production).
3. Re-deploy.

Verify environment variables locally:

- Run `npm run check:env` — this will fail if required public Supabase variables are missing.

Security notes:

- Never commit secrets such as `SUPABASE_SERVICE_ROLE_KEY` to source control.
- Use Vercel environment variables for production secrets.

If you want, I can create a `.env.local` here with your Supabase values (I recommend adding them via Vercel UI instead). If you’d like me to create `.env.local`, please provide the values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- (Optional) `SUPABASE_SERVICE_ROLE_KEY`

I will not commit `.env.local` to the repo.
