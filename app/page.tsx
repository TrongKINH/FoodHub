import {
  ArrowRight,
  Crown,
  Sparkles,
  Utensils,
  ShieldCheck,
  Repeat,
} from "lucide-react";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LandingSchoolSelectorPage() {
  const supabase = await createServerSupabaseClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-[#F4F7F9] to-slate-100/80 flex flex-col justify-between p-4 sm:p-8">
      {/* Thanh Top Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 px-4 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F766E] to-teal-500 text-white flex items-center justify-center shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Food<span className="text-[#0F766E]">Hub</span>
            </span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
              Campus Network
            </span>
          </div>
        </div>

        <a
          href="/admin/god"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-sm hover:bg-slate-800 transition"
        >
          <Crown className="w-4 h-4 text-[#F59E0B]" />
          <span>GOD Mode (/admin/god)</span>
        </a>
      </header>

      {/* Khối Trung Tâm */}
      <main className="max-w-4xl w-full mx-auto my-8 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] bg-teal-50 border border-teal-200/80 px-4 py-1.5 rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ sinh thái Ẩm thực & Thực đơn Căn tin Học đường</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            Hôm nay ăn gì ở{" "}
            <span className="text-[#0F766E]">căn tin trường bạn?</span>
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Xem thực đơn 🌅 Điểm tâm sáng & 🍱 Cơm trưa, tra cứu bảng xếp hạng{" "}
            <strong>Tier S/A/B</strong>, lọc nguyên liệu dị ứng và nhận gợi ý
            chọn món điền Google Form hàng tuần.
          </p>
        </div>

        {/* 3 Tính năng nổi bật */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-[#F59E0B] font-bold text-sm">
              🏆
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                Bảng xếp hạng Tier S/A
              </p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Xếp hạng từ 0–5⭐ minh bạch, mỗi người 1 lượt đánh giá.
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 text-[#0F766E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                Trợ lý Điền Form Tuần
              </p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Gợi ý món điểm cao nhất mỗi ngày từ Thứ 2 đến Thứ 6.
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                Sàn Đổi Phiếu 2 Chiều
              </p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Tự hiện Món 1–4 theo ngày, bấm nhận kèo & hẹn chỗ nhanh.
              </p>
            </div>
          </div>
        </div>

        {/* Danh sách các Trường */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              🏫 Chọn trường của bạn để vào Căn tin
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hiện đang mở cổng cho {(schools ?? []).length} trường THPT / Đại
              học
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(schools ?? []).map((sc) => (
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
                      <span className="text-[11px] font-bold text-[#0F766E] bg-teal-50 px-2.5 py-0.5 rounded-lg">
                        /{sc.slug}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • Xem thực đơn & Form tuần
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
        </section>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-400 py-4">
        FoodHub Campus Network • Hệ thống quản trị thực đơn đa trường
      </footer>
    </div>
  );
}