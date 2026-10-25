"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  X,
  CheckCircle2,
  Pencil,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 700;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(e.target?.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = String(e.target?.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 1. Form Thông Minh dùng cho mọi thao tác Admin: Tự hiện thông báo nổi & Làm mới trang tức thì
export function InstantActionForm({
  action,
  successMessage = "Đã lưu & cập nhật thành công!",
  resetOnSuccess = false,
  className = "",
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    setSubmitting(true);
    try {
      await action(fd);
      if (resetOnSuccess) {
        formEl.reset();
        window.dispatchEvent(new CustomEvent("foodhub:reset-image"));
      }
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
              <span>Đang cập nhật ngay...</span>
            </div>
          </div>
        )}
        {children}
      </form>
    </>
  );
}

// 2. Ô dán ảnh Ctrl + V
export function DishImagePasteInput({
  defaultImage = "",
  inputName = "image_url",
}: {
  defaultImage?: string;
  inputName?: string;
}) {
  const [imageData, setImageData] = useState<string>(defaultImage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setImageData(defaultImage);
  }, [defaultImage]);

  useEffect(() => {
    const handleReset = () => {
      if (!defaultImage) setImageData("");
    };
    window.addEventListener("foodhub:reset-image", handleReset);
    return () => window.removeEventListener("foodhub:reset-image", handleReset);
  }, [defaultImage]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLoading(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setImageData(compressed);
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
        const file = item.getAsFile();
        if (file) await handleFile(file);
        return;
      }
    }
  };

  return (
    <div>
      <label className="font-semibold text-slate-700 block mb-1">
        Hình Ảnh Món Ăn (Copy ảnh & bấm Ctrl + V)
      </label>
      <input type="hidden" name={inputName} value={imageData} />

      {!imageData ? (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          className="w-full p-2 border-2 border-dashed border-teal-300 bg-teal-50/40 hover:bg-teal-50 focus:bg-teal-50 focus:border-[#0F766E] rounded-xl flex items-center justify-between gap-2 cursor-pointer outline-none transition"
        >
          <div className="flex items-center gap-2 text-slate-600 pl-1">
            <ImageIcon className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span className="text-[11px] font-medium">
              {loading
                ? "Đang xử lý ảnh..."
                : "Bấm vào đây rồi nhấn Ctrl + V để dán ảnh"}
            </span>
          </div>

          <label className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-[#0F766E] hover:bg-slate-50 cursor-pointer shrink-0">
            Chọn ảnh
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
      ) : (
        <div className="flex items-center justify-between gap-2 p-1.5 border border-teal-300 bg-teal-50/50 rounded-xl">
          <div className="flex items-center gap-2">
            <img
              src={imageData}
              alt="Xem trước ảnh món ăn"
              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
            />
            <span className="text-[11px] font-bold text-[#0F766E] inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã có ảnh món ăn
            </span>
          </div>
          <button
            type="button"
            onClick={() => setImageData("")}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
            title="Gỡ ảnh này"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// 3. Dòng món ăn trong Kho Món Ăn: Sửa hoặc Xóa cập nhật ngay trong 0.01 giây + Hiện thông báo
export function EditableDishRow({
  dish,
  categories,
  onUpdateDish,
  onDeleteDish,
}: {
  dish: any;
  categories: any[];
  onUpdateDish: (formData: FormData) => Promise<void>;
  onDeleteDish: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [localDish, setLocalDish] = useState<any>(dish);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLocalDish(dish);
  }, [dish]);

  if (isDeleted) return null;

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const newName = String(fd.get("name") ?? localDish.name).trim();
    const newMealTime = String(fd.get("meal_time") ?? localDish.meal_time);
    const newCatId = String(fd.get("category_id") ?? localDish.category_id);
    const newPriceRaw = String(fd.get("price_vnd") ?? "").trim();
    const newDesc = String(fd.get("description") ?? "").trim();
    const newImg = String(fd.get("image_url") ?? "").trim();

    const matchedCat = categories.find((c) => c.id === newCatId);

    // Cập nhật giao diện tức thì không cần chờ Server
    setLocalDish((prev: any) => ({
      ...prev,
      name: newName,
      meal_time: newMealTime,
      category_id: newCatId,
      categories: matchedCat
        ? { name: matchedCat.name, icon: matchedCat.icon }
        : prev.categories,
      price_vnd: newPriceRaw ? parseInt(newPriceRaw, 10) : null,
      description: newDesc || null,
      image_url: newImg || null,
    }));

    setIsEditing(false);
    setToast(`✅ Đã cập nhật món "${newName}"!`);
    setTimeout(() => setToast(null), 3000);

    await onUpdateDish(fd);
    router.refresh();
  };

  const handleDeleteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Ẩn món ăn khỏi danh sách ngay lập tức
    setIsDeleted(true);
    await onDeleteDish(fd);
    router.refresh();
  };

  return (
    <div className="py-3.5 space-y-3 relative">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-teal-500/40 flex items-center gap-2.5 text-xs font-extrabold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {localDish.image_url ? (
            <img
              src={localDish.image_url}
              alt={localDish.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
              Chưa ảnh
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  localDish.meal_time === "breakfast"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-teal-50 text-[#0F766E] border border-teal-200"
                }`}
              >
                {localDish.meal_time === "breakfast"
                  ? "🌅 Ăn sáng"
                  : localDish.meal_time === "lunch"
                  ? "🍱 Ăn trưa"
                  : "🕒 Cả ngày"}
              </span>
              <span className="font-bold text-sm text-slate-900">
                {localDish.name}
              </span>
              <span className="font-extrabold text-[#0F766E]">
                {localDish.price_vnd
                  ? `${localDish.price_vnd.toLocaleString("vi-VN")}đ`
                  : "Theo phiếu"}
              </span>
            </div>

            {localDish.description && (
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {localDish.description}
              </p>
            )}

            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
              <span>
                {localDish.categories?.icon} {localDish.categories?.name}
              </span>
              {localDish.ingredient_tags?.length > 0 && (
                <>
                  <span>•</span>
                  <span>Nhãn tự động:</span>
                  {localDish.ingredient_tags.map((tag: string) => (
                    <span
                      key={tag}
                      className={`font-semibold px-1.5 py-0.5 rounded ${
                        tag === "#nước"
                          ? "bg-teal-100 text-[#0F766E]"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              isEditing
                ? "bg-slate-900 text-white"
                : "bg-teal-50 text-[#0F766E] hover:bg-teal-100 border border-teal-200"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isEditing ? "Đóng sửa" : "Sửa món"}</span>
          </button>

          <form onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="dish_id" value={localDish.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl font-semibold border border-transparent hover:border-red-200 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          </form>
        </div>
      </div>

      {isEditing && (
        <form
          onSubmit={handleUpdateSubmit}
          className="p-4 rounded-2xl bg-slate-50 border-2 border-teal-600/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
        >
          <input type="hidden" name="dish_id" value={localDish.id} />

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 block mb-1">
              Tên món ăn *
            </label>
            <input
              name="name"
              required
              defaultValue={localDish.name}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Buổi phục vụ *
            </label>
            <select
              name="meal_time"
              defaultValue={localDish.meal_time}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
            >
              <option value="breakfast">🌅 Điểm tâm sáng</option>
              <option value="lunch">🍱 Đồ ăn trưa</option>
              <option value="all_day">🕒 Bán cả ngày</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Danh mục *
            </label>
            <select
              name="category_id"
              defaultValue={localDish.category_id}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Giá tiền (VNĐ)
            </label>
            <input
              name="price_vnd"
              type="number"
              step="1000"
              defaultValue={localDish.price_vnd ?? 35000}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <DishImagePasteInput
            defaultImage={localDish.image_url || ""}
            inputName="image_url"
          />

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Mô tả món ăn
            </label>
            <input
              name="description"
              defaultValue={localDish.description || ""}
              placeholder="Mô tả thành phần, nước chấm..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi ngay</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}