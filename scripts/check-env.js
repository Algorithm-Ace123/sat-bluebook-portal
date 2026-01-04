// Load .env.local for local checks
require('dotenv').config({ path: '.env.local' });

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  // service role key is optional for non-admin functionality
];

const missing = required.filter(k => !process.env[k]);

if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

console.log("All required env vars are present.");
