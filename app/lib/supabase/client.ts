import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://eklfttywcatdcvbncvsz.supabase.co";
const SUPABASE_KEY = "sb_publishable_7WqFgAQdnPEXU0MBWH35eA_r_VcEXwq";

export function createBrowserSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}