"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { EditableDishRow } from "./DishImagePasteInput";

// Chuẩn hóa chuỗi bỏ dấu tiếng Việt để gõ "suon", "ga", "nuoc" ra ngay từng chữ
function norm(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function AdminDishSearchList({
  dishes,
  categories,
  onUpdateDish,
  onDeleteDish,
}: {
  dishes: any[];
  categories: any[];
  onUpdateDish: (formData: FormData) => Promise<void>;
  onDeleteDish: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [mealFilter, setMealFilter] = useState<"all" | "breakfast" | "lunch">("all");

  const q = norm(query);

  const filteredDishes = (dishes ?? []).filter((d) => {
    if (mealFilter !== "all" && d.meal_time !== mealFilter && d.meal_time !== "all_day") {
      return false;
    }
    if (!q) return true;
    return (
      norm(d.name).includes(q) ||
      norm(d.description).includes(q) ||
      norm(d.categories?.name).includes(q) ||
      norm((d.ingredient_tags || []).join(" ")).includes(q)
    );
  });

  return (
    <div className="space-y-3 text-xs">
      {/* Thanh tìm kiếm gõ từng chữ + Nút lọc nhanh Sáng / Trưa */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#0F766E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ tên món để tìm sửa ngay từng chữ (VD: suon, ga, hu tieu, chay...)"
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:bg-white transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex p-1 rounded-2xl bg-slate-100 shrink-0">
          {[
            { id: "all", label: `Tất cả (${(dishes ?? []).length})` },
            { id: "breakfast", label: "🌅 Ăn sáng" },
            { id: "lunch", label: "🍱 Ăn trưa" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMealFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                mealFilter === tab.id
                  ? "bg-white text-[#0F766E] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách món ăn sau khi lọc */}
      {filteredDishes.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
          Không tìm thấy món ăn nào khớp với <strong>&ldquo;{query}&rdquo;</strong>.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredDishes.map((dish: any) => (
            <EditableDishRow
              key={dish.id}
              dish={dish}
              categories={categories ?? []}
              onUpdateDish={onUpdateDish}
              onDeleteDish={onDeleteDish}
            />
          ))}
        </div>
      )}
    </div>
  );
}