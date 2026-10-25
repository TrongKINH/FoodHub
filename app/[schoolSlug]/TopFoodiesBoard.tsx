"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Star, MessageSquare, Award, Plus, X, Crown } from "lucide-react";
import type { CurrentUserClientInfo, CustomRoleOption, EnrichedProfileMap } from "./InteractiveClient";

export function TopFoodiesBoard({
  schoolShortName, schoolDishes, reviews, posts, comments, profileMap, currentUser, allCustomRoles = [], onAssignRole, onRevokeRole,
}: {
  schoolShortName: string; schoolDishes: any[]; reviews: any[]; posts: any[]; comments: any[];
  profileMap: EnrichedProfileMap; currentUser: CurrentUserClientInfo; allCustomRoles?: CustomRoleOption[];
  onAssignRole?: (fd: FormData) => Promise<void>; onRevokeRole?: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(allCustomRoles[0]?.id || "");
  const [toast, setToast] = useState<string | null>(null);

  // Chỉ tính các đánh giá và bình luận thuộc về trường hiện tại
  const schoolDishIds = new Set((schoolDishes ?? []).map((d) => d.id));
  const schoolPostIds = new Set((posts ?? []).map((p) => p.id));

  const statsMap = new Map<string, {
    key: string; email: string | null; name: string; avatar: string | null; systemBadge: string | null;
    reviewCount: number; postCount: number; commentCount: number; score: number;
  }>();

  const addStat = (emailRaw: string | null, nameRaw: string | null, avatarRaw: string | null, badgeRaw: string | null, type: "review" | "post" | "comment") => {
    const email = emailRaw?.toLowerCase().trim() || null;
    const name = (email && profileMap[email]?.display_name) || nameRaw?.trim() || "Học sinh";
    const key = email || `guest_${name.toLowerCase()}`;

    const cur = statsMap.get(key) || {
      key, email, name,
      avatar: (email && profileMap[email]?.avatar_url) || avatarRaw || null,
      systemBadge: badgeRaw || null,
      reviewCount: 0, postCount: 0, commentCount: 0, score: 0,
    };

    if (type === "review") { cur.reviewCount += 1; cur.score += 3; }
    if (type === "post") { cur.postCount += 1; cur.score += 2; }
    if (type === "comment") { cur.commentCount += 1; cur.score += 1; }
    statsMap.set(key, cur);
  };

  (reviews ?? []).forEach((r) => {
    if (schoolDishIds.has(r.dish_id)) addStat(r.reviewer_email, r.reviewer_name, r.reviewer_avatar, r.reviewer_badge, "review");
  });
  (posts ?? []).forEach((p) => {
    addStat(p.author_email, p.author_name, p.author_avatar, p.author_badge, "post");
  });
  (comments ?? []).forEach((c) => {
    if (schoolPostIds.has(c.post_id) && !c.deleted_by_role) addStat(c.author_email, c.author_name, c.author_avatar, c.author_badge, "comment");
  });

  const topMembers = Array.from(statsMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const canAdminAssign = Boolean((currentUser?.isGod || currentUser?.canManageSchool) && onAssignRole);

  const rankStyles = [
    { badge: "🥇 TOP 1", border: "border-amber-300 bg-gradient-to-br from-amber-50/90 to-white" },
    { badge: "🥈 TOP 2", border: "border-teal-300 bg-gradient-to-br from-teal-50/60 to-white" },
    { badge: "🥉 TOP 3", border: "border-orange-200 bg-gradient-to-br from-orange-50/50 to-white" },
  ];

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs text-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-rose-500" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900">
              Bảng Vinh Danh Top Thực Thần — {schoolShortName}
            </h2>
            <p className="text-xs text-slate-500">
              Xếp hạng học sinh tích cực chấm sao (+3đ), đăng bài (+2đ) & thảo luận (+1đ) • Bấm vào thẻ để xem Profile
            </p>
          </div>
        </div>
      </div>

      {topMembers.length === 0 ? (
        <p className="text-slate-400 italic text-center py-4">Chưa có dữ liệu hoạt động. Hãy chấm sao món ăn để lên Bảng Vinh Danh đầu tiên!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {topMembers.map((m, idx) => {
            const enriched = m.email ? profileMap[m.email] : undefined;
            const roles = enriched?.roles || [];
            const isGod = m.email === "nguyenphutrong11102010@gmail.com" || m.systemBadge?.includes("GOD");
            const style = rankStyles[idx] || { badge: `#${idx + 1}`, border: "border-slate-200 bg-slate-50/50" };

            return (
              <div
                key={m.key}
                onClick={() => setSelectedUser(m)}
                className={`p-3.5 rounded-2xl border ${style.border} flex flex-col justify-between gap-3 cursor-pointer hover:shadow-md transition`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0F766E] text-white font-extrabold text-sm flex items-center justify-center shrink-0">{m.name[0]?.toUpperCase()}</div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{m.name}</span>
                        {isGod && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">👑 GOD</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {roles.map((r) => (
                          <span key={r.id} style={{ backgroundColor: r.bg_color, color: r.text_color }} className="text-[10px] font-extrabold px-2 py-0.5 rounded-full">{r.name}</span>
                        ))}
                        {roles.length === 0 && <span className="text-[10px] text-slate-400">🎒 Thành viên tích cực</span>}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-400 font-extrabold text-[10px] shrink-0">{style.badge}</span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> <strong>{m.reviewCount}</strong> sao</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3 text-[#0F766E]" /> <strong>{m.postCount + m.commentCount}</strong> chat</span>
                  </div>
                  <span className="font-extrabold text-[#0F766E]">{m.score} điểm 🔥</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Popup xem Profile & Cấp Role nhanh khi bấm vào thành viên trên Bảng Vinh Danh */}
      {selectedUser && (
        <div onClick={() => setSelectedUser(null)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0F766E] text-white font-extrabold text-lg flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar ? <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" /> : selectedUser.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedUser.name}</h3>
                  <p className="text-[11px] text-[#0F766E] font-bold">🔥 Tổng điểm cống hiến: {selectedUser.score} điểm</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="p-1.5 rounded-full bg-slate-100 text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              &ldquo;{(selectedUser.email && profileMap[selectedUser.email]?.bio) || "Thành viên năng nổ của căn tin trường 🍱"}&rdquo;
            </p>

            {canAdminAssign && selectedUser.email && allCustomRoles.length > 0 && (
              <form onSubmit={async (e) => {
                e.preventDefault(); if (!onAssignRole) return;
                const fd = new FormData(); fd.set("user_email", selectedUser.email); fd.set("role_id", selectedRoleId);
                setToast("✨ Đã cấp Role thành công!"); setTimeout(() => setToast(null), 2000);
                await onAssignRole(fd); router.refresh();
              }} className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <span className="font-extrabold text-[11px] text-amber-900 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> ⚡ Thưởng Role cho Thực Thần này:</span>
                {toast && <p className="text-emerald-700 font-bold text-[11px]">{toast}</p>}
                <div className="flex gap-1.5">
                  <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="flex-1 p-2 bg-white border border-amber-300 rounded-xl font-bold">
                    {allCustomRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button type="submit" className="px-3 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"><Plus className="w-3.5 h-3.5 inline" /> Cấp</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}