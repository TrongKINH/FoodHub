import { TopFoodiesBoard } from "./TopFoodiesBoard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Utensils,
  Sparkles,
  ArrowLeft,
  Crown,
  Repeat,
  CheckCircle2,
  Trophy,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getCurrentUserRole } from "@/app/lib/auth";
import { AuthButtonClient } from "@/app/AuthButtonClient";
import {
  CompactDishGrid,
  SmartTicketSwapBoard,
  CopyWeeklyPicksButton,
  ForumSectionClient,
  type EnrichedProfileMap,
} from "./InteractiveClient";

export const dynamic = "force-dynamic";

export default async function SchoolHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ meal?: string; exclude?: string }>;
}) {
  const { schoolSlug } = await params;
  const { meal, exclude } = await searchParams;

  const activeMeal = meal === "breakfast" ? "breakfast" : "lunch";
  const supabase = await createServerSupabaseClient();

  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("slug", schoolSlug.toLowerCase())
    .eq("is_active", true)
    .single();

  if (!school) {
    notFound();
  }

  const auth = await getCurrentUserRole(school);

  let dishQuery = supabase
    .from("dishes_with_ranking")
    .select("*")
    .eq("school_id", school.id)
    .in("meal_time", [activeMeal, "all_day"])
    .order("effective_score", { ascending: false });

  if (exclude) {
    dishQuery = dishQuery.not("ingredient_tags", "cs", `{${exclude}}`);
  }

  const [
    { data: dishes },
    { data: allSchoolDishes },
    { data: allReviews },
    { data: weeklyItems },
    { data: swaps },
    { data: forumPosts },
    { data: forumComments },
    { data: userProfiles },
    { data: roleAssignments },
    { data: allCustomRoles },
  ] = await Promise.all([
    dishQuery,
    supabase
      .from("dishes_with_ranking")
      .select("*")
      .eq("school_id", school.id)
      .order("effective_score", { ascending: false }),
    supabase
      .from("reviews")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase
      .from("weekly_menu_with_ranking")
      .select("*")
      .eq("school_id", school.id)
      .eq("is_current_week", true)
      .order("day_of_week", { ascending: true })
      .order("slot_number", { ascending: true }),
    supabase
      .from("ticket_swaps_live")
      .select("*")
      .eq("school_id", school.id)
      .eq("is_currently_open", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("forum_posts")
      .select("*")
      .eq("school_id", school.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("forum_comments")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: true }),
    supabase.from("user_profiles").select("*"),
    supabase.from("user_role_assignments").select("*, custom_roles(*)"),
    supabase
      .from("custom_roles")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const profileMap: EnrichedProfileMap = {};
  (userProfiles ?? []).forEach((p: any) => {
    const em = p.email?.toLowerCase().trim();
    if (em) {
      profileMap[em] = {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        class_name: p.class_name,
        roles: [],
      };
    }
  });

  (roleAssignments ?? []).forEach((ra: any) => {
    const em = ra.user_email?.toLowerCase().trim();
    if (!em || !ra.custom_roles) return;
    if (!profileMap[em]) {
      profileMap[em] = { roles: [] };
    }
    profileMap[em].roles = [
      ...(profileMap[em].roles || []),
      ra.custom_roles,
    ];
  });

  const reviewsByDish: Record<string, any[]> = {};
  (allReviews ?? []).forEach((r: any) => {
    if (!reviewsByDish[r.dish_id]) reviewsByDish[r.dish_id] = [];
    reviewsByDish[r.dish_id].push(r);
  });

  const commentsByPost: Record<string, any[]> = {};
  (forumComments ?? []).forEach((c: any) => {
    if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
    commentsByPost[c.post_id].push(c);
  });

  const currentUserInfo = {
    email: auth.email,
    displayName: auth.displayName,
    avatarUrl: auth.avatarUrl,
    roleBadge: auth.roleBadge,
    isGod: auth.isGod,
    canManageSchool: auth.canManageSchool,
    customRoles: auth.customRoles || [],
  };

  // ==========================================================================
  // SERVER ACTIONS: CẤP & GỠ ROLE TRỰC TIẾP TỪ POPUP PROFILE TRONG FORUM
  // ==========================================================================
  async function assignUserRoleQuickAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    if (!currentAuth.isGod && !currentAuth.canManageSchool) return;

    const user_email = String(formData.get("user_email") ?? "")
      .trim()
      .toLowerCase();
    const role_id = String(formData.get("role_id") ?? "").trim();
    if (!user_email || !role_id) return;

    const sb = await createServerSupabaseClient();
    await sb.from("user_role_assignments").upsert(
      {
        user_email,
        role_id,
        assigned_by: currentAuth.email,
      },
      { onConflict: "user_email,role_id" }
    );

    revalidatePath(`/${school.slug}`);
  }

  async function revokeUserRoleQuickAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    if (!currentAuth.isGod && !currentAuth.canManageSchool) return;

    const user_email = String(formData.get("user_email") ?? "")
      .trim()
      .toLowerCase();
    const role_id = String(formData.get("role_id") ?? "").trim();
    if (!user_email || !role_id) return;

    const sb = await createServerSupabaseClient();
    await sb
      .from("user_role_assignments")
      .delete()
      .eq("user_email", user_email)
      .eq("role_id", role_id);

    revalidatePath(`/${school.slug}`);
  }

  async function upsertReviewAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    const dish_id = String(formData.get("dish_id") ?? "");
    const rawKey = String(formData.get("reviewer_key") ?? "").trim();
    const reviewer_key = currentAuth.email
      ? `google_${currentAuth.email}`
      : rawKey;

    const reviewer_name =
      currentAuth.displayName ||
      String(formData.get("reviewer_name") ?? "").trim() ||
      "Học sinh";

    const rating = Number(formData.get("rating") ?? 5);
    const body = String(formData.get("body") ?? "").trim();
    const tag = String(formData.get("tag") ?? "").trim();

    if (!dish_id || !reviewer_key) return;
    const sb = await createServerSupabaseClient();

    await sb.from("reviews").upsert(
      {
        dish_id,
        reviewer_key,
        reviewer_name,
        reviewer_email: currentAuth.email,
        reviewer_avatar: currentAuth.avatarUrl,
        reviewer_badge: currentAuth.roleBadge,
        rating,
        body: body || null,
        tags: tag ? [tag] : [],
        status: "published",
      },
      { onConflict: "dish_id,reviewer_key" }
    );

    revalidatePath(`/${school.slug}`);
  }

  async function deleteReviewAction(formData: FormData) {
    "use server";
    const dish_id = String(formData.get("dish_id") ?? "");
    const reviewer_key = String(formData.get("reviewer_key") ?? "").trim();
    if (!dish_id || !reviewer_key) return;

    const sb = await createServerSupabaseClient();
    await sb
      .from("reviews")
      .delete()
      .eq("dish_id", dish_id)
      .eq("reviewer_key", reviewer_key);

    revalidatePath(`/${school.slug}`);
  }

  async function createSwapAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    const student_name =
      String(formData.get("student_name") ?? "").trim() ||
      currentAuth.displayName ||
      "Học sinh";
    const day_of_week = Number(formData.get("day_of_week") ?? 1);
    const have_slot = Number(formData.get("have_slot") ?? 1);
    const want_slot = Number(formData.get("want_slot") ?? 2);
    const have_dish_name = String(formData.get("have_dish_name") ?? "").trim();
    const want_dish_name = String(formData.get("want_dish_name") ?? "").trim();
    const contact_note = String(formData.get("contact_note") ?? "").trim();

    if (
      !have_dish_name ||
      !want_dish_name ||
      !contact_note ||
      have_slot === want_slot
    )
      return;

    const sb = await createServerSupabaseClient();
    await sb.from("ticket_swaps").insert({
      school_id: school.id,
      student_name,
      day_of_week,
      have_slot,
      want_slot,
      have_dish_name,
      want_dish_name,
      contact_note,
      status: "open",
    });

    revalidatePath(`/${school.slug}`);
  }

  async function acceptSwapAction(formData: FormData) {
    "use server";
    const swap_id = String(formData.get("swap_id") ?? "");
    const accepter_name = String(
      formData.get("accepter_name") ?? "Học sinh"
    ).trim();
    const counter_location = String(
      formData.get("counter_location") ?? ""
    ).trim();

    if (!swap_id || !accepter_name) return;

    const sb = await createServerSupabaseClient();
    await sb
      .from("ticket_swaps")
      .update({
        status: "completed",
        accepter_name,
        counter_location: counter_location || null,
        closed_at: new Date().toISOString(),
      })
      .eq("id", swap_id);

    revalidatePath(`/${school.slug}`);
  }

  async function reopenSwapAction(formData: FormData) {
    "use server";
    const swap_id = String(formData.get("swap_id") ?? "");
    if (!swap_id) return;

    const sb = await createServerSupabaseClient();
    await sb
      .from("ticket_swaps")
      .update({
        status: "open",
        accepter_name: null,
        counter_location: null,
        closed_at: null,
      })
      .eq("id", swap_id);

    revalidatePath(`/${school.slug}`);
  }

  async function deleteSwapAction(formData: FormData) {
    "use server";
    const swap_id = String(formData.get("swap_id") ?? "");
    if (!swap_id) return;

    const sb = await createServerSupabaseClient();
    await sb.from("ticket_swaps").delete().eq("id", swap_id);

    revalidatePath(`/${school.slug}`);
  }

  async function createForumPostAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    const author_name =
      currentAuth.displayName ||
      String(formData.get("author_name") ?? "").trim() ||
      "Học sinh";
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const image_url = String(formData.get("image_url") ?? "").trim();

    if (!title || !body) return;

    const sb = await createServerSupabaseClient();
    await sb.from("forum_posts").insert({
      school_id: school.id,
      author_name,
      author_email: currentAuth.email,
      author_avatar: currentAuth.avatarUrl,
      author_badge: currentAuth.roleBadge,
      title,
      body,
      image_url: image_url || null,
      status: "published",
    });

    revalidatePath(`/${school.slug}`);
  }

  async function deleteForumPostAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    const post_id = String(formData.get("post_id") ?? "").trim();
    if (!post_id) return;

    const sb = await createServerSupabaseClient();
    const { data: post } = await sb
      .from("forum_posts")
      .select("author_email")
      .eq("id", post_id)
      .single();

    const isOwner = Boolean(
      currentAuth.email &&
        post?.author_email &&
        currentAuth.email === post.author_email.toLowerCase().trim()
    );

    if (!currentAuth.isGod && !currentAuth.canManageSchool && !isOwner) return;

    await sb.from("forum_comments").delete().eq("post_id", post_id);
    await sb.from("forum_posts").delete().eq("id", post_id);

    revalidatePath(`/${school.slug}`);
  }

  async function createForumCommentAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    const post_id = String(formData.get("post_id") ?? "");
    const author_name =
      currentAuth.displayName ||
      String(formData.get("author_name") ?? "").trim() ||
      "Học sinh";
    const body = String(formData.get("body") ?? "").trim();
    const reply_to_name = String(formData.get("reply_to_name") ?? "").trim();

    if (!post_id || !body) return;

    const sb = await createServerSupabaseClient();
    await sb.from("forum_comments").insert({
      post_id,
      author_name,
      author_email: currentAuth.email,
      author_avatar: currentAuth.avatarUrl,
      author_badge: currentAuth.roleBadge,
      reply_to_name: reply_to_name || null,
      body,
      status: "published",
    });

    revalidatePath(`/${school.slug}`);
  }

  async function deleteForumCommentAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole(school);
    const comment_id = String(formData.get("comment_id") ?? "").trim();
    if (!comment_id) return;

    const sb = await createServerSupabaseClient();
    const { data: comment } = await sb
      .from("forum_comments")
      .select("author_email")
      .eq("id", comment_id)
      .single();

    const isOwner = Boolean(
      currentAuth.email &&
        comment?.author_email &&
        currentAuth.email === comment.author_email.toLowerCase().trim()
    );

    if (!currentAuth.isGod && !currentAuth.canManageSchool && !isOwner) return;

    let deleted_by_role = "self";
    let replacementText = "Tin nhắn đã được chính chủ thu hồi.";

    if (currentAuth.isGod) {
      deleted_by_role = "god";
      replacementText = "(Hoàng Đế đã xóa sổ tin nhắn này)";
    } else if (currentAuth.canManageSchool && !isOwner) {
      deleted_by_role = "admin";
      replacementText = "(Admin nhà trường đã xóa tin nhắn này)";
    }

    await sb
      .from("forum_comments")
      .update({
        deleted_by_role,
        body: replacementText,
      })
      .eq("id", comment_id);

    revalidatePath(`/${school.slug}`);
  }

  async function reactForumItemAction(formData: FormData) {
    "use server";
    const target_type = String(formData.get("target_type") ?? "");
    const target_id = String(formData.get("target_id") ?? "");
    const emoji = String(formData.get("emoji") ?? "");

    if (!target_id || !emoji) return;

    const sb = await createServerSupabaseClient();
    const table = target_type === "post" ? "forum_posts" : "forum_comments";

    const { data: current } = await sb
      .from(table)
      .select("reactions")
      .eq("id", target_id)
      .single();

    const reactions: Record<string, number> =
      current?.reactions && typeof current.reactions === "object"
        ? { ...current.reactions }
        : {};

    reactions[emoji] = Number(reactions[emoji] || 0) + 1;

    await sb.from(table).update({ reactions }).eq("id", target_id);
    revalidatePath(`/${school.slug}`);
  }

  const filterTags = [
    "#nước",
    "#tôm",
    "#bò",
    "#heo",
    "#gà",
    "#hải-sản",
    "#trứng",
    "#chay",
  ];

  const bestPickLines = [1, 2, 3, 4, 5]
    .map((d) => {
      const pick = (weeklyItems ?? []).find(
        (i) => i.day_of_week === d && i.is_daily_best_pick
      );
      const fallback = (weeklyItems ?? []).find((i) => i.day_of_week === d);
      const chosen = pick ?? fallback;
      return chosen
        ? `• Thứ ${d + 1}: Chọn Số ${chosen.slot_number} (${chosen.dish_name})`
        : null;
    })
    .filter(Boolean)
    .join("\n");

  const copySummaryText = `🍱 GỢI Ý ĐIỀN FORM MÓN ĂN TUẦN (${school.short_name}):\n${bestPickLines}\n👉 Xem bảng xếp hạng tại FoodHub!`;

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Đổi trường"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold bg-[#0F766E] text-white px-2.5 py-0.5 rounded-full">
                  {school.short_name}
                </span>
                <h1 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-1">
                  {school.name}
                </h1>
              </div>
              <p className="text-[11px] text-slate-500">
                Bấm vào từng món để xem ảnh chi tiết • Bấm vào tên thành viên để
                xem Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {auth.canManageSchool && (
              <a
                href={`/${school.slug}/admin`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-3.5 py-2 rounded-2xl hover:bg-slate-800 transition"
              >
                <span>🛠️ Quản lý Căn tin</span>
              </a>
            )}
            {auth.isGod && (
              <a
                href="/admin/god"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#F59E0B] text-slate-950 px-3.5 py-2 rounded-2xl shadow-2xs hover:bg-[#F59E0B]/90 transition"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>GOD Mode</span>
              </a>
            )}
            <AuthButtonClient
              userEmail={auth.email}
              displayName={auth.displayName}
              avatarUrl={auth.avatarUrl}
              roleBadge={auth.roleBadge}
              customRoles={auth.customRoles}
              redirectPath={`/${school.slug}`}
            />
          </div>
        </div>
      </header>
{/* KHU VỰC 6: BẢNG VINH DANH TOP THỰC THẦN SÔI NỔI NHẤT TRƯỜNG */}
        <TopFoodiesBoard
          schoolShortName={school.short_name}
          schoolDishes={allSchoolDishes ?? []}
          reviews={allReviews ?? []}
          posts={forumPosts ?? []}
          comments={forumComments ?? []}
          profileMap={profileMap}
          currentUser={currentUserInfo}
          allCustomRoles={allCustomRoles ?? []}
          onAssignRole={assignUserRoleQuickAction}
          onRevokeRole={revokeUserRoleQuickAction}
        />
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-8">
        <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-2xl bg-slate-100">
              <Link
                href={`/${school.slug}?meal=breakfast`}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeMeal === "breakfast"
                    ? "bg-white text-[#0F766E] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌅 Điểm tâm sáng
              </Link>
              <Link
                href={`/${school.slug}?meal=lunch`}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeMeal === "lunch"
                    ? "bg-white text-[#0F766E] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🍱 Đồ ăn trưa
              </Link>
            </div>

            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              <span className="text-slate-500 font-medium mr-1">
                Không ăn / Dị ứng:
              </span>
              {filterTags.map((tag) => {
                const isExcluded = exclude === tag;
                const nextUrl = isExcluded
                  ? `/${school.slug}?meal=${activeMeal}`
                  : `/${school.slug}?meal=${activeMeal}&exclude=${encodeURIComponent(
                      tag
                    )}`;
                return (
                  <Link
                    key={tag}
                    href={nextUrl}
                    className={`px-2.5 py-1 rounded-full font-semibold border transition ${
                      isExcluded
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {isExcluded ? `🚫 Đã ẩn ${tag}` : tag}
                  </Link>
                );
              })}
            </div>
          </div>

          {(dishes ?? []).length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Chưa có món ăn nào trong mục này
              </p>
            </div>
          ) : (
            <CompactDishGrid
              dishes={dishes ?? []}
              reviewsByDish={reviewsByDish}
              currentUser={currentUserInfo}
              profileMap={profileMap}
              allCustomRoles={allCustomRoles ?? []}
              onAssignRole={assignUserRoleQuickAction}
              onRevokeRole={revokeUserRoleQuickAction}
              onUpsertReview={upsertReviewAction}
              onDeleteReview={deleteReviewAction}
            />
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Bảng Xếp Hạng Tier List Căn Tin {school.short_name} (Thang điểm
                0 – 5⭐)
              </h2>
              <p className="text-xs text-slate-500">
                Phân hạng đầy đủ từ Tier S xuống Tier D theo điểm trung bình
                thực tế
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              {
                tier: "S",
                label: "👑 Tier S (4.5⭐ – 5.0⭐)",
                bg: "bg-amber-50 border-amber-300 text-amber-900",
              },
              {
                tier: "A",
                label: "🥇 Tier A (4.0⭐ – 4.4⭐)",
                bg: "bg-teal-50 border-teal-200 text-[#0F766E]",
              },
              {
                tier: "B",
                label: "🥈 Tier B (3.0⭐ – 3.9⭐)",
                bg: "bg-blue-50 border-blue-200 text-blue-800",
              },
              {
                tier: "C",
                label: "🥉 Tier C (2.0⭐ – 2.9⭐)",
                bg: "bg-orange-50 border-orange-200 text-orange-800",
              },
              {
                tier: "D",
                label: "⚠️ Tier D (1.0⭐ – 1.9⭐)",
                bg: "bg-rose-50 border-rose-200 text-rose-800",
              },
              {
                tier: "NEW",
                label: "🆕 Chưa có sao (0 đánh giá)",
                bg: "bg-slate-100 border-slate-200 text-slate-700",
              },
            ].map((row) => {
              const tierDishes = (allSchoolDishes ?? []).filter(
                (d) => d.dish_tier === row.tier
              );
              return (
                <div
                  key={row.tier}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border border-slate-200"
                >
                  <div
                    className={`sm:w-56 shrink-0 px-3 py-2 rounded-xl font-extrabold border ${row.bg}`}
                  >
                    {row.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tierDishes.length === 0 ? (
                      <span className="text-slate-400 italic">
                        Chưa có món nào ở hạng này
                      </span>
                    ) : (
                      tierDishes.map((d) => (
                        <span
                          key={d.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                        >
                          {d.name}{" "}
                          {d.average_rating ? `(${d.average_rating}⭐)` : ""}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {(weeklyItems ?? []).length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Trợ lý Điền Form Đăng Ký Món Ăn Tuần
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tự động gợi ý món có điểm đánh giá cao nhất trong 4 lựa chọn
                    mỗi ngày
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <CopyWeeklyPicksButton summaryText={copySummaryText} />
                {weeklyItems?.[0]?.form_url && (
                  <a
                    href={weeklyItems[0].form_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0F766E] text-white px-3.5 py-2 rounded-xl hover:bg-[#0F766E]/90 transition"
                  >
                    <span>Mở Google Form trường</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((dayNum) => {
                const dayDishes = (weeklyItems ?? []).filter(
                  (i) => i.day_of_week === dayNum
                );
                if (dayDishes.length === 0) return null;

                return (
                  <div
                    key={dayNum}
                    className="rounded-2xl border border-slate-200 p-4 space-y-2.5 bg-slate-50/50"
                  >
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F766E]">
                      Thứ {dayNum + 1} ({dayDishes[0]?.service_date})
                    </h3>
                    <div className="space-y-2">
                      {dayDishes.map((item) => (
                        <div
                          key={item.menu_item_id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            item.is_daily_best_pick
                              ? "bg-teal-50/70 border-[#0F766E] font-bold"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                              {item.slot_number}
                            </span>
                            <span>{item.dish_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.is_daily_best_pick && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-[#0F766E] text-white px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Nên chọn
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500">
                              {item.star_icons}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[#0F766E]" />
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Sàn Trao Đổi Phiếu Ăn Trưa ({school.short_name})
              </h2>
              <p className="text-xs text-slate-500">
                Chọn Thứ để tự động hiện Món 1, 2, 3, 4 trong ngày • Bạn cùng
                trường có thể bấm nhận kèo và đề xuất đổi vị trí hẹn gặp
              </p>
            </div>
          </div>

          <SmartTicketSwapBoard
            weeklyItems={weeklyItems ?? []}
            swaps={swaps ?? []}
            currentUser={currentUserInfo}
            onCreateSwap={createSwapAction}
            onAcceptSwap={acceptSwapAction}
            onReopenSwap={reopenSwapAction}
            onDeleteSwap={deleteSwapAction}
          />
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0F766E]" />
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Diễn Đàn Ẩm Thực Căn Tin {school.short_name}
              </h2>
              <p className="text-xs text-slate-500">
                Bấm vào tên thành viên để xem Profile & Cấp Role trực tiếp • Tự
                động cuộn xuống khi có tin nhắn mới
              </p>
            </div>
          </div>

          <ForumSectionClient
            posts={forumPosts ?? []}
            commentsByPost={commentsByPost}
            currentUser={currentUserInfo}
            profileMap={profileMap}
            allCustomRoles={allCustomRoles ?? []}
            onAssignRole={assignUserRoleQuickAction}
            onRevokeRole={revokeUserRoleQuickAction}
            onCreatePost={createForumPostAction}
            onDeletePost={deleteForumPostAction}
            onCreateComment={createForumCommentAction}
            onDeleteComment={deleteForumCommentAction}
            onReactItem={reactForumItemAction}
          />
        </section>
      </main>
    </div>
  );
}