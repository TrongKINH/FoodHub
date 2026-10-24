import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export const GOD_EMAILS = ["nguyenphutrong11102010@gmail.com"];

export interface CustomRoleBadge {
  id: string;
  name: string;
  bg_color: string;
  text_color: string;
}

export async function getCurrentUserRole(school?: any) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = user?.email?.toLowerCase().trim() || null;

    let displayName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      (email ? email.split("@")[0] : null);
    let avatarUrl =
      user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
    let bio = "Đam mê khám phá ẩm thực căn tin trường 🍱";
    let className = "";
    let customRoles: CustomRoleBadge[] = [];

    if (email) {
      // 1. Lấy thông tin Profile đã chỉnh sửa (Username, Avatar, Bio, Lớp)
      const { data: customProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (customProfile) {
        if (customProfile.display_name) displayName = customProfile.display_name;
        if (customProfile.avatar_url) avatarUrl = customProfile.avatar_url;
        if (customProfile.bio !== null) bio = customProfile.bio;
        if (customProfile.class_name) className = customProfile.class_name;
      }

      // 2. Lấy danh sách các Role danh hiệu (Thực thần, Thánh ăn...) của người này
      const { data: roleRows } = await supabase
        .from("user_role_assignments")
        .select("role_id, custom_roles(id, name, bg_color, text_color)")
        .eq("user_email", email);

      if (roleRows) {
        customRoles = roleRows
          .map((r: any) => r.custom_roles)
          .filter(Boolean) as CustomRoleBadge[];
      }
    }

    const isGod = Boolean(email && GOD_EMAILS.includes(email));

    const mainAdminEmail =
      school?.campus_lead_email?.toLowerCase().trim() || null;
    const subAdminEmails: string[] = Array.isArray(school?.sub_admin_emails)
      ? school.sub_admin_emails.map((e: string) => e.toLowerCase().trim())
      : [];

    // Kiểm tra xem người dùng có phải Admin của bất kỳ trường nào không (để mở Xưởng Role trong trang /profile)
    let isAnySchoolAdmin = false;
    if (email && !isGod) {
      const { data: managedSchools } = await supabase
        .from("schools")
        .select("id, campus_lead_email, sub_admin_emails");

      isAnySchoolAdmin = (managedSchools ?? []).some((s: any) => {
        const lead = s.campus_lead_email?.toLowerCase().trim();
        const subs = Array.isArray(s.sub_admin_emails)
          ? s.sub_admin_emails.map((e: string) => e.toLowerCase().trim())
          : [];
        return lead === email || subs.includes(email);
      });
    }

    const isMainSchoolAdmin = Boolean(
      isGod || (email && mainAdminEmail && email === mainAdminEmail)
    );
    const isSubSchoolAdmin = Boolean(email && subAdminEmails.includes(email));
    const canManageSchool = isGod || isMainSchoolAdmin || isSubSchoolAdmin;
    const canManageRoles = isGod || canManageSchool || isAnySchoolAdmin;

    let roleBadge = "🎒 Học sinh";
    if (isGod) roleBadge = "👑 GOD";
    else if (isMainSchoolAdmin || isAnySchoolAdmin)
      roleBadge = "🛡️ Admin Trường";
    else if (isSubSchoolAdmin) roleBadge = "🛠️ Phó Admin";

    return {
      user,
      email,
      displayName,
      avatarUrl,
      bio,
      className,
      customRoles,
      isGod,
      isMainSchoolAdmin,
      isSubSchoolAdmin,
      canManageSchool,
      canManageRoles,
      roleBadge,
    };
  } catch {
    return {
      user: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      bio: "",
      className: "",
      customRoles: [] as CustomRoleBadge[],
      isGod: false,
      isMainSchoolAdmin: false,
      isSubSchoolAdmin: false,
      canManageSchool: false,
      canManageRoles: false,
      roleBadge: "🎒 Học sinh",
    };
  }
}