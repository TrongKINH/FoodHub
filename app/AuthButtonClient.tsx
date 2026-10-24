"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Loader2, User } from "lucide-react";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";
import type { CustomRoleBadge } from "@/app/lib/auth";

export function AuthButtonClient({
  userEmail,
  displayName,
  avatarUrl,
  roleBadge,
  customRoles = [],
  redirectPath = "/",
}: {
  userEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  roleBadge: string;
  customRoles?: CustomRoleBadge[];
  redirectPath?: string;
}) {
  const [loading, setLoading] = useState(false);

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
    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 pl-2 pr-1.5 py-1.5 rounded-2xl shadow-2xs text-xs">
      {/* Bấm vào Avatar / Tên để mở trang Hồ Sơ Cá Nhân (/profile) */}
      <a
        href="/profile"
        title="Bấm để vào Trang Hồ Sơ Cá Nhân & Chỉnh sửa Role"
        className="inline-flex items-center gap-2 hover:opacity-85 transition pr-1"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName || userEmail}
            className="w-7 h-7 rounded-full object-cover border border-teal-500/40"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#0F766E] text-white font-extrabold text-[11px] flex items-center justify-center">
            {(displayName || userEmail)[0]?.toUpperCase()}
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
          <span className="font-extrabold text-slate-900 max-w-28 truncate">
            {displayName || userEmail}
          </span>

          {/* Huy hiệu chức vụ hệ thống */}
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

          {/* Hiển thị Role Danh Hiệu tùy chỉnh (Thực thần, Thánh ăn...) với đúng màu nền & màu chữ */}
          {customRoles.slice(0, 2).map((r) => (
            <span
              key={r.id}
              style={{
                backgroundColor: r.bg_color,
                color: r.text_color,
              }}
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs"
            >
              {r.name}
            </span>
          ))}
        </div>
      </a>

      <a
        href="/profile"
        title="Chỉnh sửa Hồ sơ & Role"
        className="p-1.5 rounded-xl bg-teal-50 text-[#0F766E] hover:bg-teal-100 font-bold inline-flex items-center gap-1 transition"
      >
        <User className="w-3.5 h-3.5" />
        <span className="hidden md:inline text-[11px]">Hồ sơ</span>
      </a>

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