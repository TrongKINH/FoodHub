"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Star, Heart, Copy, Check, MessageSquarePlus, Image as ImageIcon,
  X, Trash2, Edit3, MessageCircle, Send, Handshake,
  MapPin, RotateCcw, Reply, Crown, ShieldAlert, Undo2, Award, Plus, Filter, Search
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";

export interface CustomRoleOption { id: string; name: string; bg_color: string; text_color: string; }
export interface CurrentUserClientInfo {
  email: string | null; displayName: string | null; avatarUrl: string | null;
  roleBadge: string; isGod: boolean; canManageSchool: boolean; customRoles: CustomRoleOption[];
}
export type EnrichedProfileMap = Record<string, {
  display_name?: string; avatar_url?: string; bio?: string; class_name?: string; roles?: CustomRoleOption[];
}>;

// Hàm bỏ dấu tiếng Việt giúp gõ từng chữ không dấu vẫn tìm ra món ăn chính xác
function normText(str: string): string {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
}

function getOrCreateReviewerKey(userEmail?: string | null): string {
  if (userEmail) return `google_${userEmail}`;
  if (typeof window === "undefined") return "server";
  let key = localStorage.getItem("foodhub_reviewer_key");
  if (!key) {
    key = "stu_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
    localStorage.setItem("foodhub_reviewer_key", key);
  }
  return key;
}

function emitInstantSync(detail: Record<string, any>) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("foodhub:instant-sync", { detail }));
  }
}

function UserIdentityBadge({
  name, email, avatar, systemBadge, profileMap, currentUser, allCustomRoles = [], onAssignRole, onRevokeRole, size = "sm",
}: {
  name: string; email?: string | null; avatar?: string | null; systemBadge?: string | null;
  profileMap: EnrichedProfileMap; currentUser?: CurrentUserClientInfo; allCustomRoles?: CustomRoleOption[];
  onAssignRole?: (fd: FormData) => Promise<void>; onRevokeRole?: (fd: FormData) => Promise<void>; size?: "sm" | "md";
}) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  const cleanEmail = email?.toLowerCase().trim() || "";
  const enriched = cleanEmail ? profileMap[cleanEmail] : undefined;

  const finalName = enriched?.display_name || name || "Học sinh";
  const finalAvatar = enriched?.avatar_url || avatar || null;
  const finalBio = enriched?.bio || "Thành viên đam mê ẩm thực căn tin FoodHub 🍱";
  const finalClass = enriched?.class_name || "";

  const [localRoles, setLocalRoles] = useState<CustomRoleOption[]>(enriched?.roles || []);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(allCustomRoles[0]?.id || "");
  const [roleToast, setRoleToast] = useState<string | null>(null);

  useEffect(() => { setLocalRoles(enriched?.roles || []); }, [enriched]);
  useEffect(() => { if (!selectedRoleId && allCustomRoles.length > 0) setSelectedRoleId(allCustomRoles[0].id); }, [allCustomRoles, selectedRoleId]);

  const isGodUser = cleanEmail === "nguyenphutrong11102010@gmail.com" || systemBadge?.includes("GOD");
  const canAdminAssign = Boolean((currentUser?.isGod || currentUser?.canManageSchool) && cleanEmail && onAssignRole);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanEmail || !selectedRoleId || !onAssignRole) return;
    const chosen = allCustomRoles.find((r) => r.id === selectedRoleId);
    if (chosen && !localRoles.some((r) => r.id === chosen.id)) {
      setLocalRoles((prev) => [...prev, chosen]);
      emitInstantSync({ type: "role_assign", email: cleanEmail, role: chosen });
    }
    setRoleToast(`✨ Đã cấp Role "${chosen?.name}"!`);
    setTimeout(() => setRoleToast(null), 2500);
    const fd = new FormData(); fd.set("user_email", cleanEmail); fd.set("role_id", selectedRoleId);
    await onAssignRole(fd); router.refresh();
  };

  const handleRevoke = async (roleId: string, roleName: string) => {
    if (!cleanEmail || !onRevokeRole) return;
    setLocalRoles((prev) => prev.filter((r) => r.id !== roleId));
    emitInstantSync({ type: "role_revoke", email: cleanEmail, role_id: roleId });
    setRoleToast(`Đã gỡ Role "${roleName}"`);
    setTimeout(() => setRoleToast(null), 2500);
    const fd = new FormData(); fd.set("user_email", cleanEmail); fd.set("role_id", roleId);
    await onRevokeRole(fd); router.refresh();
  };

  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpenModal(true); }} className="inline-flex items-center gap-2 flex-wrap text-left group/user cursor-pointer hover:opacity-90 transition">
        {finalAvatar ? (
          <img src={finalAvatar} alt={finalName} className={`${size === "md" ? "w-8 h-8" : "w-6 h-6"} rounded-full object-cover border border-teal-500/40 shrink-0`} />
        ) : (
          <div className={`${size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"} rounded-full bg-[#0F766E] text-white font-extrabold flex items-center justify-center shrink-0`}>
            {finalName[0]?.toUpperCase()}
          </div>
        )}
        <span className="font-extrabold text-slate-900 group-hover/user:text-[#0F766E] group-hover/user:underline transition">{finalName}</span>
        {isGodUser ? (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">👑 GOD</span>
        ) : systemBadge && (systemBadge.includes("Admin") || systemBadge.includes("Phó")) ? (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">{systemBadge}</span>
        ) : null}
        {localRoles.map((r) => (
          <span key={r.id} style={{ backgroundColor: r.bg_color, color: r.text_color }} className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">{r.name}</span>
        ))}
      </button>

      {openModal && (
        <div onClick={(e) => { e.stopPropagation(); setOpenModal(false); }} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full overflow-hidden shadow-2xl text-xs">
            <div className="h-24 bg-gradient-to-r from-slate-900 via-teal-900 to-[#0F766E] relative">
              <button type="button" onClick={() => setOpenModal(false)} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 pb-6 -mt-12 space-y-4">
              <div className="flex items-end justify-between">
                {finalAvatar ? (
                  <img src={finalAvatar} alt={finalName} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg bg-white" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#0F766E] text-white font-extrabold text-2xl flex items-center justify-center border-4 border-white shadow-lg">{finalName[0]?.toUpperCase()}</div>
                )}
                {finalClass && <span className="px-3 py-1 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200 font-extrabold text-[11px]">🏫 {finalClass}</span>}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{finalName}</h3>
                <p className="text-[11px] text-slate-400">{cleanEmail ? `Đã xác thực (${cleanEmail})` : "Khách tham quan"}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Giới thiệu bản thân</p>
                <p>&ldquo;{finalBio}&rdquo;</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Chức vụ & Role Danh Hiệu</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-extrabold text-[11px]">{isGodUser ? "👑 GOD" : systemBadge || "🎒 Học sinh"}</span>
                  {localRoles.map((r) => (
                    <span key={r.id} style={{ backgroundColor: r.bg_color, color: r.text_color }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-extrabold text-[11px]">
                      <span>{r.name}</span>
                      {canAdminAssign && <button type="button" onClick={() => handleRevoke(r.id, r.name)} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>}
                    </span>
                  ))}
                </div>
              </div>
              {canAdminAssign && allCustomRoles.length > 0 && (
                <form onSubmit={handleAssign} className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <span className="font-extrabold text-[11px] text-amber-900 flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-600" /> ⚡ Cấp Role trực tiếp (Admin/GOD)</span>
                  {roleToast && <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{roleToast}</p>}
                  <div className="flex gap-1.5">
                    <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="flex-1 p-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800">
                      {allCustomRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                    <button type="submit" className="px-3 py-2 bg-slate-900 text-white font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Cấp</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// 1. LƯỚI MÓN ĂN (CÓ Ô TÌM KIẾM GÕ TỪNG CHỮ + LỌC 5⭐ -> 1⭐)
// ============================================================================
function calcTierFromAvg(count: number, avg: number | null) {
  if (!count || !avg) return "NEW";
  if (avg >= 4.5) return "S";
  if (avg >= 4.0) return "A";
  if (avg >= 3.0) return "B";
  if (avg >= 2.0) return "C";
  return "D";
}

export function CompactDishGrid({
  dishes, reviewsByDish, currentUser, profileMap, allCustomRoles = [], onAssignRole, onRevokeRole, onUpsertReview, onDeleteReview,
}: {
  dishes: any[]; reviewsByDish: Record<string, any[]>; currentUser: CurrentUserClientInfo; profileMap: EnrichedProfileMap;
  allCustomRoles?: CustomRoleOption[]; onAssignRole?: (fd: FormData) => Promise<void>; onRevokeRole?: (fd: FormData) => Promise<void>;
  onUpsertReview: (fd: FormData) => Promise<void>; onDeleteReview: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [localDishes, setLocalDishes] = useState<any[]>(dishes);
  const [localReviewsMap, setLocalReviewsMap] = useState<Record<string, any[]>>(reviewsByDish);

  // Lọc Sáng/Trưa & Dị ứng trực tiếp trên trình duyệt (0ms delay, không cần chờ Server)
  const [activeMeal, setActiveMeal] = useState<"breakfast" | "lunch">("lunch");
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [dishSearchQuery, setDishSearchQuery] = useState<string>("");

  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [reviewerKey, setReviewerKey] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [selectedTag, setSelectedTag] = useState<string>("#ĐậmĐà");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [starFilter, setStarFilter] = useState<number | null>(null);

  useEffect(() => { setLocalDishes(dishes); }, [dishes]);
  useEffect(() => { setLocalReviewsMap(reviewsByDish); }, [reviewsByDish]);
  useEffect(() => {
    setReviewerKey(getOrCreateReviewerKey(currentUser.email));
    setReviewerName(currentUser.displayName || localStorage.getItem("foodhub_student_name") || "");
  }, [currentUser.email, currentUser.displayName]);

  const filterTags = ["#nước", "#tôm", "#bò", "#heo", "#gà", "#hải-sản", "#trứng", "#chay"];

  const toggleExcludeTag = (tag: string) => {
    setExcludedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const selectedDish = localDishes.find((d) => d.id === selectedDishId) || null;
  const normalizedDishQuery = normText(dishSearchQuery);

  const visibleDishes = localDishes.filter((d) => {
    if (d.meal_time !== activeMeal && d.meal_time !== "all_day") return false;
    if (excludedTags.length > 0) {
      const dTags: string[] = Array.isArray(d.ingredient_tags) ? d.ingredient_tags : [];
      if (excludedTags.some((ex) => dTags.includes(ex))) return false;
    }
    if (!normalizedDishQuery) return true;
    return (
      normText(d.name).includes(normalizedDishQuery) ||
      normText(d.category_name).includes(normalizedDishQuery) ||
      normText((d.ingredient_tags || []).join(" ")).includes(normalizedDishQuery)
    );
  });

  const openDishModal = (dish: any) => {
    setSelectedDishId(dish.id);
    setStarFilter(null);
    const dishReviews = localReviewsMap[dish.id] || [];
    const myExisting = dishReviews.find((r) => r.reviewer_key === reviewerKey || (currentUser.email && r.reviewer_email === currentUser.email));
    if (myExisting) {
      setRating(myExisting.rating); setBody(myExisting.body || ""); setSelectedTag(myExisting.tags?.[0] || "#ĐậmĐà");
      if (!currentUser.email && myExisting.reviewer_name) setReviewerName(myExisting.reviewer_name);
    } else {
      setRating(5); setBody(""); setSelectedTag("#ĐậmĐà");
    }
  };

  const syncDishStats = (dishId: string, list: any[]) => {
    const count = list.length;
    const avg = count > 0 ? Math.round((list.reduce((a, r) => a + Number(r.rating || 0), 0) / count) * 10) / 10 : null;
    setLocalDishes((prev) => prev.map((d) => d.id === dishId ? { ...d, review_count: count, average_rating: avg, dish_tier: calcTierFromAvg(count, avg) } : d));
  };

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDish) return;
    const fd = new FormData(e.currentTarget);
    if (!currentUser.email && reviewerName) localStorage.setItem("foodhub_student_name", reviewerName);
    const effectiveKey = currentUser.email ? `google_${currentUser.email}` : reviewerKey;
    const optimistic = {
      id: "temp_" + Date.now(), dish_id: selectedDish.id, reviewer_key: effectiveKey,
      reviewer_name: currentUser.displayName || reviewerName || "Học sinh",
      reviewer_email: currentUser.email, reviewer_avatar: currentUser.avatarUrl, reviewer_badge: currentUser.roleBadge,
      rating, body: body.trim() || null, tags: [selectedTag], created_at: new Date().toISOString(),
    };
    const nextList = [optimistic, ...(localReviewsMap[selectedDish.id] || []).filter((r) => r.reviewer_key !== effectiveKey && !(currentUser.email && r.reviewer_email === currentUser.email))];
    setLocalReviewsMap((prev) => ({ ...prev, [selectedDish.id]: nextList }));
    syncDishStats(selectedDish.id, nextList);
    emitInstantSync({ type: "review_upsert", review: optimistic });
    await onUpsertReview(fd); router.refresh();
  };

  const handleReviewDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDish) return;
    const fd = new FormData(e.currentTarget);
    const effectiveKey = myReview?.reviewer_key || reviewerKey;
    const nextList = (localReviewsMap[selectedDish.id] || []).filter((r) => r.reviewer_key !== reviewerKey && !(currentUser.email && r.reviewer_email === currentUser.email));
    setLocalReviewsMap((prev) => ({ ...prev, [selectedDish.id]: nextList }));
    syncDishStats(selectedDish.id, nextList);
    emitInstantSync({ type: "review_delete", dish_id: selectedDish.id, reviewer_key: effectiveKey });
    await onDeleteReview(fd); router.refresh();
  };

  const getTierStyle = (t: string) => t === "S" ? "bg-amber-100 text-amber-900 border-amber-300" : t === "A" ? "bg-teal-50 text-[#0F766E] border-teal-200" : t === "B" ? "bg-blue-50 text-blue-800 border-blue-200" : t === "C" ? "bg-orange-50 text-orange-800 border-orange-200" : t === "D" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200";

  const currentDishReviews = selectedDish ? localReviewsMap[selectedDish.id] || [] : [];
  const myReview = currentDishReviews.find((r) => r.reviewer_key === reviewerKey || (currentUser.email && r.reviewer_email === currentUser.email));

  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  currentDishReviews.forEach((r) => {
    const s = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
    starCounts[s] = (starCounts[s] || 0) + 1;
  });

  const filteredReviews = starFilter === null
    ? currentDishReviews
    : currentDishReviews.filter((r) => Math.round(Number(r.rating)) === starFilter);

  return (
    <div className="space-y-4">
      {/* THANH CHỌN BUỔI SÁNG/TRƯA & NÚT DỊ ỨNG TỨC THÌ (0MS DELAY) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100">
          <button
            type="button"
            onClick={() => setActiveMeal("breakfast")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMeal === "breakfast" ? "bg-white text-[#0F766E] shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🌅 Điểm tâm sáng
          </button>
          <button
            type="button"
            onClick={() => setActiveMeal("lunch")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMeal === "lunch" ? "bg-white text-[#0F766E] shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🍱 Đồ ăn trưa
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-slate-500 font-medium mr-1">Không ăn / Dị ứng:</span>
          {filterTags.map((tag) => {
            const isExcluded = excludedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleExcludeTag(tag)}
                className={`px-2.5 py-1 rounded-full font-semibold border transition cursor-pointer active:scale-95 ${
                  isExcluded
                    ? "bg-red-50 text-red-700 border-red-200 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {isExcluded ? `🚫 Đã ẩn ${tag}` : tag}
              </button>
            );
          })}
          {excludedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setExcludedTags([])}
              className="text-[11px] font-bold text-[#0F766E] underline ml-1 cursor-pointer"
            >
              Hiện lại tất cả
            </button>
          )}
        </div>
      </div>

      {/* Ô TÌM KIẾM MÓN ĂN GÕ TỪNG CHỮ */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#0F766E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={dishSearchQuery}
          onChange={(e) => setDishSearchQuery(e.target.value)}
          placeholder="Gõ tên món ăn bất kỳ để lọc ngay từng chữ (VD: suon, com ga, hu tieu, chay...)"
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white transition"
        />
        {dishSearchQuery && (
          <button
            type="button"
            onClick={() => setDishSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {visibleDishes.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
          Không có món ăn nào trong mục này khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
          {visibleDishes.map((dish) => (
            <div key={dish.id} onClick={() => openDishModal(dish)} className="group cursor-pointer rounded-2xl border border-slate-200 hover:border-[#0F766E] bg-white p-4 transition-all hover:shadow-md flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">{dish.category_icon} {dish.category_name}</span>
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getTierStyle(dish.dish_tier)}`}>
                    Tier {dish.dish_tier} • {dish.average_rating ? `${dish.average_rating}⭐` : "Chưa có sao"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-[#0F766E] transition line-clamp-1">{dish.name}</h3>
                  {dish.image_url && <span className="text-[10px] font-bold bg-teal-50 text-[#0F766E] px-2 py-0.5 rounded-md shrink-0">📷 Có ảnh</span>}
                </div>
                {dish.ingredient_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dish.ingredient_tags.map((t: string) => <span key={t} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#0F766E] text-sm">{dish.price_vnd ? `${dish.price_vnd.toLocaleString("vi-VN")}đ` : "Theo phiếu ăn"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 group-hover:text-[#0F766E]">Xem & Lọc sao ({dish.review_count}) →</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setLikedMap((p) => ({ ...p, [dish.id]: !p[dish.id] })); }} className={`p-1.5 rounded-xl border cursor-pointer ${likedMap[dish.id] ? "bg-rose-50 border-rose-200 text-rose-600" : "border-slate-200 text-slate-400"}`}>
                    <Heart className={`w-3.5 h-3.5 ${likedMap[dish.id] ? "fill-rose-500" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDish && (
        <div onClick={() => setSelectedDishId(null)} className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{selectedDish.category_icon} {selectedDish.category_name}</span>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${getTierStyle(selectedDish.dish_tier)}`}>
                    Tier {selectedDish.dish_tier} • {selectedDish.average_rating ? `${selectedDish.average_rating}⭐ (${selectedDish.review_count} đánh giá)` : "Chưa có sao"}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">{selectedDish.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDishId(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {selectedDish.image_url && <img src={selectedDish.image_url} alt={selectedDish.name} className="w-full h-52 object-cover rounded-2xl border border-slate-200" />}

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Giá bán:</span>
                <span className="font-extrabold text-base text-[#0F766E]">{selectedDish.price_vnd ? `${selectedDish.price_vnd.toLocaleString("vi-VN")}đ` : "Theo phiếu ăn"}</span>
              </div>
              <p className="text-slate-600"><strong>Mô tả:</strong> {selectedDish.description || "Món ăn phục vụ tại căn tin nhà trường."}</p>
            </div>

            <div className="rounded-2xl border-2 border-teal-600/20 bg-teal-50/30 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{myReview ? `✅ Bạn đã chấm ${myReview.rating}⭐` : "⭐ Đánh giá món ăn này"}</span>
                {myReview && (
                  <form onSubmit={handleReviewDelete}>
                    <input type="hidden" name="dish_id" value={selectedDish.id} />
                    <input type="hidden" name="reviewer_key" value={myReview.reviewer_key || reviewerKey} />
                    <button type="submit" className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-xl font-bold cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>
                  </form>
                )}
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <input type="hidden" name="dish_id" value={selectedDish.id} />
                <input type="hidden" name="reviewer_key" value={reviewerKey} />
                <input type="hidden" name="rating" value={rating} />
                <input type="hidden" name="tag" value={selectedTag} />

                {currentUser.email && (
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-teal-200">
                    <span className="text-[11px] text-slate-500 font-semibold">Đánh giá dưới tên:</span>
                    <UserIdentityBadge name={currentUser.displayName || "Học sinh"} email={currentUser.email} avatar={currentUser.avatarUrl} systemBadge={currentUser.roleBadge} profileMap={profileMap} currentUser={currentUser} allCustomRoles={allCustomRoles} onAssignRole={onAssignRole} onRevokeRole={onRevokeRole} />
                  </div>
                )}

                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Chọn mức điểm (1 - 5 sao):</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setRating(s)} className="p-0.5 cursor-pointer hover:scale-110 transition">
                        <Star className={`w-6 h-6 ${s <= rating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-slate-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {["#ĐậmĐà", "#NhiềuThịt", "#NóngHổi", "#ĐángTiền", "#HơiMặn", "#CơmDẻo"].map((t) => (
                    <button key={t} type="button" onClick={() => setSelectedTag(t)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${selectedTag === t ? "bg-[#0F766E] text-white border-[#0F766E]" : "bg-white text-slate-600 border-slate-200"}`}>{t}</button>
                  ))}
                </div>

                {currentUser.email ? (
                  <input name="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nhận xét về hương vị, khẩu phần..." className="w-full p-2.5 bg-white border border-slate-200 rounded-xl" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input name="reviewer_name" required value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Tên bạn *" className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold" />
                    <input name="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nhận xét về hương vị..." className="sm:col-span-2 p-2.5 bg-white border border-slate-200 rounded-xl" />
                  </div>
                )}

                <button type="submit" className="w-full py-2.5 bg-[#0F766E] text-white font-bold rounded-xl hover:bg-[#0F766E]/90 inline-flex items-center justify-center gap-1.5 cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5" /> <span>{myReview ? `Cập nhật ngay (${rating}⭐)` : `Gửi đánh giá (${rating}⭐)`}</span>
                </button>
              </form>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#0F766E]" />
                  Phân loại đánh giá theo số sao ({currentDishReviews.length})
                </span>
                {starFilter !== null && (
                  <button type="button" onClick={() => setStarFilter(null)} className="text-[11px] font-bold text-[#0F766E] hover:underline cursor-pointer">
                    Xem tất cả ({currentDishReviews.length})
                  </button>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
                {[5, 4, 3, 2, 1].map((starLevel) => {
                  const count = starCounts[starLevel] || 0;
                  const pct = currentDishReviews.length > 0 ? Math.round((count / currentDishReviews.length) * 100) : 0;
                  const isSelected = starFilter === starLevel;
                  return (
                    <button key={starLevel} type="button" onClick={() => setStarFilter(isSelected ? null : starLevel)} className={`w-full flex items-center gap-2.5 px-2 py-1 rounded-xl transition cursor-pointer ${isSelected ? "bg-teal-50 ring-1 ring-[#0F766E]" : "hover:bg-slate-100"}`}>
                      <span className="w-10 text-left font-extrabold text-slate-700">{starLevel} ⭐</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] font-bold text-slate-500">{count} lượt ({pct}%)</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button type="button" onClick={() => setStarFilter(null)} className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] border transition cursor-pointer ${starFilter === null ? "bg-[#0F766E] text-white border-[#0F766E]" : "bg-white text-slate-600 border-slate-200"}`}>
                  Tất cả ({currentDishReviews.length})
                </button>
                {[5, 4, 3, 2, 1].map((starLevel) => {
                  const count = starCounts[starLevel] || 0;
                  const active = starFilter === starLevel;
                  return (
                    <button key={starLevel} type="button" onClick={() => setStarFilter(active ? null : starLevel)} className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] border transition cursor-pointer ${active ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-white text-slate-700 border-slate-200"}`}>
                      {starLevel} ⭐ ({count})
                    </button>
                  );
                })}
              </div>

              {filteredReviews.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-bold">{starFilter !== null ? `Chưa có ai chấm ${starFilter}⭐ cho món này.` : "Chưa có nhận xét nào."}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredReviews.map((rev: any) => (
                    <div key={rev.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <UserIdentityBadge name={rev.reviewer_name || "Học sinh"} email={rev.reviewer_email} avatar={rev.reviewer_avatar} systemBadge={rev.reviewer_badge} profileMap={profileMap} currentUser={currentUser} allCustomRoles={allCustomRoles} onAssignRole={onAssignRole} onRevokeRole={onRevokeRole} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-500 font-bold">{"⭐".repeat(rev.rating)}</span>
                          {rev.tags?.[0] && <span className="text-[10px] font-bold bg-teal-50 text-[#0F766E] px-2 py-0.5 rounded">{rev.tags[0]}</span>}
                        </div>
                      </div>
                      {rev.body ? <p className="text-slate-700 pl-8">{rev.body}</p> : <p className="text-slate-400 italic text-[11px] pl-8">(Chỉ chấm {rev.rating}⭐)</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. SÀN ĐỔI PHIẾU ĂN & NÚT COPY GỢI Ý TUẦN
// ============================================================================
export function SmartTicketSwapBoard({
  weeklyItems, swaps, currentUser, onCreateSwap, onAcceptSwap, onReopenSwap, onDeleteSwap,
}: {
  weeklyItems: any[]; swaps: any[]; currentUser?: CurrentUserClientInfo;
  onCreateSwap: (fd: FormData) => Promise<void>; onAcceptSwap: (fd: FormData) => Promise<void>;
  onReopenSwap: (fd: FormData) => Promise<void>; onDeleteSwap: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [localSwaps, setLocalSwaps] = useState<any[]>(swaps);
  const [selectedDay, setSelectedDay] = useState<number>(() => { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d : 1; });
  const [haveSlot, setHaveSlot] = useState<number>(1);
  const [wantSlot, setWantSlot] = useState<number>(2);
  const [contactNote, setContactNote] = useState<string>("");
  const [acceptingSwapId, setAcceptingSwapId] = useState<string | null>(null);

  useEffect(() => { setLocalSwaps(swaps); }, [swaps]);
  const dayMenu = (weeklyItems ?? []).filter((i) => Number(i.day_of_week) === selectedDay);
  const getSlotDishName = (s: number) => dayMenu.find((i) => Number(i.slot_number) === s)?.dish_name || `Món số ${s}`;

  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="font-bold text-slate-700">📅 Chọn ngày cần đổi phiếu ăn:</span>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`px-3.5 py-1.5 rounded-xl font-extrabold cursor-pointer ${selectedDay === d ? "bg-[#0F766E] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Thứ {d + 1}</button>
          ))}
        </div>
      </div>

      <form onSubmit={async (e) => {
        e.preventDefault(); if (haveSlot === wantSlot) return;
        const fd = new FormData(e.currentTarget);
        setLocalSwaps((p) => [{ id: "temp_" + Date.now(), creator_name: String(fd.get("student_name") || currentUser?.displayName || "Học sinh"), day_of_week: selectedDay, have_slot: haveSlot, want_slot: wantSlot, have_dish_name: getSlotDishName(haveSlot), want_dish_name: getSlotDishName(wantSlot), contact_note: contactNote, status: "open" }, ...p]);
        setContactNote(""); await onCreateSwap(fd); router.refresh();
      }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-teal-50/40 p-4 rounded-2xl border border-teal-200">
        <input type="hidden" name="day_of_week" value={selectedDay} />
        <input type="hidden" name="have_dish_name" value={getSlotDishName(haveSlot)} />
        <input type="hidden" name="want_dish_name" value={getSlotDishName(wantSlot)} />
        <div>
          <label className="font-bold text-slate-700 block mb-1">1. Người đăng *</label>
          <input name="student_name" required defaultValue={currentUser?.displayName || ""} placeholder="VD: Khoa 11A1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold" />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">2. Phiếu ĐANG CÓ *</label>
          <select name="have_slot" value={haveSlot} onChange={(e) => setHaveSlot(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold">
            {[1, 2, 3, 4].map((s) => <option key={s} value={s}>Món {s}: {getSlotDishName(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">3. Phiếu MUỐN ĐỔI *</label>
          <select name="want_slot" value={wantSlot} onChange={(e) => setWantSlot(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-[#0F766E]">
            {[1, 2, 3, 4].map((s) => <option key={s} value={s}>Món {s}: {getSlotDishName(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">4. Điểm hẹn *</label>
          <div className="flex gap-1.5">
            <input name="contact_note" required value={contactNote} onChange={(e) => setContactNote(e.target.value)} placeholder="VD: 11h30 cầu thang B" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl" />
            <button type="submit" disabled={haveSlot === wantSlot} className="px-4 py-2.5 bg-[#0F766E] disabled:bg-slate-300 text-white font-bold rounded-xl cursor-pointer shrink-0">Đăng</button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {localSwaps.map((sw: any) => {
          const isMatched = sw.status === "completed";
          const isAcceptOpen = acceptingSwapId === sw.id;
          return (
            <div key={sw.id} className={`p-4 rounded-2xl border space-y-3 ${isMatched ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-[10px] mr-1.5">Thứ {Number(sw.day_of_week || 1) + 1}</span>
                  <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${isMatched ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-900"}`}>{isMatched ? "✅ Đã chốt kèo" : "⏳ Đang tìm người đổi"}</span>
                  <p className="font-extrabold text-sm text-slate-900 pt-1">Có Món {sw.have_slot} ({sw.have_dish_name}) 🔄 Đổi Món {sw.want_slot} ({sw.want_dish_name})</p>
                </div>
                <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); setLocalSwaps((p) => p.filter((x) => x.id !== sw.id)); await onDeleteSwap(fd); router.refresh(); }}>
                  <input type="hidden" name="swap_id" value={sw.id} />
                  <button type="submit" className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </form>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 space-y-1 text-[11px]">
                <p>👤 Người đăng: <strong>{sw.creator_name}</strong> • 📍 Hẹn: <strong>{sw.contact_note}</strong></p>
                {isMatched && <p className="text-emerald-800 font-bold pt-1 border-t border-emerald-200">🤝 Người nhận: {sw.accepter_name} {sw.counter_location ? `(📌 Đổi chỗ hẹn: ${sw.counter_location})` : "(✔ Giữ nguyên chỗ hẹn)"}</p>}
              </div>
              {!isMatched ? (
                <div className="space-y-2">
                  <button type="button" onClick={() => setAcceptingSwapId(isAcceptOpen ? null : sw.id)} className="w-full py-2 bg-[#0F766E] text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"><Handshake className="w-4 h-4" /> {isAcceptOpen ? "Đóng khung" : "🤝 Nhận đổi phiếu này"}</button>
                  {isAcceptOpen && (
                    <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); setLocalSwaps((p) => p.map((x) => x.id === sw.id ? { ...x, status: "completed", accepter_name: String(fd.get("accepter_name")), counter_location: String(fd.get("counter_location") || "") || null } : x)); setAcceptingSwapId(null); await onAcceptSwap(fd); router.refresh(); }} className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                      <input type="hidden" name="swap_id" value={sw.id} />
                      <input name="accepter_name" required defaultValue={currentUser?.displayName || ""} placeholder="Tên & Lớp của bạn *" className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold" />
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2">
                        <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                        <input name="counter_location" placeholder={`Đổi chỗ hẹn? (Mặc định: ${sw.contact_note})`} className="w-full py-2 focus:outline-none" />
                      </div>
                      <button type="submit" className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer">✅ Xác nhận Chốt Kèo</button>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); setLocalSwaps((p) => p.map((x) => x.id === sw.id ? { ...x, status: "open" } : x)); await onReopenSwap(fd); router.refresh(); }} className="flex justify-end">
                  <input type="hidden" name="swap_id" value={sw.id} />
                  <button type="submit" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 underline cursor-pointer"><RotateCcw className="w-3 h-3" /> Mở lại kèo</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CopyWeeklyPicksButton({ summaryText }: { summaryText: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(summaryText); setCopied(true); setTimeout(() => setCopied(false), 2500); }} className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-[#0F766E] border border-teal-200 px-3.5 py-2 rounded-xl hover:bg-teal-100 cursor-pointer">
      {copied ? <><Check className="w-4 h-4 text-emerald-600" /> Đã copy!</> : <><Copy className="w-4 h-4" /> Copy Gợi ý cả tuần</>}
    </button>
  );
}

// ============================================================================
// 3. DIỄN ĐÀN (FORUM): TỰ CUỘN TIN NHẮN MỚI + ĐỒNG BỘ ĐIỂM THỰC THẦN TỨC THÌ
// ============================================================================
const EMOJI_LIST = ["❤️", "😂", "🔥", "🤤", "😢"];

export function ForumSectionClient({
  posts, commentsByPost, currentUser, profileMap, allCustomRoles = [], onAssignRole, onRevokeRole, onCreatePost, onDeletePost, onCreateComment, onDeleteComment, onReactItem,
}: {
  posts: any[]; commentsByPost: Record<string, any[]>; currentUser: CurrentUserClientInfo; profileMap: EnrichedProfileMap;
  allCustomRoles?: CustomRoleOption[]; onAssignRole?: (fd: FormData) => Promise<void>; onRevokeRole?: (fd: FormData) => Promise<void>;
  onCreatePost: (fd: FormData) => Promise<void>; onDeletePost: (fd: FormData) => Promise<void>;
  onCreateComment: (fd: FormData) => Promise<void>; onDeleteComment: (fd: FormData) => Promise<void>; onReactItem: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [localPosts, setLocalPosts] = useState<any[]>(posts);
  const [localCommentsMap, setLocalCommentsMap] = useState<Record<string, any[]>>(commentsByPost);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [guestAuthor, setGuestAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Tìm kiếm gõ từng chữ & Danh sách ID bài Forum đã Yêu thích (giữ đúng thứ tự bấm)
  const [forumSearch, setForumSearch] = useState("");
  const [showOnlyFav, setShowOnlyFav] = useState(false);
  const [favPostIds, setFavPostIds] = useState<string[]>([]);

  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(posts[0]?.id ?? null);
  const [replyingToMap, setReplyingToMap] = useState<Record<string, string>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const commentsScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const favStorageKey = `foodhub_fav_forums_${currentUser.email || "guest"}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(favStorageKey);
      if (saved) setFavPostIds(JSON.parse(saved));
    } catch {}
  }, [favStorageKey]);

  // Bấm Yêu thích / Bỏ yêu thích: Cập nhật 0ms không cần reload & Xếp theo thứ tự yêu thích
  const toggleFavoritePost = (postId: string) => {
    setFavPostIds((prev) => {
      const exists = prev.includes(postId);
      const next = exists ? prev.filter((id) => id !== postId) : [...prev, postId];
      try { localStorage.setItem(favStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const scrollToBottom = (postId: string) => {
    setTimeout(() => {
      const el = commentsScrollRefs.current[postId];
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 60);
  };

  useEffect(() => { setLocalPosts(posts); }, [posts]);
  useEffect(() => { setLocalCommentsMap(commentsByPost); if (openCommentPostId) scrollToBottom(openCommentPostId); }, [commentsByPost, openCommentPostId]);

  const handleUploadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > 720) { h = Math.round((h * 720) / w); w = 720; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setImageUrl(canvas.toDataURL("image/jpeg", 0.82)); setUploading(false);
      };
      img.src = String(e.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleReaction = async (targetType: "post" | "comment", targetId: string, emoji: string, postId?: string) => {
    if (targetType === "post") {
      setLocalPosts((p) => p.map((x) => x.id === targetId ? { ...x, reactions: { ...(x.reactions || {}), [emoji]: Number(x.reactions?.[emoji] || 0) + 1 } } : x));
    } else if (postId) {
      setLocalCommentsMap((p) => ({ ...p, [postId]: (p[postId] || []).map((c) => c.id === targetId ? { ...c, reactions: { ...(c.reactions || {}), [emoji]: Number(c.reactions?.[emoji] || 0) + 1 } } : c) }));
    }
    const fd = new FormData(); fd.set("target_type", targetType); fd.set("target_id", targetId); fd.set("emoji", emoji);
    await onReactItem(fd); router.refresh();
  };

  // Lọc theo từng chữ gõ vào + Sắp xếp bài Yêu thích lên đầu theo đúng thứ tự đã bấm
  const q = normText(forumSearch);
  const filteredAndSortedPosts = localPosts
    .filter((post) => {
      if (showOnlyFav && !favPostIds.includes(post.id)) return false;
      if (!q) return true;
      const postComments = localCommentsMap[post.id] || [];
      const commentsText = postComments.map((c: any) => `${c.author_name} ${c.body}`).join(" ");
      return (
        normText(post.title).includes(q) ||
        normText(post.body).includes(q) ||
        normText(post.author_name).includes(q) ||
        normText(commentsText).includes(q)
      );
    })
    .sort((a, b) => {
      const favIndexA = favPostIds.indexOf(a.id);
      const favIndexB = favPostIds.indexOf(b.id);
      const isFavA = favIndexA !== -1;
      const isFavB = favIndexB !== -1;

      if (isFavA && isFavB) return favIndexA - favIndexB; // Giữ đúng thứ tự yêu thích #1, #2, #3...
      if (isFavA) return -1; // Bài yêu thích luôn nằm trên đầu
      if (isFavB) return 1;
      return 0;
    });

  return (
    <div className="space-y-5">
      {/* KHUNG ĐĂNG BÀI VIẾT MỚI */}
      <form onSubmit={async (e) => {
        e.preventDefault(); const fd = new FormData(e.currentTarget); const tempId = "temp_" + Date.now();
        const newPost = { id: tempId, author_name: currentUser.displayName || guestAuthor || "Học sinh", author_email: currentUser.email, author_avatar: currentUser.avatarUrl, author_badge: currentUser.roleBadge, title: postTitle, body: postBody, image_url: imageUrl || null, reactions: {} };
        setLocalPosts((p) => [newPost, ...p]);
        emitInstantSync({ type: "post_create", post: newPost });
        setOpenCommentPostId(tempId); setPostTitle(""); setPostBody(""); setImageUrl(""); await onCreatePost(fd); router.refresh();
      }} onPaste={(e) => { for (const item of Array.from(e.clipboardData?.items || [])) if (item.type.startsWith("image/")) { const f = item.getAsFile(); if (f) handleUploadFile(f); } }} className="bg-slate-50 rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3.5 text-xs">
        <input type="hidden" name="image_url" value={imageUrl} />
        {currentUser.email && (
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-teal-200/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Đăng bài dưới tên:</span>
              <UserIdentityBadge name={currentUser.displayName || "Học sinh"} email={currentUser.email} avatar={currentUser.avatarUrl} systemBadge={currentUser.roleBadge} profileMap={profileMap} currentUser={currentUser} allCustomRoles={allCustomRoles} onAssignRole={onAssignRole} onRevokeRole={onRevokeRole} />
            </div>
            <a href="/profile" className="text-[11px] font-bold text-[#0F766E] hover:underline">Chỉnh Profile & Role →</a>
          </div>
        )}
        {currentUser.email ? (
          <input name="title" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Tiêu đề chủ đề thảo luận..." className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-bold" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="author_name" required value={guestAuthor} onChange={(e) => setGuestAuthor(e.target.value)} placeholder="Tên bạn *" className="p-3 bg-white border border-slate-200 rounded-2xl font-semibold" />
            <input name="title" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Tiêu đề thảo luận *" className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-2xl font-bold" />
          </div>
        )}
        <textarea name="body" required rows={2} value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="Nhập nội dung hoặc bấm Ctrl + V dán ảnh..." className="w-full p-3 bg-white border border-slate-200 rounded-2xl" />
        {imageUrl && <div className="flex items-center gap-2"><img src={imageUrl} alt="Preview" className="h-20 rounded-2xl border object-cover" /><button type="button" onClick={() => setImageUrl("")} className="text-red-600 font-bold underline">Xóa ảnh</button></div>}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-[11px] text-[#0F766E] font-bold inline-flex items-center gap-1.5 bg-white border border-teal-200 px-3.5 py-2 rounded-2xl cursor-pointer">
            <ImageIcon className="w-4 h-4" /> <span>{uploading ? "Đang xử lý..." : "Đính kèm ảnh (Ctrl + V)"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }} />
          </label>
          <button type="submit" className="px-5 py-2.5 bg-[#0F766E] text-white font-bold rounded-2xl inline-flex items-center gap-1.5 cursor-pointer"><MessageSquarePlus className="w-4 h-4" /> Đăng lên Forum</button>
        </div>
      </form>

      {/* THANH TÌM KIẾM FORUM GÕ TỪNG CHỮ + BỘ LỌC YÊU THÍCH */}
      <div className="flex flex-col sm:flex-row gap-2.5 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#0F766E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={forumSearch}
            onChange={(e) => setForumSearch(e.target.value)}
            placeholder="Tìm nhanh chủ đề, nội dung hoặc tên người đăng trong Forum (gõ từng chữ)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:bg-white transition"
          />
          {forumSearch && (
            <button type="button" onClick={() => setForumSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyFav(!showOnlyFav)}
          className={`px-4 py-2.5 rounded-2xl font-extrabold inline-flex items-center justify-center gap-1.5 border transition cursor-pointer shrink-0 ${
            showOnlyFav
              ? "bg-amber-400 text-slate-950 border-amber-500 shadow-2xs"
              : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/60"
          }`}
        >
          <Star className={`w-4 h-4 ${showOnlyFav ? "fill-slate-950" : "text-amber-500 fill-amber-400"}`} />
          <span>Đã yêu thích ({favPostIds.filter((id) => localPosts.some((p) => p.id === id)).length})</span>
        </button>
      </div>

      {/* DANH SÁCH CHỦ ĐỀ FORUM (ĐÃ XẾP BÀI YÊU THÍCH LÊN ĐẦU) */}
      {filteredAndSortedPosts.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
          {showOnlyFav ? "Bạn chưa đánh dấu Yêu thích bài Forum nào." : `Không tìm thấy bài thảo luận nào khớp với "${forumSearch}".`}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedPosts.map((post: any) => {
            const comments = localCommentsMap[post.id] || [];
            const isOpen = openCommentPostId === post.id;
            const canDeletePost = currentUser.isGod || currentUser.canManageSchool || (currentUser.email && post.author_email && currentUser.email === post.author_email.toLowerCase().trim());
            const activeReply = replyingToMap[post.id] || "";
            const favOrder = favPostIds.indexOf(post.id);
            const isFavorited = favOrder !== -1;

            return (
              <div
                key={post.id}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 text-xs shadow-2xs ${
                  isFavorited ? "border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-white ring-1 ring-amber-200/70" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isFavorited && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                          ⭐ Yêu thích #{favOrder + 1}
                        </span>
                      )}
                      <UserIdentityBadge name={post.author_name || "Học sinh"} email={post.author_email} avatar={post.author_avatar} systemBadge={post.author_badge} profileMap={profileMap} currentUser={currentUser} allCustomRoles={allCustomRoles} onAssignRole={onAssignRole} onRevokeRole={onRevokeRole} size="md" />
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900">{post.title}</h3>
                  </div>

                  {/* Cụm nút Yêu thích (Ghim lên đầu) & Xóa bài */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleFavoritePost(post.id)}
                      title={isFavorited ? "Bỏ yêu thích" : "Yêu thích & Đẩy bài này lên đầu Forum"}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-[11px] border transition cursor-pointer hover:scale-105 active:scale-95 ${
                        isFavorited
                          ? "bg-amber-100 border-amber-300 text-amber-900"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:text-amber-700 hover:border-amber-200"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFavorited ? "fill-amber-500 text-amber-500" : ""}`} />
                      <span>{isFavorited ? "Đã thích" : "Yêu thích"}</span>
                    </button>

                    {canDeletePost && (
                      <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); setLocalPosts((p) => p.filter((x) => x.id !== post.id)); emitInstantSync({ type: "post_delete", post_id: post.id }); await onDeletePost(fd); router.refresh(); }}>
                        <input type="hidden" name="post_id" value={post.id} />
                        <button type="submit" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50 font-bold text-[11px] cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>
                      </form>
                    )}
                  </div>
                </div>

                <p className="text-slate-700 text-[13px]">{post.body}</p>
                {post.image_url && <img src={post.image_url} alt={post.title} className="max-h-72 rounded-2xl border object-cover" />}

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {EMOJI_LIST.map((em) => {
                      const cnt = Number(post.reactions?.[em] || 0);
                      return <button key={em} type="button" onClick={() => handleReaction("post", post.id, em)} className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${cnt > 0 ? "bg-teal-50 border-teal-200 text-[#0F766E]" : "bg-slate-50 border-slate-200 text-slate-500"}`}>{em} {cnt > 0 && cnt}</button>;
                    })}
                  </div>
                  <button type="button" onClick={() => { const next = isOpen ? null : post.id; setOpenCommentPostId(next); if (next) scrollToBottom(next); }} className="inline-flex items-center gap-1.5 font-extrabold text-[#0F766E] bg-teal-50/70 px-3.5 py-1.5 rounded-full cursor-pointer">
                    <MessageCircle className="w-4 h-4" /> <span>{isOpen ? `Thu gọn (${comments.length})` : `💬 Thảo luận (${comments.length})`}</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-200/90 space-y-3.5">
                    <div ref={(el) => { commentsScrollRefs.current[post.id] = el; }} className="space-y-2.5 max-h-80 overflow-y-auto pr-1 scroll-smooth">
                      {comments.map((c: any) => {
                        const isOwner = Boolean(currentUser.email && c.author_email && currentUser.email === c.author_email.toLowerCase().trim());
                        const canDel = currentUser.isGod || currentUser.canManageSchool || isOwner;
                        return (
                          <div key={c.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <UserIdentityBadge name={c.author_name || "Học sinh"} email={c.author_email} avatar={c.author_avatar} systemBadge={c.author_badge} profileMap={profileMap} currentUser={currentUser} allCustomRoles={allCustomRoles} onAssignRole={onAssignRole} onRevokeRole={onRevokeRole} />
                                {c.reply_to_name && !c.deleted_by_role && <span className="text-[11px] font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded-lg">↩️ @{c.reply_to_name}</span>}
                              </div>
                              {!c.deleted_by_role && (
                                <div className="flex items-center gap-1.5">
                                  <button type="button" onClick={() => { setReplyingToMap((p) => ({ ...p, [post.id]: c.author_name || "Học sinh" })); setTimeout(() => commentInputRefs.current[post.id]?.focus(), 50); }} className="text-[11px] font-bold text-slate-500 hover:text-[#0F766E] px-2 py-0.5 rounded-lg cursor-pointer"><Reply className="w-3 h-3 inline mr-1" />Trả lời</button>
                                  {canDel && (
                                    <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const role = currentUser.isGod ? "god" : currentUser.canManageSchool && !isOwner ? "admin" : "self"; setLocalCommentsMap((p) => ({ ...p, [post.id]: (p[post.id] || []).map((x) => x.id === c.id ? { ...x, deleted_by_role: role } : x) })); emitInstantSync({ type: "comment_delete", comment_id: c.id, role }); await onDeleteComment(fd); router.refresh(); }}>
                                      <input type="hidden" name="comment_id" value={c.id} />
                                      <button type="submit" className="text-[11px] font-bold text-red-600 px-2 py-0.5 rounded-lg cursor-pointer">{isOwner && !currentUser.isGod && !currentUser.canManageSchool ? <><Undo2 className="w-3 h-3 inline mr-1" />Thu hồi</> : <><Trash2 className="w-3 h-3 inline mr-1" />Xóa</>}</button>
                                    </form>
                                  )}
                                </div>
                              )}
                            </div>
                            {c.deleted_by_role === "god" ? (
                              <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-extrabold flex items-center gap-2"><Crown className="w-4 h-4 text-amber-600" /> (👑 Hoàng Đế đã xóa sổ tin nhắn này)</div>
                            ) : c.deleted_by_role === "admin" ? (
                              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-600" /> (🛡️ Admin nhà trường đã xóa tin nhắn này)</div>
                            ) : c.deleted_by_role === "self" ? (
                              <p className="text-slate-400 italic pl-8">💨 Tin nhắn đã được chính chủ thu hồi.</p>
                            ) : (
                              <>
                                <p className="text-slate-700 pl-8">{c.body}</p>
                                <div className="pl-8 flex items-center gap-1 flex-wrap">
                                  {EMOJI_LIST.map((em) => {
                                    const cnt = Number(c.reactions?.[em] || 0);
                                    return <button key={em} type="button" onClick={() => handleReaction("comment", c.id, em, post.id)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${cnt > 0 ? "bg-teal-50 border-teal-200 text-[#0F766E]" : "bg-slate-50 border-slate-200 text-slate-400"}`}>{em} {cnt > 0 && cnt}</button>;
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {activeReply && (
                      <div className="flex items-center justify-between bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#0F766E]">
                        <span>↩️ Đang trả lời @{activeReply}</span>
                        <button type="button" onClick={() => setReplyingToMap((p) => ({ ...p, [post.id]: "" }))}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    <form onSubmit={async (e) => {
                      e.preventDefault(); const fd = new FormData(e.currentTarget); const txt = (commentInputMap[post.id] || "").trim(); if (!txt) return;
                      const newCmt = { id: "temp_" + Date.now(), post_id: post.id, author_name: currentUser.displayName || String(fd.get("author_name") || "Học sinh"), author_email: currentUser.email, author_avatar: currentUser.avatarUrl, author_badge: currentUser.roleBadge, reply_to_name: activeReply || null, body: txt, reactions: {} };
                      setLocalCommentsMap((p) => ({ ...p, [post.id]: [...(p[post.id] || []), newCmt] }));
                      emitInstantSync({ type: "comment_create", comment: newCmt });
                      setCommentInputMap((p) => ({ ...p, [post.id]: "" })); setReplyingToMap((p) => ({ ...p, [post.id]: "" })); scrollToBottom(post.id); await onCreateComment(fd); router.refresh();
                    }} className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input type="hidden" name="post_id" value={post.id} />
                      <input type="hidden" name="reply_to_name" value={activeReply} />
                      {!currentUser.email && <input name="author_name" required placeholder="Tên bạn *" className="sm:w-36 p-2.5 bg-white border border-slate-200 rounded-xl font-semibold" />}
                      <input ref={(el) => { commentInputRefs.current[post.id] = el; }} name="body" required value={commentInputMap[post.id] || ""} onChange={(e) => setCommentInputMap((p) => ({ ...p, [post.id]: e.target.value }))} placeholder={activeReply ? `Nhắn trả lời @${activeReply}...` : "Viết câu trả lời..."} className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl" />
                      <button type="submit" className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"><Send className="w-3.5 h-3.5" /> Gửi</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}