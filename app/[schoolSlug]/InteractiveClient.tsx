"use client";

import { useState, useEffect, useRef } from "react";
import {
  Star,
  Heart,
  Copy,
  Check,
  MessageSquarePlus,
  Image as ImageIcon,
  Loader2,
  X,
  Trash2,
  Edit3,
  MessageCircle,
  Send,
  Handshake,
  MapPin,
  RotateCcw,
  Reply,
  Crown,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";

export interface CurrentUserClientInfo {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  roleBadge: string;
  isGod: boolean;
  canManageSchool: boolean;
  customRoles: Array<{
    id: string;
    name: string;
    bg_color: string;
    text_color: string;
  }>;
}

export type EnrichedProfileMap = Record<
  string,
  {
    display_name?: string;
    avatar_url?: string;
    roles?: Array<{
      id: string;
      name: string;
      bg_color: string;
      text_color: string;
    }>;
  }
>;

function getOrCreateReviewerKey(userEmail?: string | null): string {
  if (userEmail) return `google_${userEmail}`;
  if (typeof window === "undefined") return "server";
  let key = localStorage.getItem("foodhub_reviewer_key");
  if (!key) {
    key =
      "stu_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36);
    localStorage.setItem("foodhub_reviewer_key", key);
  }
  return key;
}

// Component con: Hiển thị Avatar + Tên + Huy hiệu GOD/Admin + Các Role màu sắc của 1 người
function UserIdentityBadge({
  name,
  email,
  avatar,
  systemBadge,
  profileMap,
  size = "sm",
}: {
  name: string;
  email?: string | null;
  avatar?: string | null;
  systemBadge?: string | null;
  profileMap: EnrichedProfileMap;
  size?: "sm" | "md";
}) {
  const cleanEmail = email?.toLowerCase().trim() || "";
  const enriched = cleanEmail ? profileMap[cleanEmail] : undefined;

  const finalName = enriched?.display_name || name || "Học sinh";
  const finalAvatar = enriched?.avatar_url || avatar || null;
  const customRoles = enriched?.roles || [];

  const isGodUser =
    cleanEmail === "nguyenphutrong11102010@gmail.com" ||
    systemBadge?.includes("GOD");

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {finalAvatar ? (
        <img
          src={finalAvatar}
          alt={finalName}
          className={`${
            size === "md" ? "w-8 h-8" : "w-6 h-6"
          } rounded-full object-cover border border-teal-500/40 shrink-0`}
        />
      ) : (
        <div
          className={`${
            size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"
          } rounded-full bg-[#0F766E] text-white font-extrabold flex items-center justify-center shrink-0`}
        >
          {finalName[0]?.toUpperCase()}
        </div>
      )}

      <span className="font-extrabold text-slate-900">{finalName}</span>

      {/* Huy hiệu chức vụ hệ thống */}
      {isGodUser ? (
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
          👑 GOD
        </span>
      ) : systemBadge &&
        (systemBadge.includes("Admin") || systemBadge.includes("Phó")) ? (
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
          {systemBadge}
        </span>
      ) : null}

      {/* Các Role Danh Hiệu màu sắc (Thực thần, Thánh ăn...) */}
      {customRoles.map((r) => (
        <span
          key={r.id}
          style={{ backgroundColor: r.bg_color, color: r.text_color }}
          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs"
        >
          {r.name}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// 1. LƯỚI THẺ MÓN ĂN + POPUP ĐÁNH GIÁ (ẨN Ô NHẬP TÊN NẾU ĐÃ ĐĂNG NHẬP)
// ============================================================================
export function CompactDishGrid({
  dishes,
  reviewsByDish,
  currentUser,
  profileMap,
  onUpsertReview,
  onDeleteReview,
}: {
  dishes: any[];
  reviewsByDish: Record<string, any[]>;
  currentUser: CurrentUserClientInfo;
  profileMap: EnrichedProfileMap;
  onUpsertReview: (formData: FormData) => Promise<void>;
  onDeleteReview: (formData: FormData) => Promise<void>;
}) {
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  const [reviewerKey, setReviewerKey] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [selectedTag, setSelectedTag] = useState<string>("#ĐậmĐà");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const key = getOrCreateReviewerKey(currentUser.email);
    setReviewerKey(key);
    if (currentUser.displayName) {
      setReviewerName(currentUser.displayName);
    } else {
      const savedName = localStorage.getItem("foodhub_student_name") || "";
      setReviewerName(savedName);
    }
  }, [currentUser.email, currentUser.displayName]);

  const openDishModal = (dish: any) => {
    setSelectedDish(dish);
    const dishReviews = reviewsByDish[dish.id] || [];
    const myExisting = dishReviews.find(
      (r) =>
        r.reviewer_key === reviewerKey ||
        (currentUser.email && r.reviewer_email === currentUser.email)
    );
    if (myExisting) {
      setRating(myExisting.rating);
      setBody(myExisting.body || "");
      setSelectedTag(myExisting.tags?.[0] || "#ĐậmĐà");
      if (!currentUser.email && myExisting.reviewer_name) {
        setReviewerName(myExisting.reviewer_name);
      }
    } else {
      setRating(5);
      setBody("");
      setSelectedTag("#ĐậmĐà");
    }
  };

  const quickTags = [
    "#ĐậmĐà",
    "#NhiềuThịt",
    "#NóngHổi",
    "#ĐángTiền",
    "#HơiMặn",
    "#CơmDẻo",
  ];

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case "S":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "A":
        return "bg-teal-50 text-[#0F766E] border-teal-200";
      case "B":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "C":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "D":
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const currentDishReviews = selectedDish
    ? reviewsByDish[selectedDish.id] || []
    : [];
  const myReview = currentDishReviews.find(
    (r) =>
      r.reviewer_key === reviewerKey ||
      (currentUser.email && r.reviewer_email === currentUser.email)
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
        {dishes.map((dish) => {
          const isLiked = !!likedMap[dish.id];
          return (
            <div
              key={dish.id}
              onClick={() => openDishModal(dish)}
              className="group cursor-pointer rounded-2xl border border-slate-200 hover:border-[#0F766E] bg-white p-4 transition-all hover:shadow-md flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {dish.category_icon} {dish.category_name}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getTierBadgeStyle(
                      dish.dish_tier
                    )}`}
                  >
                    Tier {dish.dish_tier} •{" "}
                    {dish.average_rating
                      ? `${dish.average_rating}⭐`
                      : "Chưa có sao"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-[#0F766E] transition line-clamp-1">
                    {dish.name}
                  </h3>
                  {dish.image_url && (
                    <span className="text-[10px] font-bold bg-teal-50 text-[#0F766E] px-2 py-0.5 rounded-md shrink-0">
                      📷 Có ảnh
                    </span>
                  )}
                </div>

                {dish.ingredient_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dish.ingredient_tags.map((t: string) => (
                      <span
                        key={t}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#0F766E] text-sm">
                  {dish.price_vnd
                    ? `${dish.price_vnd.toLocaleString("vi-VN")}đ`
                    : "Theo phiếu ăn"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 group-hover:text-[#0F766E]">
                    Xem & Chấm sao ({dish.review_count}) →
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLikedMap((prev) => ({
                        ...prev,
                        [dish.id]: !prev[dish.id],
                      }));
                    }}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      isLiked
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "border-slate-200 text-slate-400 hover:text-rose-500"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLiked ? "fill-rose-500" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDish && (
        <div
          onClick={() => setSelectedDish(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-xl my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedDish.category_icon} {selectedDish.category_name}
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${getTierBadgeStyle(
                      selectedDish.dish_tier
                    )}`}
                  >
                    Tier {selectedDish.dish_tier} •{" "}
                    {selectedDish.average_rating
                      ? `${selectedDish.average_rating}⭐ (${selectedDish.review_count} đánh giá)`
                      : "Món mới chưa có sao"}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedDish.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDish(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDish.image_url && (
              <img
                src={selectedDish.image_url}
                alt={selectedDish.name}
                className="w-full h-52 object-cover rounded-2xl border border-slate-200"
              />
            )}

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Giá bán:</span>
                <span className="font-extrabold text-base text-[#0F766E]">
                  {selectedDish.price_vnd
                    ? `${selectedDish.price_vnd.toLocaleString("vi-VN")}đ`
                    : "Theo phiếu ăn"}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                <strong>Mô tả:</strong>{" "}
                {selectedDish.description ||
                  "Món ăn phục vụ tại căn tin nhà trường."}
              </p>
            </div>

            {/* Khung chấm sao */}
            <div className="rounded-2xl border-2 border-teal-600/20 bg-teal-50/30 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">
                  {myReview
                    ? `✅ Bạn đã chấm ${myReview.rating}⭐ cho món này`
                    : "⭐ Đánh giá món ăn này (Mỗi người 1 lượt)"}
                </span>

                {myReview && (
                  <form
                    action={async (fd) => {
                      await onDeleteReview(fd);
                      setSelectedDish(null);
                    }}
                  >
                    <input
                      type="hidden"
                      name="dish_id"
                      value={selectedDish.id}
                    />
                    <input
                      type="hidden"
                      name="reviewer_key"
                      value={myReview.reviewer_key || reviewerKey}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-xl font-bold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa đánh giá</span>
                    </button>
                  </form>
                )}
              </div>

              <form
                action={async (fd) => {
                  if (!currentUser.email && reviewerName) {
                    localStorage.setItem("foodhub_student_name", reviewerName);
                  }
                  await onUpsertReview(fd);
                  setSelectedDish(null);
                }}
                className="space-y-3"
              >
                <input type="hidden" name="dish_id" value={selectedDish.id} />
                <input type="hidden" name="reviewer_key" value={reviewerKey} />
                <input type="hidden" name="rating" value={rating} />
                <input type="hidden" name="tag" value={selectedTag} />

                {/* Nếu ĐÃ ĐĂNG NHẬP: Hiện thẻ Avatar + Tên + Role luôn, ẩn ô nhập tên */}
                {currentUser.email ? (
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-teal-200">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Đánh giá với tư cách:
                    </span>
                    <UserIdentityBadge
                      name={currentUser.displayName || "Học sinh"}
                      email={currentUser.email}
                      avatar={currentUser.avatarUrl}
                      systemBadge={currentUser.roleBadge}
                      profileMap={profileMap}
                    />
                  </div>
                ) : null}

                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">
                    Chọn mức điểm (1 - 5 sao):
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-0.5 cursor-pointer hover:scale-110 transition"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? "fill-[#F59E0B] text-[#F59E0B]"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {quickTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        selectedTag === t
                          ? "bg-[#0F766E] text-white border-[#0F766E]"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Chỉ hiện ô nhập tên nếu CHƯA đăng nhập */}
                {currentUser.email ? (
                  <input
                    name="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Nhận xét về hương vị, khẩu phần..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      name="reviewer_name"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Tên bạn (VD: Khôi 11A) *"
                      className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                    />
                    <input
                      name="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Nhận xét về hương vị, khẩu phần..."
                      className="sm:col-span-2 p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0F766E] text-white font-bold rounded-xl hover:bg-[#0F766E]/90 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>
                    {myReview
                      ? `Cập nhật lại đánh giá (${rating}⭐)`
                      : `Gửi đánh giá (${rating}⭐)`}
                  </span>
                </button>
              </form>
            </div>

            {/* Danh sách nhận xét của mọi người (Hiện đầy đủ Avatar + Tên + Role màu) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <p className="font-bold text-slate-800">
                Nhận xét từ học sinh ({currentDishReviews.length}):
              </p>
              {currentDishReviews.length === 0 ? (
                <p className="text-slate-400 italic">
                  Chưa có nhận xét nào. Hãy là người đầu tiên chấm sao!
                </p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {currentDishReviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <UserIdentityBadge
                          name={rev.reviewer_name || "Học sinh"}
                          email={rev.reviewer_email}
                          avatar={rev.reviewer_avatar}
                          systemBadge={rev.reviewer_badge}
                          profileMap={profileMap}
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-500 font-bold">
                            {"⭐".repeat(rev.rating)}
                          </span>
                          {rev.tags?.[0] && (
                            <span className="text-[10px] font-bold bg-teal-50 text-[#0F766E] px-2 py-0.5 rounded">
                              {rev.tags[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {rev.body && (
                        <p className="text-slate-700 pl-8">{rev.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// 2. SÀN ĐỔI PHIẾU ĂN THÔNG MINH 2 CHIỀU
// ============================================================================
export function SmartTicketSwapBoard({
  weeklyItems,
  swaps,
  currentUser,
  onCreateSwap,
  onAcceptSwap,
  onReopenSwap,
  onDeleteSwap,
}: {
  weeklyItems: any[];
  swaps: any[];
  currentUser?: CurrentUserClientInfo;
  onCreateSwap: (formData: FormData) => Promise<void>;
  onAcceptSwap: (formData: FormData) => Promise<void>;
  onReopenSwap: (formData: FormData) => Promise<void>;
  onDeleteSwap: (formData: FormData) => Promise<void>;
}) {
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const jsDay = new Date().getDay();
    return jsDay >= 1 && jsDay <= 5 ? jsDay : 1;
  });

  const [haveSlot, setHaveSlot] = useState<number>(1);
  const [wantSlot, setWantSlot] = useState<number>(2);
  const [acceptingSwapId, setAcceptingSwapId] = useState<string | null>(null);

  const daysTabs = [
    { day: 1, label: "Thứ 2" },
    { day: 2, label: "Thứ 3" },
    { day: 3, label: "Thứ 4" },
    { day: 4, label: "Thứ 5" },
    { day: 5, label: "Thứ 6" },
  ];

  const dayMenu = (weeklyItems ?? []).filter(
    (item) => Number(item.day_of_week) === selectedDay
  );

  const getSlotDishName = (slotNum: number) => {
    const found = dayMenu.find((i) => Number(i.slot_number) === slotNum);
    return found ? found.dish_name : `Món số ${slotNum}`;
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="font-bold text-slate-700">
          📅 Chọn ngày cần đổi phiếu ăn:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {daysTabs.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => setSelectedDay(d.day)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold transition cursor-pointer ${
                selectedDay === d.day
                  ? "bg-[#0F766E] text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <form
        action={onCreateSwap}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-teal-50/40 p-4 rounded-2xl border border-teal-200"
      >
        <input type="hidden" name="day_of_week" value={selectedDay} />
        <input
          type="hidden"
          name="have_dish_name"
          value={getSlotDishName(haveSlot)}
        />
        <input
          type="hidden"
          name="want_dish_name"
          value={getSlotDishName(wantSlot)}
        />

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            1. Người đăng đổi phiếu *
          </label>
          <input
            name="student_name"
            required
            defaultValue={currentUser?.displayName || ""}
            placeholder="VD: Khoa 11A1"
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            2. Phiếu bạn ĐANG CÓ (Thứ {selectedDay + 1}) *
          </label>
          <select
            name="have_slot"
            value={haveSlot}
            onChange={(e) => setHaveSlot(Number(e.target.value))}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
          >
            {[1, 2, 3, 4].map((slot) => (
              <option key={slot} value={slot}>
                Món {slot}: {getSlotDishName(slot)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            3. Phiếu MUỐN ĐỔI LẤY (Thứ {selectedDay + 1}) *
          </label>
          <select
            name="want_slot"
            value={wantSlot}
            onChange={(e) => setWantSlot(Number(e.target.value))}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-[#0F766E]"
          >
            {[1, 2, 3, 4].map((slot) => (
              <option key={slot} value={slot}>
                Món {slot}: {getSlotDishName(slot)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            4. Điểm hẹn mong muốn *
          </label>
          <div className="flex gap-1.5">
            <input
              name="contact_note"
              required
              placeholder="VD: 11h30 cầu thang dãy B"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
            />
            <button
              type="submit"
              disabled={haveSlot === wantSlot}
              className="px-4 py-2.5 bg-[#0F766E] disabled:bg-slate-300 text-white font-bold rounded-xl hover:bg-[#0F766E]/90 transition cursor-pointer shrink-0"
            >
              Đăng
            </button>
          </div>
        </div>
      </form>

      {swaps.length === 0 ? (
        <p className="text-xs text-slate-500 py-3 text-center">
          Hiện chưa có đơn đổi phiếu ăn nào đang mở.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {swaps.map((sw: any) => {
            const isMatched = sw.status === "completed";
            const isAcceptBoxOpen = acceptingSwapId === sw.id;
            const dayNumber = Number(sw.day_of_week || 1) + 1;

            return (
              <div
                key={sw.id}
                className={`p-4 rounded-2xl border transition space-y-3 ${
                  isMatched
                    ? "bg-emerald-50/50 border-emerald-300"
                    : "bg-white border-slate-200 hover:border-[#0F766E]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-[10px]">
                        Thứ {dayNumber}
                      </span>
                      {isMatched ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[10px]">
                          ✅ Đã chốt kèo đổi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                          ⏳ Đang tìm người đổi
                        </span>
                      )}
                    </div>

                    <p className="font-extrabold text-sm text-slate-900 pt-1">
                      Có Món {sw.have_slot} ({sw.have_dish_name}) 🔄 Đổi lấy Món{" "}
                      {sw.want_slot} ({sw.want_dish_name})
                    </p>
                  </div>

                  <form action={onDeleteSwap}>
                    <input type="hidden" name="swap_id" value={sw.id} />
                    <button
                      type="submit"
                      title="Xóa đơn này"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 space-y-1 text-[11px]">
                  <p className="text-slate-700">
                    👤 Người đăng: <strong>{sw.creator_name}</strong>
                  </p>
                  <p className="text-slate-600">
                    📍 Điểm hẹn gốc: <strong>{sw.contact_note}</strong>
                  </p>

                  {isMatched && (
                    <div className="pt-1.5 mt-1.5 border-t border-emerald-200 space-y-1 text-emerald-900">
                      <p>
                        🤝 Người nhận đổi:{" "}
                        <strong className="text-emerald-700">
                          {sw.accepter_name || "Bạn cùng trường"}
                        </strong>
                      </p>
                      {sw.counter_location ? (
                        <p className="font-bold text-amber-900 bg-amber-100/80 px-2 py-1 rounded-lg">
                          📌 Đề xuất đổi điểm hẹn sang: {sw.counter_location}
                        </p>
                      ) : (
                        <p className="text-emerald-700 font-semibold">
                          ✔ Giữ nguyên điểm hẹn gốc ({sw.contact_note})
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!isMatched ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAcceptingSwapId(isAcceptBoxOpen ? null : sw.id)
                      }
                      className="w-full py-2 px-3 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Handshake className="w-4 h-4" />
                      <span>
                        {isAcceptBoxOpen
                          ? "Đóng khung nhận đổi"
                          : "🤝 Nhận đổi phiếu này (Có thể đổi điểm hẹn)"}
                      </span>
                    </button>

                    {isAcceptBoxOpen && (
                      <form
                        action={async (fd) => {
                          await onAcceptSwap(fd);
                          setAcceptingSwapId(null);
                        }}
                        className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2.5"
                      >
                        <input type="hidden" name="swap_id" value={sw.id} />
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Tên & Lớp của bạn *
                          </label>
                          <input
                            name="accepter_name"
                            required
                            defaultValue={currentUser?.displayName || ""}
                            placeholder="VD: Lan 11B2"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Muốn đổi sang vị trí hẹn khác? (Bỏ trống nếu giữ chỗ
                            cũ)
                          </label>
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2">
                            <MapPin className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                            <input
                              name="counter_location"
                              placeholder={`Mặc định: ${sw.contact_note}`}
                              className="w-full py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
                        >
                          ✅ Xác nhận Chốt Kèo Đổi Phiếu
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <form action={onReopenSwap} className="flex justify-end">
                    <input type="hidden" name="swap_id" value={sw.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Hủy chốt / Mở tìm người khác</span>
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. NÚT COPY NHANH GỢI Ý ĐIỀN FORM TUẦN
// ============================================================================
export function CopyWeeklyPicksButton({
  summaryText,
}: {
  summaryText: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-[#0F766E] border border-teal-200 px-3.5 py-2 rounded-xl hover:bg-teal-100 transition cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Đã copy! Dán vào nhóm lớp ngay</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copy Gợi ý cả tuần gửi Nhóm Lớp</span>
        </>
      )}
    </button>
  );
}

// ============================================================================
// 4. DIỄN ĐÀN (FORUM) SIÊU SINH ĐỘNG: AVATAR + ROLE + EMOJI + TRẢ LỜI + XÓA CÓ DẤU VẾT
// ============================================================================
const EMOJI_LIST = ["❤️", "😂", "🔥", "🤤", "😢"];

export function ForumSectionClient({
  posts,
  commentsByPost,
  currentUser,
  profileMap,
  onCreatePost,
  onDeletePost,
  onCreateComment,
  onDeleteComment,
  onReactItem,
}: {
  posts: any[];
  commentsByPost: Record<string, any[]>;
  currentUser: CurrentUserClientInfo;
  profileMap: EnrichedProfileMap;
  onCreatePost: (formData: FormData) => Promise<void>;
  onDeletePost: (formData: FormData) => Promise<void>;
  onCreateComment: (formData: FormData) => Promise<void>;
  onDeleteComment: (formData: FormData) => Promise<void>;
  onReactItem: (formData: FormData) => Promise<void>;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(
    posts[0]?.id ?? null
  );
  const [replyingToMap, setReplyingToMap] = useState<Record<string, string>>(
    {}
  );
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Nén ảnh dán Ctrl+V trực tiếp thành DataURL để không bao giờ bị lỗi Storage
  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_W = 720;
          let w = img.width;
          let h = img.height;
          if (w > MAX_W) {
            h = Math.round((h * MAX_W) / w);
            w = MAX_W;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setImageUrl(canvas.toDataURL("image/jpeg", 0.82));
          }
          setUploading(false);
        };
        img.src = String(e.target?.result || "");
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) await handleUploadFile(file);
      }
    }
  };

  const handleReplyClick = (postId: string, targetAuthorName: string) => {
    setReplyingToMap((prev) => ({ ...prev, [postId]: targetAuthorName }));
    setTimeout(() => {
      commentInputRefs.current[postId]?.focus();
    }, 50);
  };

  return (
    <div className="space-y-5">
      {/* KHUNG ĐĂNG BÀI VIẾT FORUM MỚI */}
      <form
        action={async (fd) => {
          await onCreatePost(fd);
          setImageUrl("");
        }}
        onPaste={handlePasteImage}
        className="bg-slate-50 rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3.5 text-xs"
      >
        <input type="hidden" name="image_url" value={imageUrl} />

        {/* Nếu ĐÃ ĐĂNG NHẬP: Hiện sẵn Avatar + Tên + Role, ẩn ô nhập tên */}
        {currentUser.email ? (
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-teal-200/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Đăng thảo luận với tư cách:
              </span>
              <UserIdentityBadge
                name={currentUser.displayName || "Học sinh"}
                email={currentUser.email}
                avatar={currentUser.avatarUrl}
                systemBadge={currentUser.roleBadge}
                profileMap={profileMap}
              />
            </div>
            <a
              href="/profile"
              className="text-[11px] font-bold text-[#0F766E] hover:underline"
            >
              Đổi Avatar / Role →
            </a>
          </div>
        ) : null}

        {currentUser.email ? (
          <input
            name="title"
            required
            placeholder="Tiêu đề chủ đề (VD: Hôm nay món số 2 có ngon không mọi người?)"
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              name="author_name"
              required
              placeholder="Tên / Biệt danh của bạn *"
              className="p-3 bg-white border border-slate-200 rounded-2xl font-semibold"
            />
            <input
              name="title"
              required
              placeholder="Tiêu đề chủ đề thảo luận *"
              className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-2xl font-bold"
            />
          </div>
        )}

        <textarea
          name="body"
          required
          rows={2}
          placeholder="Nhập nội dung thảo luận hoặc bấm Ctrl + V để dán ảnh khay cơm vào đây..."
          className="w-full p-3 bg-white border border-slate-200 rounded-2xl"
        />

        {uploading && (
          <div className="inline-flex items-center gap-1.5 text-[#0F766E] font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xử lý ảnh...</span>
          </div>
        )}

        {imageUrl && (
          <div className="flex items-center gap-2">
            <img
              src={imageUrl}
              alt="Ảnh đính kèm"
              className="h-24 rounded-2xl border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="text-xs text-red-600 font-bold underline cursor-pointer"
            >
              Xóa ảnh
            </button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-[11px] text-[#0F766E] font-bold inline-flex items-center gap-1.5 bg-white border border-teal-200 px-3.5 py-2 rounded-2xl cursor-pointer hover:bg-teal-50">
            <ImageIcon className="w-4 h-4" />
            <span>Đính kèm ảnh (Hoặc dán Ctrl + V)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
              }}
            />
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2.5 bg-[#0F766E] text-white font-bold rounded-2xl hover:bg-[#0F766E]/90 inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Đăng lên Forum trường</span>
          </button>
        </div>
      </form>

      {/* DANH SÁCH CÁC CHỦ ĐỀ FORUM */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Chưa có bài thảo luận nào. Hãy mở màn cuộc trò chuyện đầu tiên nhé!
          </p>
        ) : (
          posts.map((post: any) => {
            const comments = commentsByPost[post.id] || [];
            const isOpen = openCommentPostId === post.id;
            const postReactions: Record<string, number> =
              post.reactions && typeof post.reactions === "object"
                ? post.reactions
                : {};

            const isPostOwner = Boolean(
              currentUser.email &&
                post.author_email &&
                currentUser.email === post.author_email.toLowerCase().trim()
            );
            const canDeleteThisPost =
              currentUser.isGod || currentUser.canManageSchool || isPostOwner;

            const activeReplyTarget = replyingToMap[post.id] || "";

            return (
              <div
                key={post.id}
                className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3.5 text-xs shadow-2xs"
              >
                {/* Header Bài Viết: Avatar + Tên + Role + Nút Xóa Forum */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <UserIdentityBadge
                      name={post.author_name || "Học sinh"}
                      email={post.author_email}
                      avatar={post.author_avatar}
                      systemBadge={post.author_badge}
                      profileMap={profileMap}
                      size="md"
                    />
                    <h3 className="font-extrabold text-base text-slate-900 pt-0.5">
                      {post.title}
                    </h3>
                  </div>

                  {/* Nút xóa bài Forum (Cho GOD, Admin trường hoặc Chính chủ) */}
                  {canDeleteThisPost && (
                    <form action={onDeletePost}>
                      <input type="hidden" name="post_id" value={post.id} />
                      <button
                        type="submit"
                        title="Xóa chủ đề Forum này"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 font-bold text-[11px] transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa bài</span>
                      </button>
                    </form>
                  )}
                </div>

                <p className="text-slate-700 leading-relaxed text-[13px]">
                  {post.body}
                </p>

                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="max-h-72 rounded-2xl border border-slate-200 object-cover"
                  />
                )}

                {/* Thanh Tương Tác Bài Viết: Thả Emoji + Nút Mở Khung Chat */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  {/* Dãy nút thả Emoji */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {EMOJI_LIST.map((emoji) => {
                      const count = Number(postReactions[emoji] || 0);
                      return (
                        <form key={emoji} action={onReactItem}>
                          <input type="hidden" name="target_type" value="post" />
                          <input
                            type="hidden"
                            name="target_id"
                            value={post.id}
                          />
                          <input type="hidden" name="emoji" value={emoji} />
                          <button
                            type="submit"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer hover:scale-105 ${
                              count > 0
                                ? "bg-teal-50 border-teal-200 text-[#0F766E]"
                                : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span>{count}</span>}
                          </button>
                        </form>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenCommentPostId(isOpen ? null : post.id)
                    }
                    className="inline-flex items-center gap-1.5 font-extrabold text-[#0F766E] bg-teal-50/70 hover:bg-teal-100/80 px-3.5 py-1.5 rounded-full transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {isOpen
                        ? `Thu gọn cuộc trò chuyện (${comments.length})`
                        : `💬 Vào chat / Thảo luận (${comments.length})`}
                    </span>
                  </button>
                </div>

                {/* KHU VỰC CHAT / BÌNH LUẬN TRỰC TIẾP TRONG BÀI FORUM */}
                {isOpen && (
                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-200/90 space-y-3.5">
                    {comments.length === 0 ? (
                      <p className="text-slate-400 italic text-xs text-center py-2">
                        Chưa có tin nhắn nào. Hãy mở màn cuộc trò chuyện bên
                        dưới nhé!
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {comments.map((c: any) => {
                          const isCommentOwner = Boolean(
                            currentUser.email &&
                              c.author_email &&
                              currentUser.email ===
                                c.author_email.toLowerCase().trim()
                          );
                          const canDeleteComment =
                            currentUser.isGod ||
                            currentUser.canManageSchool ||
                            isCommentOwner;

                          const commentReactions: Record<string, number> =
                            c.reactions && typeof c.reactions === "object"
                              ? c.reactions
                              : {};

                          const deletedRole = c.deleted_by_role;

                          return (
                            <div
                              key={c.id}
                              className="bg-white p-3 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <UserIdentityBadge
                                    name={c.author_name || "Học sinh"}
                                    email={c.author_email}
                                    avatar={c.author_avatar}
                                    systemBadge={c.author_badge}
                                    profileMap={profileMap}
                                  />

                                  {c.reply_to_name && !deletedRole && (
                                    <span className="text-[11px] font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded-lg">
                                      ↩️ Trả lời @{c.reply_to_name}
                                    </span>
                                  )}
                                </div>

                                {/* Cụm nút Trả lời & Thu hồi / Xóa tin nhắn */}
                                {!deletedRole && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReplyClick(
                                          post.id,
                                          c.author_name || "Học sinh"
                                        )
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#0F766E] px-2 py-0.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Reply className="w-3 h-3" />
                                      <span>Trả lời</span>
                                    </button>

                                    {canDeleteComment && (
                                      <form action={onDeleteComment}>
                                        <input
                                          type="hidden"
                                          name="comment_id"
                                          value={c.id}
                                        />
                                        <button
                                          type="submit"
                                          title={
                                            isCommentOwner && !currentUser.isGod
                                              ? "Thu hồi tin nhắn"
                                              : "Xóa sổ tin nhắn này"
                                          }
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-lg cursor-pointer"
                                        >
                                          {isCommentOwner &&
                                          !currentUser.isGod &&
                                          !currentUser.canManageSchool ? (
                                            <>
                                              <Undo2 className="w-3 h-3" />
                                              <span>Thu hồi</span>
                                            </>
                                          ) : (
                                            <>
                                              <Trash2 className="w-3 h-3" />
                                              <span>Xóa</span>
                                            </>
                                          )}
                                        </button>
                                      </form>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* NỘI DUNG TIN NHẮN HOẶC THÔNG BÁO ĐÃ BỊ XÓA SỔ */}
                              {deletedRole === "god" ? (
                                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center gap-2">
                                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>
                                    (👑 Hoàng Đế đã xóa sổ tin nhắn này)
                                  </span>
                                </div>
                              ) : deletedRole === "admin" ? (
                                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>
                                    (🛡️ Admin nhà trường đã xóa tin nhắn này)
                                  </span>
                                </div>
                              ) : deletedRole === "self" ? (
                                <p className="text-slate-400 italic text-xs pl-8">
                                  💨 Tin nhắn đã được chính chủ thu hồi.
                                </p>
                              ) : (
                                <>
                                  <p className="text-slate-700 pl-8 leading-relaxed">
                                    {c.body}
                                  </p>

                                  {/* Thả Emoji cho từng tin nhắn chat */}
                                  <div className="pl-8 flex items-center gap-1 flex-wrap pt-0.5">
                                    {EMOJI_LIST.map((emoji) => {
                                      const cnt = Number(
                                        commentReactions[emoji] || 0
                                      );
                                      return (
                                        <form key={emoji} action={onReactItem}>
                                          <input
                                            type="hidden"
                                            name="target_type"
                                            value="comment"
                                          />
                                          <input
                                            type="hidden"
                                            name="target_id"
                                            value={c.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="emoji"
                                            value={emoji}
                                          />
                                          <button
                                            type="submit"
                                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                              cnt > 0
                                                ? "bg-teal-50 border-teal-200 text-[#0F766E]"
                                                : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-700"
                                            }`}
                                          >
                                            <span>{emoji}</span>
                                            {cnt > 0 && <span>{cnt}</span>}
                                          </button>
                                        </form>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Đang trả lời ai đó */}
                    {activeReplyTarget && (
                      <div className="flex items-center justify-between bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#0F766E]">
                        <span>↩️ Đang trả lời @{activeReplyTarget}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyingToMap((prev) => ({
                              ...prev,
                              [post.id]: "",
                            }))
                          }
                          className="text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* FORM GÕ TIN NHẮN TRẢ LỜI (Ẩn ô nhập tên nếu đã đăng nhập) */}
                    <form
                      action={async (fd) => {
                        await onCreateComment(fd);
                        setReplyingToMap((prev) => ({
                          ...prev,
                          [post.id]: "",
                        }));
                      }}
                      className="flex flex-col sm:flex-row gap-2 pt-1"
                    >
                      <input type="hidden" name="post_id" value={post.id} />
                      <input
                        type="hidden"
                        name="reply_to_name"
                        value={activeReplyTarget}
                      />

                      {!currentUser.email && (
                        <input
                          name="author_name"
                          required
                          placeholder="Tên bạn *"
                          className="sm:w-36 p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                        />
                      )}

                      <input
                        ref={(el) => {
                          commentInputRefs.current[post.id] = el;
                        }}
                        name="body"
                        required
                        placeholder={
                          activeReplyTarget
                            ? `Nhắn trả lời @${activeReplyTarget}...`
                            : currentUser.email
                            ? `Nhắn dưới tên ${currentUser.displayName}...`
                            : "Viết câu trả lời của bạn..."
                        }
                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl"
                      />

                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}