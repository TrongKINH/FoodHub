"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  X,
  Palette,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const SIZE = 320;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(e.target?.result || ""));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = String(e.target?.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 1. Form Thông Minh dùng cho trang Profile & Quản lý Role
export function InstantProfileForm({
  action,
  successMessage = "Đã lưu thay đổi thành công!",
  className = "",
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await action(fd);
      setToast(successMessage);
      router.refresh();
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-teal-500/40 flex items-center gap-2.5 text-xs font-extrabold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`relative ${className}`}>
        {submitting && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Đang lưu...</span>
            </div>
          </div>
        )}
        {children}
      </form>
    </>
  );
}

// 2. Khung Upload / Dán Ctrl + V cho Avatar người dùng
export function AvatarPickerClient({
  defaultAvatar,
  displayName,
}: {
  defaultAvatar: string;
  displayName: string;
}) {
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLoading(true);
    try {
      const dataUrl = await compressAvatar(file);
      setAvatar(dataUrl);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const f = item.getAsFile();
        if (f) await handleFile(f);
        return;
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      className="p-4 rounded-3xl border-2 border-dashed border-teal-300 bg-teal-50/30 focus:border-[#0F766E] flex flex-col sm:flex-row items-center gap-4 outline-none transition"
    >
      <input type="hidden" name="avatar_url" value={avatar} />

      <div className="relative shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#0F766E] text-white font-extrabold text-2xl flex items-center justify-center border-4 border-white shadow-md">
            {(displayName || "U")[0]?.toUpperCase()}
          </div>
        )}
        {avatar && (
          <button
            type="button"
            onClick={() => setAvatar("")}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white shadow cursor-pointer"
            title="Xóa ảnh đại diện"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-2 text-center sm:text-left flex-1">
        <p className="font-bold text-slate-900 text-xs">
          Ảnh đại diện (Avatar)
        </p>
        <p className="text-[11px] text-slate-500">
          {loading
            ? "Đang xử lý ảnh..."
            : "Bấm vào khung này rồi nhấn Ctrl + V để dán ảnh, hoặc chọn ảnh từ máy tính."}
        </p>
        <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F766E] hover:bg-slate-50 cursor-pointer shadow-2xs">
          <Camera className="w-3.5 h-3.5" />
          <span>Chọn ảnh từ máy</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}

// 3. Xưởng thiết kế Role có Xem trước Màu Nền & Màu Chữ trực tiếp + Tự làm mới
export function RoleCreatorLiveClient({
  onCreateRole,
}: {
  onCreateRole: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [roleName, setRoleName] = useState("🔥 Thực Thần");
  const [bgColor, setBgColor] = useState("#FEE2E2");
  const [textColor, setTextColor] = useState("#991B1B");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const presets = [
    { label: "Đỏ Thực Thần", bg: "#FEE2E2", text: "#991B1B" },
    { label: "Vàng Hoàng Kim", bg: "#FEF3C7", text: "#92400E" },
    { label: "Ngọc Lục Bảo", bg: "#CCFBF1", text: "#115E59" },
    { label: "Tím Huyền Thoại", bg: "#F3E8FF", text: "#6B21A8" },
    { label: "Hồng Idol", bg: "#FCE7F3", text: "#9D174D" },
    { label: "Đen Tối Thượng", bg: "#0F172A", text: "#FBBF24" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const createdName = roleName;
    setSubmitting(true);
    try {
      await onCreateRole(fd);
      setRoleName("");
      setToast(`✨ Đã tạo Role "${createdName}" thành công!`);
      router.refresh();
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-teal-500/40 flex items-center gap-2.5 text-xs font-extrabold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 text-xs relative"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
            <Palette className="w-4 h-4 text-[#0F766E]" />
            <span>1. Tạo Role Danh Hiệu Mới (Tùy chỉnh Màu nền & Màu chữ)</span>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-semibold">
              Xem trước:
            </span>
            <span
              style={{ backgroundColor: bgColor, color: textColor }}
              className="px-3 py-1 rounded-full font-extrabold text-xs shadow-2xs transition-all"
            >
              {roleName || "✨ Tên Role..."}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Tên Role Danh Hiệu *
            </label>
            <input
              name="name"
              required
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="VD: 🔥 Thực Thần / 👑 Thánh Ăn"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Màu nền Role (Background) *
            </label>
            <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-xl">
              <input
                type="color"
                name="bg_color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-9 h-7 rounded cursor-pointer border-0"
              />
              <span className="font-mono font-bold text-slate-700">
                {bgColor.toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Màu chữ Role (Text Color) *
            </label>
            <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-xl">
              <input
                type="color"
                name="text_color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-9 h-7 rounded cursor-pointer border-0"
              />
              <span className="font-mono font-bold text-slate-700">
                {textColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">
            Chọn nhanh phối màu đẹp:
          </span>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setBgColor(p.bg);
                setTextColor(p.text);
              }}
              style={{ backgroundColor: p.bg, color: p.text }}
              className="px-2.5 py-1 rounded-full font-extrabold text-[10px] cursor-pointer hover:scale-105 transition shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>+ Lưu Role Mới Vào Hệ Thống</span>
        </button>
      </form>
    </>
  );
}