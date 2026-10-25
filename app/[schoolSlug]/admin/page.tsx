import { AdminDishSearchList } from "./AdminDishSearchList";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  PlusCircle,
  CalendarDays,
  Utensils,
  Trash2,
  Crown,
  Sparkles,
  Wand2,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getCurrentUserRole } from "@/app/lib/auth";
import { AuthButtonClient } from "@/app/AuthButtonClient";
import {
  DishImagePasteInput,
  EditableDishRow,
  InstantActionForm,
} from "./DishImagePasteInput";

export const dynamic = "force-dynamic";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function detectDayFromLine(line: string): number | null {
  const lower = line.toLowerCase();
  if (/thứ\s*(hai|2)(?!\d)/i.test(lower)) return 1;
  if (/thứ\s*(ba|3)(?!\d)/i.test(lower)) return 2;
  if (/thứ\s*(tư|bốn|4)(?!\d)/i.test(lower)) return 3;
  if (/thứ\s*(năm|5)(?!\d)/i.test(lower)) return 4;
  if (/thứ\s*(sáu|6)(?!\d)/i.test(lower)) return 5;
  return null;
}

export default async function SchoolAdminPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("slug", schoolSlug.toLowerCase())
    .single();

  if (!school) {
    notFound();
  }

  const auth = await getCurrentUserRole(school);
  if (!auth.canManageSchool) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-extrabold text-slate-900">
            Khu Vực Quản Trị Trường {school.short_name}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vui lòng đăng nhập bằng Gmail của <strong>Admin chính</strong>,{" "}
            <strong>Phó Admin</strong> trường {school.short_name} hoặc tài khoản{" "}
            <strong>GOD</strong> để tiếp tục.
          </p>
          <div className="flex justify-center pt-2">
            <AuthButtonClient
              userEmail={auth.email}
              displayName={auth.displayName}
              avatarUrl={auth.avatarUrl}
              roleBadge={auth.roleBadge}
              customRoles={auth.customRoles}
              redirectPath={`/${school.slug}/admin`}
            />
          </div>
          <a
            href={`/${school.slug}`}
            className="block text-xs font-bold text-[#0F766E] hover:underline pt-2"
          >
            ← Quay lại Căn tin {school.short_name}
          </a>
        </div>
      </div>
    );
  }

  const [
    { data: categories },
    { data: dishes },
    { data: activeWeeklyMenu },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("dishes")
      .select("*, categories(name, icon)")
      .eq("school_id", school.id)
      .order("meal_time", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("weekly_menus")
      .select("*, weekly_menu_items(*)")
      .eq("school_id", school.id)
      .eq("is_active", true)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lunchDishes = (dishes ?? []).filter(
    (d) => d.meal_time === "lunch" || d.meal_time === "all_day"
  );

  const subAdmins: string[] = Array.isArray(school.sub_admin_emails)
    ? school.sub_admin_emails
    : [];

  async function addSubAdminAction(formData: FormData) {
    "use server";
    const email = String(formData.get("sub_email") ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) return;

    const sb = await createServerSupabaseClient();
    const { data: current } = await sb
      .from("schools")
      .select("sub_admin_emails")
      .eq("id", school.id)
      .single();

    const list: string[] = Array.isArray(current?.sub_admin_emails)
      ? current.sub_admin_emails
      : [];

    if (!list.includes(email)) {
      const updated = [...list, email];
      await sb
        .from("schools")
        .update({ sub_admin_emails: updated })
        .eq("id", school.id);
    }

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath("/admin/god");
  }

  async function removeSubAdminAction(formData: FormData) {
    "use server";
    const email = String(formData.get("sub_email") ?? "")
      .trim()
      .toLowerCase();
    if (!email) return;

    const sb = await createServerSupabaseClient();
    const { data: current } = await sb
      .from("schools")
      .select("sub_admin_emails")
      .eq("id", school.id)
      .single();

    const list: string[] = Array.isArray(current?.sub_admin_emails)
      ? current.sub_admin_emails
      : [];

    const updated = list.filter((item) => item !== email);
    await sb
      .from("schools")
      .update({ sub_admin_emails: updated })
      .eq("id", school.id);

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath("/admin/god");
  }

  async function bulkImportFromFormAction(formData: FormData) {
    "use server";
    const rawText = String(formData.get("raw_text") ?? "").trim();
    const meal_time = String(formData.get("bulk_meal_time") ?? "lunch") as
      | "breakfast"
      | "lunch";
    const priceRaw = String(formData.get("bulk_price_vnd") ?? "35000").trim();
    const autoSchedule = formData.get("auto_schedule") === "on";
    let weekStartDate = String(
      formData.get("bulk_week_start_date") ?? "2026-10-26"
    ).trim();
    const formUrl = String(formData.get("bulk_form_url") ?? "").trim();

    if (!rawText) return;

    const dateMatch = rawText.match(
      /thứ\s*(?:hai|2)[^\d\n]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i
    );
    if (dateMatch) {
      const dd = dateMatch[1].padStart(2, "0");
      const mm = dateMatch[2].padStart(2, "0");
      const yyyy = dateMatch[3];
      weekStartDate = `${yyyy}-${mm}-${dd}`;
    }

    const sb = await createServerSupabaseClient();
    const { data: allCats } = await sb.from("categories").select("*");

    const catRice =
      allCats?.find((c) => c.slug === "com-trua")?.id ?? allCats?.[0]?.id;
    const catNoodle =
      allCats?.find((c) => c.slug === "mon-nuoc")?.id ?? catRice;
    const catVeg = allCats?.find((c) => c.slug === "mon-chay")?.id ?? catRice;
    const catBreakfast =
      allCats?.find((c) => c.slug === "diem-tam-sang")?.id ?? catRice;

    const preCleaned = rawText
      .replace(/em\s*chọn/gi, "\n")
      .replace(/đăng\s*ký\s*món\s*ăn\s*ngày/gi, "\n")
      .replace(
        /(thứ\s*(?:hai|ba|tư|bốn|năm|sáu|2|3|4|5|6))/gi,
        "\n__DAY_HEADER__ $1"
      )
      .replace(/(?:món|số|phiếu)\s*([1-4])\s*[\:\-\.]/gi, "\n__SLOT_$1__:");

    const lines = preCleaned
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const daySlots: Record<number, Record<number, string>> = {
      1: {},
      2: {},
      3: {},
      4: {},
      5: {},
    };

    const dishMetaMap = new Map<
      string,
      { name: string; isSlot4: boolean; isSlot3: boolean }
    >();

    let currentDay = 1;

    for (const line of lines) {
      const detectedDay = detectDayFromLine(line);
      if (detectedDay !== null && !line.startsWith("__SLOT_")) {
        currentDay = detectedDay;
        continue;
      }

      const slotMatch = line.match(/^__SLOT_([1-4])__\:\s*(.+)$/);
      if (slotMatch) {
        const slotNum = Number(slotMatch[1]);
        const dishName = slotMatch[2]
          .replace(/\*+$/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (dishName.length >= 2) {
          daySlots[currentDay][slotNum] = dishName;
          const slug = toSlug(dishName);
          const prev = dishMetaMap.get(slug);
          dishMetaMap.set(slug, {
            name: dishName,
            isSlot4: Boolean(prev?.isSlot4 || slotNum === 4),
            isSlot3: Boolean(prev?.isSlot3 || slotNum === 3),
          });
        }
      }
    }

    const parsedPrice = priceRaw ? parseInt(priceRaw, 10) : null;
    const slugToDishId = new Map<string, string>();

    for (const [slug, meta] of dishMetaMap.entries()) {
      if (!slug) continue;
      const lower = meta.name.toLowerCase();

      let chosenCat = meal_time === "breakfast" ? catBreakfast : catRice;
      if (
        meta.isSlot4 ||
        lower.includes("hủ tiếu") ||
        lower.includes("bánh canh") ||
        lower.includes("phở") ||
        lower.includes("nui") ||
        (lower.includes("bún") && !lower.includes("bún nước tương"))
      ) {
        chosenCat = catNoodle;
      } else if (meta.isSlot3 || lower.includes("chay")) {
        chosenCat = catVeg;
      }

      const autoDescription = meta.isSlot4
        ? "Món nước phục vụ buổi trưa (#nước)"
        : meta.isSlot3
        ? "Món chay thanh đạm (#chay)"
        : "Món mặn phục vụ theo phiếu ăn trưa";

      const { data: upserted } = await sb
        .from("dishes")
        .upsert(
          {
            school_id: school.id,
            category_id: chosenCat,
            meal_time,
            name: meta.name,
            slug,
            description: autoDescription,
            price_vnd: isNaN(parsedPrice as number) ? null : parsedPrice,
            price_verified_at: new Date().toISOString(),
            status: "active",
          },
          { onConflict: "school_id,slug" }
        )
        .select("id, slug")
        .single();

      if (upserted) {
        slugToDishId.set(slug, upserted.id);
      }
    }

    if (autoSchedule && meal_time === "lunch") {
      await sb
        .from("weekly_menus")
        .update({ is_active: false })
        .eq("school_id", school.id);

      const baseDate = new Date(weekStartDate);
      const fridayDate = new Date(baseDate);
      fridayDate.setDate(baseDate.getDate() + 4);

      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(
          d.getMonth() + 1
        ).padStart(2, "0")}`;

      const autoTitle = `Thực đơn đăng ký Tuần ${fmt(baseDate)} – ${fmt(
        fridayDate
      )}/${baseDate.getFullYear()}`;

      const { data: menu } = await sb
        .from("weekly_menus")
        .upsert(
          {
            school_id: school.id,
            title: autoTitle,
            week_start_date: weekStartDate,
            form_url: formUrl || null,
            is_active: true,
          },
          { onConflict: "school_id,week_start_date" }
        )
        .select("id")
        .single();

      if (menu) {
        await sb
          .from("weekly_menu_items")
          .delete()
          .eq("weekly_menu_id", menu.id);

        const itemsToInsert: Array<{
          weekly_menu_id: string;
          day_of_week: number;
          service_date: string;
          slot_number: number;
          dish_id: string;
        }> = [];

        for (let day = 1; day <= 5; day++) {
          const currentDate = new Date(baseDate);
          currentDate.setDate(baseDate.getDate() + (day - 1));
          const dateStr = currentDate.toISOString().split("T")[0];

          for (let slot = 1; slot <= 4; slot++) {
            const dName = daySlots[day]?.[slot];
            if (dName) {
              const dId = slugToDishId.get(toSlug(dName));
              if (dId) {
                itemsToInsert.push({
                  weekly_menu_id: menu.id,
                  day_of_week: day,
                  service_date: dateStr,
                  slot_number: slot,
                  dish_id: dId,
                });
              }
            }
          }
        }

        if (itemsToInsert.length > 0) {
          await sb.from("weekly_menu_items").insert(itemsToInsert);
        }
      }
    }

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath(`/${school.slug}`);
  }

  async function addDishAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const meal_time = String(formData.get("meal_time") ?? "lunch") as
      | "breakfast"
      | "lunch"
      | "all_day";
    const category_id = String(formData.get("category_id") ?? "").trim();
    const priceRaw = String(formData.get("price_vnd") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const image_url = String(formData.get("image_url") ?? "").trim();

    if (!name || !category_id) return;

    const slug = toSlug(name);
    const price_vnd = priceRaw ? parseInt(priceRaw, 10) : null;

    const sb = await createServerSupabaseClient();

    const payload: Record<string, any> = {
      school_id: school.id,
      category_id,
      meal_time,
      name,
      slug,
      description: description || null,
      price_vnd: isNaN(price_vnd as number) ? null : price_vnd,
      price_verified_at: new Date().toISOString(),
      status: "active",
    };
    if (image_url) {
      payload.image_url = image_url;
    }

    await sb.from("dishes").upsert(payload, { onConflict: "school_id,slug" });

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath(`/${school.slug}`);
  }

  async function updateDishAction(formData: FormData) {
    "use server";
    const dishId = String(formData.get("dish_id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const meal_time = String(formData.get("meal_time") ?? "lunch") as
      | "breakfast"
      | "lunch"
      | "all_day";
    const category_id = String(formData.get("category_id") ?? "").trim();
    const priceRaw = String(formData.get("price_vnd") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const image_url = String(formData.get("image_url") ?? "").trim();

    if (!dishId || !name || !category_id) return;

    const slug = toSlug(name);
    const price_vnd = priceRaw ? parseInt(priceRaw, 10) : null;

    const sb = await createServerSupabaseClient();
    await sb
      .from("dishes")
      .update({
        name,
        slug,
        meal_time,
        category_id,
        price_vnd: isNaN(price_vnd as number) ? null : price_vnd,
        description: description || null,
        image_url: image_url || null,
        price_verified_at: new Date().toISOString(),
      })
      .eq("id", dishId)
      .eq("school_id", school.id);

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath(`/${school.slug}`);
  }

  async function deleteDishAction(formData: FormData) {
    "use server";
    const dishId = String(formData.get("dish_id") ?? "");
    if (!dishId) return;

    const sb = await createServerSupabaseClient();

    await sb.from("weekly_menu_items").delete().eq("dish_id", dishId);
    await sb.from("reviews").delete().eq("dish_id", dishId);
    await sb.from("favorites").delete().eq("dish_id", dishId);

    await sb
      .from("dishes")
      .delete()
      .eq("id", dishId)
      .eq("school_id", school.id);

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath(`/${school.slug}`);
  }

  async function deleteAllSchoolDishesAction() {
    "use server";
    const sb = await createServerSupabaseClient();
    const { data: schoolDishes } = await sb
      .from("dishes")
      .select("id")
      .eq("school_id", school.id);

    const ids = (schoolDishes ?? []).map((d) => d.id);
    if (ids.length > 0) {
      await sb.from("weekly_menu_items").delete().in("dish_id", ids);
      await sb.from("reviews").delete().in("dish_id", ids);
      await sb.from("favorites").delete().in("dish_id", ids);
      await sb.from("dishes").delete().eq("school_id", school.id);
    }

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath(`/${school.slug}`);
  }

  async function saveWeeklyMenuAction(formData: FormData) {
    "use server";
    const title = String(
      formData.get("title") ?? "Thực đơn đăng ký món ăn tuần"
    ).trim();
    const week_start_date = String(
      formData.get("week_start_date") ?? "2026-10-26"
    ).trim();
    const form_url = String(formData.get("form_url") ?? "").trim();

    const sb = await createServerSupabaseClient();

    await sb
      .from("weekly_menus")
      .update({ is_active: false })
      .eq("school_id", school.id);

    const { data: menu } = await sb
      .from("weekly_menus")
      .upsert(
        {
          school_id: school.id,
          title,
          week_start_date,
          form_url: form_url || null,
          is_active: true,
        },
        { onConflict: "school_id,week_start_date" }
      )
      .select("id")
      .single();

    if (!menu) return;

    await sb
      .from("weekly_menu_items")
      .delete()
      .eq("weekly_menu_id", menu.id);

    const baseDate = new Date(week_start_date);
    const itemsToInsert: Array<{
      weekly_menu_id: string;
      day_of_week: number;
      service_date: string;
      slot_number: number;
      dish_id: string;
    }> = [];

    for (let day = 1; day <= 5; day++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + (day - 1));
      const dateStr = currentDate.toISOString().split("T")[0];

      for (let slot = 1; slot <= 4; slot++) {
        const dishId = String(
          formData.get(`day_${day}_slot_${slot}`) ?? ""
        ).trim();
        if (dishId) {
          itemsToInsert.push({
            weekly_menu_id: menu.id,
            day_of_week: day,
            service_date: dateStr,
            slot_number: slot,
            dish_id: dishId,
          });
        }
      }
    }

    if (itemsToInsert.length > 0) {
      await sb.from("weekly_menu_items").insert(itemsToInsert);
    }

    revalidatePath(`/${school.slug}/admin`);
    revalidatePath(`/${school.slug}`);
  }

  const existingSlotMap = new Map<string, string>();
  (activeWeeklyMenu?.weekly_menu_items ?? []).forEach((item: any) => {
    existingSlotMap.set(
      `day_${item.day_of_week}_slot_${item.slot_number}`,
      item.dish_id
    );
  });

  const daysList = [
    { day: 1, label: "Thứ Hai" },
    { day: 2, label: "Thứ Ba" },
    { day: 3, label: "Thứ Tư" },
    { day: 4, label: "Thứ Năm" },
    { day: 5, label: "Thứ Sáu" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a
              href={`/${school.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Xem trang Căn tin ({school.short_name})</span>
            </a>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-slate-900">
                Quản lý Thực đơn & Đội ngũ — {school.short_name}
              </h1>
              <p className="text-[11px] text-slate-500">
                Mọi thao tác Lưu / Sửa / Quét Form đều cập nhật tức thì
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {auth.isGod && (
              <a
                href="/admin/god"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#F59E0B] text-slate-950 px-3 py-2 rounded-xl hover:bg-[#F59E0B]/90 transition"
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
              redirectPath={`/${school.slug}/admin`}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-8">
        {/* KHU VỰC ĐỘI NGŨ ADMIN & BỔ NHIỆM PHÓ ADMIN */}
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Đội Ngũ Quản Trị Trường {school.short_name} (Admin & Phó Admin)
                </h2>
                <p className="text-xs text-slate-500">
                  Admin chính có thể bổ nhiệm thêm các Phó Admin phụ giúp nhập
                  thực đơn hàng tuần và chỉnh sửa món ăn
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-600">
                  🛡️ Admin Chính (Do GOD bổ nhiệm):
                </span>
                <span className="font-extrabold text-[#0F766E] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  {school.campus_lead_email ?? "Chưa gán"}
                </span>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">
                  🛠️ Danh sách Phó Admin ({subAdmins.length}):
                </span>
                {subAdmins.length === 0 ? (
                  <p className="text-slate-400 italic">
                    Chưa có Phó Admin nào. Hãy thêm Gmail người phụ việc ở khung
                    bên cạnh!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subAdmins.map((email) => (
                      <div
                        key={email}
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl font-semibold text-slate-800"
                      >
                        <span>{email}</span>
                        {auth.isMainSchoolAdmin && (
                          <InstantActionForm
                            action={removeSubAdminAction}
                            successMessage={`Đã gỡ quyền Phó Admin của ${email}`}
                          >
                            <input
                              type="hidden"
                              name="sub_email"
                              value={email}
                            />
                            <button
                              type="submit"
                              title="Gỡ quyền Phó Admin"
                              className="text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </InstantActionForm>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {auth.isMainSchoolAdmin && (
              <InstantActionForm
                action={addSubAdminAction}
                resetOnSuccess
                successMessage="Đã bổ nhiệm Phó Admin mới thành công!"
                className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-indigo-950">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>
                      Bổ nhiệm Phó Admin mới cho trường {school.short_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Phó Admin có quyền thêm/sửa món ăn, quét Google Form và xếp
                    lịch tuần ngang với Admin chính.
                  </p>
                  <input
                    name="sub_email"
                    type="email"
                    required
                    placeholder="Nhập Gmail bạn phụ việc (VD: phoadmin@gmail.com)"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  + Cấp quyền Phó Admin
                </button>
              </InstantActionForm>
            )}
          </div>
        </section>

        {/* KHU VỰC QUÉT NHANH THỰC ĐƠN COPY TỪ GOOGLE FORM */}
        <section className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F59E0B] text-slate-950 flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/15 text-amber-300 px-2.5 py-0.5 rounded-full">
                Magic Form Scanner v3
              </span>
              <h2 className="font-bold text-base sm:text-lg text-white mt-0.5">
                ⚡ Quét Nhanh Danh Sách Món Từ Google Form (Copy & Paste)
              </h2>
              <p className="text-xs text-slate-300">
                Tự động đọc ngày trong Form, tách chính xác cả 5 ngày (Thứ 2 –
                Thứ 6), tự động xếp Món 4 vào danh mục 🍜 Món nước (#nước).
              </p>
            </div>
          </div>

          <InstantActionForm
            action={bulkImportFromFormAction}
            resetOnSuccess
            successMessage="⚡ Đã quét Google Form & xếp lịch tuần thành công!"
            className="space-y-4 text-xs text-slate-900"
          >
            <textarea
              name="raw_text"
              rows={6}
              required
              placeholder={`Dán trực tiếp nội dung copy từ Google Form vào đây...\nVí dụ:\nĐăng ký món ăn ngày Thứ hai - 26/10/2026 *\nMón 1: Sườn cốt lết nướngMón 2: Chả cá sốt mắm tỏiMón 3: Tàu hủ kho ngũ sắc chayMón 4: Hủ tiếu nam vangEm chọn`}
              className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 font-medium text-slate-800 leading-relaxed focus:outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/15 text-white">
              <div>
                <label className="font-semibold block mb-1 text-slate-200">
                  Buổi phục vụ
                </label>
                <select
                  name="bulk_meal_time"
                  defaultValue="lunch"
                  className="w-full p-2 rounded-xl bg-white text-slate-900 font-bold"
                >
                  <option value="lunch">🍱 Đồ ăn trưa (Form tuần)</option>
                  <option value="breakfast">🌅 Điểm tâm sáng</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-200">
                  Giá mặc định (VNĐ)
                </label>
                <input
                  name="bulk_price_vnd"
                  type="number"
                  step="1000"
                  defaultValue="35000"
                  className="w-full p-2 rounded-xl bg-white text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-200">
                  Ngày Thứ Hai (Tự nhận diện)
                </label>
                <input
                  name="bulk_week_start_date"
                  type="date"
                  defaultValue={
                    activeWeeklyMenu?.week_start_date ?? "2026-10-26"
                  }
                  className="w-full p-2 rounded-xl bg-white text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-200">
                  Link Google Form
                </label>
                <input
                  name="bulk_form_url"
                  type="url"
                  defaultValue={activeWeeklyMenu?.form_url ?? ""}
                  placeholder="https://forms.gle/..."
                  className="w-full p-2 rounded-xl bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-white font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  name="auto_schedule"
                  defaultChecked
                  className="w-4 h-4 rounded accent-[#F59E0B]"
                />
                <span>
                  Tự động xếp luôn vào bảng Form tuần (Thứ 2 – Thứ 6)
                </span>
              </label>

              <button
                type="submit"
                className="px-6 py-3 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Wand2 className="w-4 h-4" />
                <span>Quét & Tự Động Thêm Toàn Bộ Món</span>
              </button>
            </div>
          </InstantActionForm>
        </section>

        {/* KHU VỰC 1: THÊM MÓN ĂN MỚI */}
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                1. Thêm Món Ăn Mới (Hỗ trợ dán ảnh Ctrl + V)
              </h2>
              <p className="text-xs text-slate-500">
                Để chỉnh sửa một món đã có sẵn, bạn chỉ cần bấm nút{" "}
                <strong>&ldquo;✏️ Sửa món&rdquo;</strong> ở danh sách Kho Món Ăn
                bên dưới!
              </p>
            </div>
          </div>

          <InstantActionForm
            action={addDishAction}
            resetOnSuccess
            successMessage="🍱 Đã thêm món ăn mới vào kho thành công!"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs"
          >
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Tên món ăn *
              </label>
              <input
                name="name"
                required
                placeholder="VD: Cơm gà xối mỡ / Bò lúc lắc khoai tây"
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Buổi phục vụ *
              </label>
              <select
                name="meal_time"
                defaultValue="lunch"
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
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
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
              >
                {(categories ?? []).map((cat) => (
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
                defaultValue="35000"
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <DishImagePasteInput />

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Mô tả chi tiết món ăn
              </label>
              <input
                name="description"
                placeholder="VD: Kèm canh, đồ xào và tráng miệng..."
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold rounded-xl transition cursor-pointer"
              >
                + Lưu Món & Hình Ảnh
              </button>
            </div>
          </InstantActionForm>
        </section>

        {/* KHU VỰC 2: BẢNG CHỈNH SỬA 4 MÓN / NGÀY */}
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-[#F59E0B] flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                2. Bảng Chỉnh Sửa Chi Tiết 4 Món / Ngày (Thứ 2 – Thứ 6)
              </h2>
              <p className="text-xs text-slate-500">
                Món 1 & 2: Cơm mặn • Món 3: Món chay (#chay) • Món 4: Món nước
                (#nước)
              </p>
            </div>
          </div>

          <InstantActionForm
            key={activeWeeklyMenu?.id ?? "weekly-form"}
            action={saveWeeklyMenuAction}
            successMessage="📅 Đã lưu & phát hành Thực đơn Tuần mới thành công!"
            className="space-y-5 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tiêu đề Tuần đăng ký *
                </label>
                <input
                  name="title"
                  required
                  defaultValue={
                    activeWeeklyMenu?.title ??
                    "Thực đơn đăng ký Tuần 26/10 – 30/10/2026"
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Ngày Thứ Hai đầu tuần *
                </label>
                <input
                  name="week_start_date"
                  type="date"
                  required
                  defaultValue={
                    activeWeeklyMenu?.week_start_date ?? "2026-10-26"
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Link Google Form của trường
                </label>
                <input
                  name="form_url"
                  type="url"
                  defaultValue={
                    activeWeeklyMenu?.form_url ??
                    "https://docs.google.com/forms/"
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {daysList.map(({ day, label }) => (
                <div
                  key={day}
                  className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-white"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-[#0F766E]">
                      📅 {label}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      4 lựa chọn
                    </span>
                  </div>

                  {[1, 2, 3, 4].map((slot) => {
                    const fieldKey = `day_${day}_slot_${slot}`;
                    const defaultDishId = existingSlotMap.get(fieldKey) ?? "";

                    return (
                      <div
                        key={`${fieldKey}_${defaultDishId}`}
                        className="space-y-1"
                      >
                        <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                          <span>Phiếu ăn số {slot}:</span>
                          {slot === 3 && (
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              🥬 Món chay
                            </span>
                          )}
                          {slot === 4 && (
                            <span className="text-[10px] text-[#0F766E] font-semibold">
                              🍜 Món nước
                            </span>
                          )}
                        </label>
                        <select
                          name={fieldKey}
                          defaultValue={defaultDishId}
                          className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50/70 font-medium text-slate-800"
                        >
                          <option value="">-- Chưa chọn món --</option>
                          {lunchDishes.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} (
                              {d.ingredient_tags?.join(" ") || "Món trưa"})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#F59E0B]" />
              <span>Lưu & Phát hành Thực Đơn Tuần Này</span>
            </button>
          </InstantActionForm>
        </section>

        {/* KHU VỰC 3: KHO MÓN ĂN HIỆN CÓ */}
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#0F766E]" />
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  3. Kho Món Ăn Hiện Có Tại {school.short_name} (
                  {(dishes ?? []).length} món)
                </h2>
                <p className="text-xs text-slate-500">
                  Bấm <strong>&ldquo;Sửa món&rdquo;</strong> ở bất kỳ món nào để
                  đổi tên, đổi giá, sửa mô tả hoặc dán hình ảnh mới (cập nhật
                  ngay lập tức)
                </p>
              </div>
            </div>

            {(dishes ?? []).length > 0 && (
              <InstantActionForm
                action={deleteAllSchoolDishesAction}
                successMessage="🗑️ Đã xóa sạch toàn bộ món ăn trong kho!"
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa sạch toàn bộ ({(dishes ?? []).length} món)</span>
                </button>
              </InstantActionForm>
            )}
          </div>

          <AdminDishSearchList
            dishes={dishes ?? []}
            categories={categories ?? []}
            onUpdateDish={updateDishAction}
            onDeleteDish={deleteDishAction}
          />
        </section>
      </main>
    </div>
  );
}