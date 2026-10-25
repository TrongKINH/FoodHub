import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  Award,
  Save,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getCurrentUserRole } from "@/app/lib/auth";
import { AuthButtonClient } from "@/app/AuthButtonClient";
import {
  AvatarPickerClient,
  RoleCreatorLiveClient,
  InstantProfileForm,
} from "./AvatarRoleClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const auth = await getCurrentUserRole();
  const supabase = await createServerSupabaseClient();

  const [
    { data: allRoles },
    { data: allAssignments },
  ] = await Promise.all([
    supabase
      .from("custom_roles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_role_assignments")
      .select("*, custom_roles(*)")
      .order("created_at", { ascending: false }),
  ]);

  async function saveProfileAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole();
    if (!currentAuth.email) return;

    const display_name = String(formData.get("display_name") ?? "").trim();
    const class_name = String(formData.get("class_name") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    const avatar_url = String(formData.get("avatar_url") ?? "").trim();

    if (!display_name) return;

    const sb = await createServerSupabaseClient();
    await sb.from("user_profiles").upsert(
      {
        email: currentAuth.email,
        display_name,
        class_name,
        bio,
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    revalidatePath("/profile");
    revalidatePath("/");
  }

  async function createRoleAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole();
    if (!currentAuth.canManageRoles) return;

    const name = String(formData.get("name") ?? "").trim();
    const bg_color = String(formData.get("bg_color") ?? "#FEF3C7").trim();
    const text_color = String(formData.get("text_color") ?? "#92400E").trim();

    if (!name) return;

    const sb = await createServerSupabaseClient();
    await sb.from("custom_roles").insert({
      name,
      bg_color,
      text_color,
      created_by: currentAuth.email,
    });

    revalidatePath("/profile");
  }

  async function assignRoleToUserAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole();
    if (!currentAuth.canManageRoles) return;

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

    revalidatePath("/profile");
  }

  async function revokeRoleFromUserAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole();
    if (!currentAuth.canManageRoles) return;

    const assignment_id = String(formData.get("assignment_id") ?? "").trim();
    if (!assignment_id) return;

    const sb = await createServerSupabaseClient();
    await sb.from("user_role_assignments").delete().eq("id", assignment_id);

    revalidatePath("/profile");
  }

  async function deleteRoleAction(formData: FormData) {
    "use server";
    const currentAuth = await getCurrentUserRole();
    if (!currentAuth.canManageRoles) return;

    const role_id = String(formData.get("role_id") ?? "").trim();
    if (!role_id) return;

    const sb = await createServerSupabaseClient();
    await sb.from("custom_roles").delete().eq("id", role_id);

    revalidatePath("/profile");
  }

  if (!auth.email) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-extrabold text-slate-900">
            Đăng nhập để vào Hồ Sơ Cá Nhân
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hãy đăng nhập bằng tài khoản Google để đổi Username, tải lên Avatar,
            viết tiểu sử và nhận các Role danh hiệu độc quyền!
          </p>
          <div className="flex justify-center pt-2">
            <AuthButtonClient
              userEmail={null}
              displayName={null}
              avatarUrl={null}
              roleBadge=""
              redirectPath="/profile"
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

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 sm:p-8 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chủ FoodHub</span>
          </a>

          <AuthButtonClient
            userEmail={auth.email}
            displayName={auth.displayName}
            avatarUrl={auth.avatarUrl}
            roleBadge={auth.roleBadge}
            customRoles={auth.customRoles}
            redirectPath="/profile"
          />
        </div>

        {/* KHU VỰC 1: THẺ HỒ SƠ CÁ NHÂN CỦA BẠN */}
        <section className="bg-gradient-to-br from-slate-900 via-teal-950 to-[#0F766E] text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-center gap-6">
          {auth.avatarUrl ? (
            <img
              src={auth.avatarUrl}
              alt={auth.displayName || auth.email}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-xl shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-amber-400 text-slate-950 font-extrabold text-3xl flex items-center justify-center border-4 border-white/30 shadow-xl shrink-0">
              {(auth.displayName || auth.email)[0]?.toUpperCase()}
            </div>
          )}

          <div className="space-y-2.5 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2">
              <h1 className="text-2xl font-extrabold">{auth.displayName}</h1>
              {auth.className && (
                <span className="text-xs font-bold bg-white/15 px-3 py-0.5 rounded-full">
                  🏫 {auth.className}
                </span>
              )}
            </div>

            <p className="text-xs text-teal-100/90 max-w-xl leading-relaxed">
              &ldquo;{auth.bio}&rdquo;
            </p>

            <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 pt-1">
              <span className="text-xs font-extrabold bg-amber-400 text-slate-950 px-3 py-1 rounded-full shadow-xs">
                {auth.roleBadge}
              </span>

              {auth.customRoles.map((r) => (
                <span
                  key={r.id}
                  style={{
                    backgroundColor: r.bg_color,
                    color: r.text_color,
                  }}
                  className="text-xs font-extrabold px-3 py-1 rounded-full shadow-xs"
                >
                  {r.name}
                </span>
              ))}

              {auth.customRoles.length === 0 && (
                <span className="text-[11px] text-teal-200/70 italic">
                  (Chưa có danh hiệu đặc biệt)
                </span>
              )}
            </div>
          </div>
        </section>

        {/* KHU VỰC 2: FORM CHỈNH SỬA USERNAME, AVATAR & TIỂU SỬ */}
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Chỉnh Sửa Hồ Sơ Cá Nhân
              </h2>
              <p className="text-xs text-slate-500">
                Bấm Lưu sẽ hiện thông báo và cập nhật ngay lên Thẻ Hồ Sơ phía
                trên
              </p>
            </div>
          </div>

          <InstantProfileForm
            action={saveProfileAction}
            successMessage="👤 Đã cập nhật Hồ sơ cá nhân thành công!"
            className="space-y-4 text-xs"
          >
            <AvatarPickerClient
              defaultAvatar={auth.avatarUrl || ""}
              displayName={auth.displayName || auth.email}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Username / Tên hiển thị *
                </label>
                <input
                  name="display_name"
                  required
                  defaultValue={auth.displayName || ""}
                  placeholder="VD: Trọng King / Minh 10 Tin"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lớp & Trường của bạn
                </label>
                <input
                  name="class_name"
                  defaultValue={auth.className || ""}
                  placeholder="VD: 11 Tin - PTNK"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mô tả bản thân (Bio)
              </label>
              <textarea
                name="bio"
                rows={2}
                defaultValue={auth.bio}
                placeholder="Viết vài dòng giới thiệu gu ẩm thực của bạn..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold rounded-2xl inline-flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Hồ Sơ Cá Nhân Ngay</span>
            </button>
          </InstantProfileForm>
        </section>

        {/* KHU VỰC 3: XƯỞNG CHẾ TẠO & CẤP ROLE DANH HIỆU */}
        {auth.canManageRoles && (
          <section className="bg-white rounded-3xl border-2 border-amber-300/80 p-5 sm:p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                    Dành riêng cho Admin & GOD
                  </span>
                  <h2 className="font-bold text-base sm:text-lg text-slate-900 mt-0.5">
                    🎨 Xưởng Tạo & Cấp Role Danh Hiệu (Thực Thần, Thánh Ăn...)
                  </h2>
                </div>
              </div>
            </div>

            <RoleCreatorLiveClient onCreateRole={createRoleAction} />

            <InstantProfileForm
              action={assignRoleToUserAction}
              successMessage="🎖️ Đã cấp Role danh hiệu cho thành viên!"
              className="p-4 sm:p-5 rounded-3xl bg-teal-50/40 border border-teal-200 space-y-3 text-xs"
            >
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                <UserPlus className="w-4 h-4 text-[#0F766E]" />
                <span>2. Cấp Role Danh Hiệu Cho Thành Viên (Theo Gmail)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Gmail người nhận Role *
                  </label>
                  <input
                    name="user_email"
                    type="email"
                    required
                    defaultValue={auth.email}
                    placeholder="VD: banbe@gmail.com"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chọn Role muốn cấp *
                  </label>
                  <select
                    name="role_id"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    {(allRoles ?? []).map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    + Cấp Role Ngay
                  </button>
                </div>
              </div>
            </InstantProfileForm>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="font-extrabold text-slate-900">
                  Kho Role hiện có ({(allRoles ?? []).length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {(allRoles ?? []).map((r: any) => (
                    <div
                      key={r.id}
                      style={{
                        backgroundColor: r.bg_color,
                        color: r.text_color,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-extrabold shadow-2xs"
                    >
                      <span>{r.name}</span>
                      <InstantProfileForm
                        action={deleteRoleAction}
                        successMessage={`Đã xóa Role "${r.name}"`}
                      >
                        <input type="hidden" name="role_id" value={r.id} />
                        <button
                          type="submit"
                          title="Xóa Role này"
                          className="hover:opacity-70 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </InstantProfileForm>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="font-extrabold text-slate-900">
                  Thành viên đã được cấp Role ({(allAssignments ?? []).length}):
                </p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {(allAssignments ?? []).map((a: any) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/70"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {a.user_email}
                        </span>
                        {a.custom_roles && (
                          <span
                            style={{
                              backgroundColor: a.custom_roles.bg_color,
                              color: a.custom_roles.text_color,
                            }}
                            className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px]"
                          >
                            {a.custom_roles.name}
                          </span>
                        )}
                      </div>
                      <InstantProfileForm
                        action={revokeRoleFromUserAction}
                        successMessage="Đã gỡ Role khỏi thành viên!"
                      >
                        <input
                          type="hidden"
                          name="assignment_id"
                          value={a.id}
                        />
                        <button
                          type="submit"
                          title="Gỡ Role khỏi người này"
                          className="text-slate-400 hover:text-red-600 cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </InstantProfileForm>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}