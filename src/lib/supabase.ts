import { createClient } from "@supabase/supabase-js";

// Service-role client — server-only, never imported into client components.
// Used for uploading banners/logos/certificates to Supabase Storage.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
