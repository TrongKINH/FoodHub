"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";

export function AuthButtonClient({
  userEmail,
  displayName,
  avatarUrl,
  roleBadge,
  redirectPath = "/",
}: {
  userEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  roleBadge: string;
  redirectPath?: string;
}) {
  const [loading, setLoading] = useState(false);

  // Tự động đồng bộ tài khoản Google vào bộ nhớ trình duyệt để Chấm sao & Đổi phiếu lấy đúng tên thật
  useEffect(() => {
    if (userEmail) {
      localStorage.setItem("foodhub_reviewer_key", `google_${userEmail}`);
      if (displayName) {
        localStorage.setItem("foodhub_student_name", displayName);
      }
    }
  }, [userEmail, displayName]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          redirectPath
        )}`,
      },
    });
  };

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!userEmail) {
    return (
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="inline-flex items-center gap-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-2xl shadow-2xs transition cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
        ) : (
          <LogIn className="w-4 h-4 text-[#0F766E]" />
        )}
        <span>Đăng nhập Google</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 bg-white border border-slate-200/90 pl-2.5 pr-2 py-1.5 rounded-2xl shadow-2xs text-xs">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName || userEmail}
          className="w-6 h-6 rounded-full object-cover border border-slate-200"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-[#0F766E] text-white font-extrabold text-[10px] flex items-center justify-center">
          {(displayName || userEmail)[0]?.toUpperCase()}
        </div>
      )}

      <div className="hidden sm:flex items-center gap-1.5">
        <span className="font-bold text-slate-800 max-w-28 truncate">
          {displayName || userEmail}
        </span>
        <span
          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
            roleBadge.includes("GOD")
              ? "bg-amber-100 text-amber-900"
              : roleBadge.includes("Admin")
              ? "bg-teal-50 text-[#0F766E]"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {roleBadge}
        </span>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        title={`Đăng xuất (${userEmail})`}
        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}