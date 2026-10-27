"use client";

import { useState } from "react";
import { Dices, Sparkles, RotateCw } from "lucide-react";

export function RandomDishWheelClient({ dishes }: { dishes: any[] }) {
  const [mealFilter, setMealFilter] = useState<"all" | "breakfast" | "lunch">("all");
  const [onlyHighTier, setOnlyHighTier] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [currentDish, setCurrentDish] = useState<any | null>(null);
  const [winner, setWinner] = useState<any | null>(null);

  const pool = (dishes ?? []).filter((d) => {
    if (mealFilter !== "all" && d.meal_time !== mealFilter && d.meal_time !== "all_day") return false;
    if (onlyHighTier && d.dish_tier !== "S" && d.dish_tier !== "A") return false;
    return true;
  });

  const handleSpin = () => {
    if (spinning || pool.length === 0) return;
    setSpinning(true);
    setWinner(null);

    let steps = 0;
    const totalSteps = 18;
    const timer = setInterval(() => {
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      setCurrentDish(randomItem);
      steps++;

      if (steps >= totalSteps) {
        clearInterval(timer);
        const finalPick = pool[Math.floor(Math.random() * pool.length)];
        setCurrentDish(finalPick);
        setWinner(finalPick);
        setSpinning(false);
      }
    }, 80);
  };

  return (
    <section className="bg-gradient-to-br from-slate-900 via-teal-950 to-[#0F766E] text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white">🎰 Vòng Quay Nhân Phẩm: Hôm Nay Ăn Gì?</h2>
            <p className="text-teal-100/80 text-[11px]">Phân vân chưa biết ăn món nào? Bấm quay để vũ trụ chọn giúp bạn!</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <div className="inline-flex p-1 rounded-xl bg-white/10">
            {[
              { id: "all", label: "Tất cả" },
              { id: "breakfast", label: "🌅 Sáng" },
              { id: "lunch", label: "🍱 Trưa" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMealFilter(t.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition ${
                  mealFilter === t.id ? "bg-amber-400 text-slate-950" : "text-teal-100 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={onlyHighTier}
              onChange={(e) => setOnlyHighTier(e.target.checked)}
              className="accent-amber-400 rounded"
            />
            <span>🔥 Chỉ quay Tier S & A</span>
          </label>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left space-y-1 flex-1">
          {pool.length === 0 ? (
            <p className="text-amber-300 font-bold">Không có món nào khớp bộ lọc này. Hãy thử tắt lọc Tier S & A!</p>
          ) : currentDish ? (
            <>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                  {winner ? "🎉 CHỐT KÈO HÔM NAY" : "🎲 ĐANG QUAY..."}
                </span>
                <span className="text-teal-200 font-bold">
                  Tier {currentDish.dish_tier} • {currentDish.average_rating ? `${currentDish.average_rating}⭐` : "Món mới"}
                </span>
              </div>
              <p className={`text-lg sm:text-xl font-extrabold ${spinning ? "animate-pulse text-amber-200" : "text-amber-300"}`}>
                {currentDish.name}
              </p>
              <p className="text-[11px] text-teal-100/90">
                Giá: <strong>{currentDish.price_vnd ? `${currentDish.price_vnd.toLocaleString("vi-VN")}đ` : "Theo phiếu ăn"}</strong>
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-teal-100">
              Sẵn sàng quay từ <strong>{pool.length} món ăn</strong> trong thực đơn!
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning || pool.length === 0}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-600 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-lg transition cursor-pointer shrink-0"
        >
          {spinning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{spinning ? "Đang chọn món..." : winner ? "Quay lại lần nữa" : "Quay Chọn Món Ngay"}</span>
        </button>
      </div>
    </section>
  );
}