import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Khóa kết nối trực tiếp — Tự động chạy kể cả khi Vercel bị lỗi biến môi trường
const FALLBACK_URL = "https://eklfttywcatdcvbncvsz.supabase.co";
const FALLBACK_KEY = "sb_publishable_7WqFgAQdnPEXU0MBWH35eA_r_VcEXwq";

function getSafeSupabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (raw.startsWith("https://") && !raw.includes("=") && !raw.includes(" ")) {
    return raw;
  }
  return FALLBACK_URL;
}

function getSafeSupabaseKey(): string {
  const raw = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  if (
    (raw.startsWith("sb_") || raw.startsWith("eyJ")) &&
    !raw.includes("=") &&
    !raw.includes(" ")
  ) {
    return raw;
  }
  return FALLBACK_KEY;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(getSafeSupabaseUrl(), getSafeSupabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Bỏ qua khi gọi từ Server Component
        }
      },
    },
  });
}