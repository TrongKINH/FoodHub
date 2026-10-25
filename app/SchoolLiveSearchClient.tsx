"use client";

import { useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";

// Hàm chuẩn hóa chuỗi: Bỏ dấu tiếng Việt & đổi Đ -> d để gõ "tdn" khớp ngay "TĐN"
function norm(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function SchoolLiveSearchClient({ schools }: { schools: any[] }) {
  const [query, setQuery] = useState("");

  const q = norm(query);
  const filtered = (schools ?? []).filter((sc) => {
    if (!q) return true;
    return (
      norm(sc.short_name).includes(q) ||
      norm(sc.slug).includes(q) ||
      norm(sc.name).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Ô tìm kiếm trường gõ từng chữ */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#0F766E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gõ tên trường hoặc viết tắt để tìm ngay (VD: ptnk, tdn, Trần Đại Nghĩa...)"
          className="w-full pl-10 pr-9 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white transition"
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

      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
          Không tìm thấy trường nào khớp với từ khóa <strong>&ldquo;{query}&rdquo;</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((sc) => (
            <a
              key={sc.id}
              href={`/${sc.slug}`}
              className="flex items-center justify-between p-4 rounded-3xl border border-slate-200/90 hover:border-[#0F766E] bg-white hover:bg-teal-50/20 transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-3.5">
                {sc.image_url ? (
                  <img
                    src={sc.image_url}
                    alt={sc.short_name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="min-w-14 h-14 px-3 rounded-2xl bg-gradient-to-br from-[#0F766E] to-teal-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                    {sc.short_name}
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#0F766E] transition">
                    {sc.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-extrabold text-[#0F766E] bg-teal-50 px-2.5 py-0.5 rounded-lg">
                      {sc.short_name} (/{sc.slug})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Vào căn tin ngay
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-[#0F766E] group-hover:text-white text-slate-500 flex items-center justify-center transition shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}