"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ThumbsUp, CheckCircle2, Trash2, Trophy, PlusCircle } from "lucide-react";
import type { CurrentUserClientInfo } from "./InteractiveClient";

export function getAutoLevelRole(score: number) {
  if (score >= 30) return { id: "auto_lv3", name: "⚡ Chiến Thần Ẩm Thực", bg_color: "#FEF3C7", text_color: "#92400E", next: null, min: 30 };
  if (score >= 15) return { id: "auto_lv2", name: "🍱 Sành Ăn Học Đường", bg_color: "#CCFBF1", text_color: "#115E59", next: 30, min: 15 };
  if (score >= 3) return { id: "auto_lv1", name: "🌱 Tân Binh Căn Tin", bg_color: "#E0E7FF", text_color: "#3730A3", next: 15, min: 3 };
  return { id: "auto_lv0", name: "🥚 Chưa mở khóa", bg_color: "#F1F5F9", text_color: "#64748B", next: 3, min: 0 };
}

export function WishlistAndLevelClient({
  schoolShortName, initialWishes, myInitialScore, currentUser, onCreateWish, onToggleUpvote, onManageWish,
}: {
  schoolShortName: string; initialWishes: any[]; myInitialScore: number; currentUser: CurrentUserClientInfo;
  onCreateWish: (fd: FormData) => Promise<void>; onToggleUpvote: (fd: FormData) => Promise<void>; onManageWish: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [wishes, setWishes] = useState<any[]>(initialWishes ?? []);
  const [myScore, setMyScore] = useState<number>(myInitialScore);
  const [dishName, setDishName] = useState("");
  const [note, setNote] = useState("");
  const [guestName, setGuestName] = useState("");
  const [voterKey, setVoterKey] = useState("guest");

  useEffect(() => { setWishes(initialWishes ?? []); }, [initialWishes]);
  useEffect(() => { setMyScore(myInitialScore); }, [myInitialScore]);

  useEffect(() => {
    if (currentUser.email) {
      setVoterKey(`google_${currentUser.email}`);
    } else {
      const k = localStorage.getItem("foodhub_reviewer_key") || "stu_" + Math.random().toString(36).slice(2);
      localStorage.setItem("foodhub_reviewer_key", k);
      setVoterKey(k);
    }
  }, [currentUser.email]);

  // Tự động tăng điểm cống hiến ngay khi người dùng chấm sao hoặc chat trên trang
  useEffect(() => {
    const onSync = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      if (d.type === "review_upsert") setMyScore((s) => s + 3);
      if (d.type === "post_create") setMyScore((s) => s + 2);
      if (d.type === "comment_create") setMyScore((s) => s + 1);
    };
    window.addEventListener("foodhub:instant-sync", onSync);
    return () => window.removeEventListener("foodhub:instant-sync", onSync);
  }, []);

  const lv = getAutoLevelRole(myScore);
  const progressPct = lv.next ? Math.min(100, Math.round((myScore / lv.next) * 100)) : 100;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("voter_key", voterKey);
    const optimistic = {
      id: "temp_" + Date.now(),
      dish_name: dishName.trim(),
      note: note.trim() || null,
      creator_name: currentUser.displayName || guestName.trim() || "Học sinh",
      upvotes: 1,
      upvoted_keys: [voterKey],
      status: "pending",
    };
    setWishes((prev) => [optimistic, ...prev]);
    setMyScore((s) => s + 2);
    setDishName(""); setNote("");
    await onCreateWish(fd); router.refresh();
  };

  const handleUpvote = async (wish: any) => {
    const keys: string[] = Array.isArray(wish.upvoted_keys) ? wish.upvoted_keys : [];
    const hasVoted = keys.includes(voterKey);
    const nextKeys = hasVoted ? keys.filter((k) => k !== voterKey) : [...keys, voterKey];
    const nextCount = Math.max(1, Number(wish.upvotes || 1) + (hasVoted ? -1 : 1));

    setWishes((prev) => prev.map((w) => w.id === wish.id ? { ...w, upvotes: nextCount, upvoted_keys: nextKeys } : w));
    const fd = new FormData(); fd.set("wish_id", wish.id); fd.set("voter_key", voterKey);
    await onToggleUpvote(fd); router.refresh();
  };

  const handleManage = async (wishId: string, actionType: "approve" | "delete") => {
    if (actionType === "delete") {
      setWishes((prev) => prev.filter((w) => w.id !== wishId));
    } else {
      setWishes((prev) => prev.map((w) => w.id === wishId ? { ...w, status: w.status === "approved" ? "pending" : "approved" } : w));
    }
    const fd = new FormData(); fd.set("wish_id", wishId); fd.set("action_type", actionType);
    await onManageWish(fd); router.refresh();
  };

  const sortedWishes = [...wishes].sort((a, b) => Number(b.upvotes || 0) - Number(a.upvotes || 0));

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-2xs text-xs">
      {/* PHẦN 1: THANH TIẾN TRÌNH TỰ ĐỘNG MỞ KHÓA ROLE THEO ĐIỂM HOẠT ĐỘNG */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-[#0F766E] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-extrabold text-sm">Tiến Trình Mở Khóa Danh Hiệu Tự Động</span>
            <span style={{ backgroundColor: lv.bg_color, color: lv.text_color }} className="px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
              {lv.name}
            </span>
          </div>
          <p className="text-[11px] text-teal-100">
            Điểm hiện tại của bạn: <strong className="text-amber-300">{myScore} điểm</strong> • {lv.next ? `Cần thêm ${lv.next - myScore} điểm để tự động lên cấp tiếp theo!` : "🎉 Bạn đã đạt cấp độ Thực Thần tối thượng!"}
          </p>
          <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="flex sm:flex-col gap-1.5 text-[10px] font-bold shrink-0">
          <span className={`px-2.5 py-1 rounded-lg ${myScore >= 3 ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300"}`}>3đ: 🌱 Tân Binh</span>
          <span className={`px-2.5 py-1 rounded-lg ${myScore >= 15 ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300"}`}>15đ: 🍱 Sành Ăn</span>
          <span className={`px-2.5 py-1 rounded-lg ${myScore >= 30 ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300"}`}>30đ: ⚡ Chiến Thần</span>
        </div>
      </div>

      {/* PHẦN 2: HÒM THƯ ƯỚC NGUYỆN THỰC ĐƠN MỚI */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#F59E0B]" />
          <div>
            <h2 className="font-bold text-base text-slate-900">Hòm Thư Ước Nguyện Thực Đơn — {schoolShortName}</h2>
            <p className="text-xs text-slate-500">Đề xuất món bạn muốn căn tin nấu vào tuần tới (+2đ) • Bấm Vote để đẩy món lên Top 1</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-teal-50/40 p-3.5 rounded-2xl border border-teal-200">
        {!currentUser.email && (
          <input name="creator_name" required value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Tên bạn *" className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold" />
        )}
        <input name="dish_name" required value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="Tên món muốn căn tin nấu (VD: Mì Ý bò bằm, Cơm tấm...)" className={`${currentUser.email ? "sm:col-span-2" : ""} p-2.5 bg-white border border-slate-200 rounded-xl font-bold`} />
        <input name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (VD: Cho vào Món 2 hoặc Ăn sáng)" className="p-2.5 bg-white border border-slate-200 rounded-xl" />
        <button type="submit" className="py-2.5 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer">
          <PlusCircle className="w-4 h-4" /> <span>Đề xuất ngay</span>
        </button>
      </form>

      {sortedWishes.length === 0 ? (
        <p className="text-slate-400 italic text-center py-4">Chưa có đề xuất nào. Hãy là người đầu tiên ước nguyện món ngon cho tuần sau!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedWishes.map((w, idx) => {
            const voted = Array.isArray(w.upvoted_keys) && w.upvoted_keys.includes(voterKey);
            const isApproved = w.status === "approved";
            return (
              <div key={w.id} className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition ${isApproved ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-400 font-extrabold text-[10px]">#{idx + 1} được thèm nhất</span>
                    {isApproved && <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[10px]">✅ Căn tin đã duyệt nấu</span>}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">{w.dish_name}</h3>
                  {w.note && <p className="text-[11px] text-slate-600">{w.note}</p>}
                  <p className="text-[10px] text-slate-400">Đề xuất bởi: <strong>{w.creator_name}</strong></p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => handleUpvote(w)} className={`flex-1 py-1.5 px-3 rounded-xl font-extrabold inline-flex items-center justify-center gap-1.5 border transition cursor-pointer ${voted ? "bg-[#0F766E] text-white border-[#0F766E]" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-[#0F766E]"}`}>
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Muốn ăn ({w.upvotes || 1})</span>
                  </button>

                  {(currentUser.isGod || currentUser.canManageSchool) && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleManage(w.id, "approve")} title="Duyệt nấu món này" className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => handleManage(w.id, "delete")} title="Xóa đề xuất" className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}