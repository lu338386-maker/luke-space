// Supabase client bootstrap for LUKE | SPACE
// 1) Add these to your hosting env:
//    - SUPABASE_URL
//    - SUPABASE_ANON_KEY
// 2) In local static preview, you can temporarily hardcode for testing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[LUKE SPACE] Missing SUPABASE_URL / SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
