import { revalidatePath } from "next/cache";
import { Crown, School, UserPlus, ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getCurrentUserRole } from "@/app/lib/auth";
import { AuthButtonClient } from "@/app/AuthButtonClient";
import {
  GodSchoolCardClient,
  SchoolImagePasteInput,
  InstantGodForm,
} from "./GodSchoolCardClient";

export const dynamic = "force-dynamic";

export default async function GodDashboardPage() {
  const auth = await getCurrentUserRole();
  if (!auth.isGod) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <Crown className="w-10 h-10 text-[#F59E0B] mx-auto" />
          <h1 className="text-xl font-extrabold text-slate-900">
            Khu Vực Giới Hạn — GOD Mode
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Chỉ tài khoản Nhà sáng lập (GOD) mới có quyền truy cập trung tâm
            điều hành Liên trường.
          </p>
          <div className="flex justify-center pt-2">
            <AuthButtonClient
              userEmail={auth.email}
              displayName={auth.displayName}
              avatarUrl={auth.avatarUrl}
              roleBadge={auth.roleBadge}
              customRoles={auth.customRoles}
              redirectPath="/admin/god"
            />
          </div>
          <a
            href="/"
            className="block text-xs font-bold text-[#0F766E] hover:underline pt-2"
          >
            ← Quay lại Trang chủ
          </a>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: schools } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: true });

  async function createSchoolAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const short_name = String(formData.get("short_name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const campus_lead_email = String(formData.get("campus_lead_email") ?? "")
      .trim()
      .toLowerCase();
    const image_url = String(formData.get("image_url") ?? "").trim();

    if (!name || !short_name || !slug) return;

    const sb = await createServerSupabaseClient();
    await sb.from("schools").insert({
      name,
      short_name,
      slug,
      campus_lead_email: campus_lead_email || null,
      image_url: image_url || null,
      sub_admin_emails: [],
      is_active: true,
    });

    revalidatePath("/admin/god");
    revalidatePath("/");
  }

  async function assignLeadEmailAction(formData: FormData) {
    "use server";
    const school_id = String(formData.get("school_id") ?? "").trim();
    const role_type = String(formData.get("role_type") ?? "main").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!school_id || !email) return;

    const sb = await createServerSupabaseClient();

    if (role_type === "sub") {
      const { data: current } = await sb
        .from("schools")
        .select("sub_admin_emails")
        .eq("id", school_id)
        .single();

      const list: string[] = Array.isArray(current?.sub_admin_emails)
        ? current.sub_admin_emails
        : [];
      if (!list.includes(email)) {
        await sb
          .from("schools")
          .update({ sub_admin_emails: [...list, email] })
          .eq("id", school_id);
      }
    } else {
      await sb
        .from("schools")
        .update({ campus_lead_email: email })
        .eq("id", school_id);
    }

    revalidatePath("/admin/god");
  }

  async function updateSchoolInfoAction(formData: FormData) {
    "use server";
    const school_id = String(formData.get("school_id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const short_name = String(formData.get("short_name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const campus_lead_email = String(formData.get("campus_lead_email") ?? "")
      .trim()
      .toLowerCase();
    const image_url = String(formData.get("image_url") ?? "").trim();

    if (!school_id || !name || !short_name || !slug) return;

    const sb = await createServerSupabaseClient();
    await sb
      .from("schools")
      .update({
        name,
        short_name,
        slug,
        campus_lead_email: campus_lead_email || null,
        image_url: image_url || null,
      })
      .eq("id", school_id);

    revalidatePath("/admin/god");
    revalidatePath("/");
  }

  async function addSubAdminAction(formData: FormData) {
    "use server";
    const school_id = String(formData.get("school_id") ?? "").trim();
    const email = String(formData.get("sub_email") ?? "")
      .trim()
      .toLowerCase();

    if (!school_id || !email) return;

    const sb = await createServerSupabaseClient();
    const { data: current } = await sb
      .from("schools")
      .select("sub_admin_emails")
      .eq("id", school_id)
      .single();

    const list: string[] = Array.isArray(current?.sub_admin_emails)
      ? current.sub_admin_emails
      : [];

    if (!list.includes(email)) {
      await sb
        .from("schools")
        .update({ sub_admin_emails: [...list, email] })
        .eq("id", school_id);
    }

    revalidatePath("/admin/god");
  }

  async function removeSubAdminAction(formData: FormData) {
    "use server";
    const school_id = String(formData.get("school_id") ?? "").trim();
    const email = String(formData.get("sub_email") ?? "")
      .trim()
      .toLowerCase();

    if (!school_id || !email) return;

    const sb = await createServerSupabaseClient();
    const { data: current } = await sb
      .from("schools")
      .select("sub_admin_emails")
      .eq("id", school_id)
      .single();

    const list: string[] = Array.isArray(current?.sub_admin_emails)
      ? current.sub_admin_emails
      : [];

    await sb
      .from("schools")
      .update({ sub_admin_emails: list.filter((e) => e !== email) })
      .eq("id", school_id);

    revalidatePath("/admin/god");
  }

  async function deleteSchoolAction(formData: FormData) {
    "use server";
    const school_id = String(formData.get("school_id") ?? "").trim();
    if (!school_id) return;

    const sb = await createServerSupabaseClient();

    const { data: dishes } = await sb
      .from("dishes")
      .select("id")
      .eq("school_id", school_id);
    const dishIds = (dishes ?? []).map((d) => d.id);
    if (dishIds.length > 0) {
      await sb.from("weekly_menu_items").delete().in("dish_id", dishIds);
      await sb.from("reviews").delete().in("dish_id", dishIds);
      await sb.from("favorites").delete().in("dish_id", dishIds);
    }

    const { data: menus } = await sb
      .from("weekly_menus")
      .select("id")
      .eq("school_id", school_id);
    const menuIds = (menus ?? []).map((m) => m.id);
    if (menuIds.length > 0) {
      await sb.from("weekly_menu_items").delete().in("weekly_menu_id", menuIds);
      await sb.from("weekly_menus").delete().eq("school_id", school_id);
    }

    const { data: posts } = await sb
      .from("forum_posts")
      .select("id")
      .eq("school_id", school_id);
    const postIds = (posts ?? []).map((p) => p.id);
    if (postIds.length > 0) {
      await sb.from("forum_comments").delete().in("post_id", postIds);
      await sb.from("forum_posts").delete().eq("school_id", school_id);
    }

    await sb.from("ticket_swaps").delete().eq("school_id", school_id);
    await sb.from("dishes").delete().eq("school_id", school_id);
    await sb.from("schools").delete().eq("id", school_id);

    revalidatePath("/admin/god");
    revalidatePath("/");
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chọn trường</span>
          </a>

          <AuthButtonClient
            userEmail={auth.email}
            displayName={auth.displayName}
            avatarUrl={auth.avatarUrl}
            roleBadge={auth.roleBadge}
            customRoles={auth.customRoles}
            redirectPath="/admin/god"
          />
        </div>

        <section className="bg-gradient-to-r from-slate-900 via-teal-950 to-[#0F766E] text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-[#F59E0B] text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full">
              <Crown className="w-3.5 h-3.5" />
              <span>GOD MODE — QUẢN TRỊ TỐI CAO TOÀN HỆ THỐNG</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Trung tâm điều hành Liên trường FoodHub
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Mọi thao tác Tạo trường, Bổ nhiệm Admin / Phó Admin và Sửa trường
              đều cập nhật tức thì không cần tải lại trang.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/15 text-center shrink-0">
            <p className="text-3xl font-extrabold text-[#F59E0B]">
              {(schools ?? []).length}
            </p>
            <p className="text-xs text-slate-200 font-medium">
              Trường đang hoạt động
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InstantGodForm
            action={createSchoolAction}
            resetOnSuccess
            successMessage="🏫 Đã mở cổng Trường mới thành công!"
            className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  1. Mở cổng Trường THPT / Đại học mới
                </h2>
                <p className="text-xs text-slate-500">
                  Tạo ngay đường dẫn riêng kèm Logo / Ảnh đại diện trường
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên đầy đủ của trường *
                </label>
                <input
                  name="name"
                  required
                  placeholder="VD: Trường THPT Chuyên Trần Đại Nghĩa"
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên viết tắt *
                  </label>
                  <input
                    name="short_name"
                    required
                    placeholder="VD: TĐN"
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đường dẫn (Slug) *
                  </label>
                  <input
                    name="slug"
                    required
                    placeholder="VD: tdn"
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <SchoolImagePasteInput inputName="image_url" />

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Gmail Admin Chính phụ trách trường này (Tùy chọn)
                </label>
                <input
                  name="campus_lead_email"
                  type="email"
                  placeholder="banbe@gmail.com"
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-sm"
            >
              + Khởi tạo Trường mới ngay
            </button>
          </InstantGodForm>

          <InstantGodForm
            action={assignLeadEmailAction}
            resetOnSuccess
            successMessage="🛡️ Đã cấp quyền Quản trị trường thành công!"
            className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#F59E0B] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    2. Bổ nhiệm Admin Chính / Phó Admin
                  </h2>
                  <p className="text-xs text-slate-500">
                    Giao quyền trưởng trường hoặc thêm người làm phụ việc (Phó
                    Admin)
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Chọn trường cần giao quyền *
                  </label>
                  <select
                    name="school_id"
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                  >
                    {(schools ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.short_name} — {s.name} (/{s.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Chức vụ bổ nhiệm *
                  </label>
                  <select
                    name="role_type"
                    defaultValue="main"
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="main">
                      🛡️ Admin Chính (Trưởng đại diện trường)
                    </option>
                    <option value="sub">
                      🛠️ Phó Admin (Phụ việc quản lý thực đơn)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Gmail của người nhận quyền *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="tenbanbe@gmail.com"
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-sm"
            >
              Lưu & Cấp quyền Quản trị ngay
            </button>
          </InstantGodForm>
        </div>

        <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-bold text-lg text-slate-900">
              Danh sách các Trường trên hệ thống ({(schools ?? []).length})
            </h2>
            <p className="text-xs text-slate-500">
              💡 Bấm vào thẻ trường bất kỳ để dán Ảnh/Logo trường, xem danh sách
              Admin / Phó Admin, đổi Tên viết tắt hoặc Xóa trường
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(schools ?? []).map((sc) => (
              <GodSchoolCardClient
                key={sc.id}
                school={sc}
                onUpdateSchool={updateSchoolInfoAction}
                onAddSubAdmin={addSubAdminAction}
                onRemoveSubAdmin={removeSubAdminAction}
                onDeleteSchool={deleteSchoolAction}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}