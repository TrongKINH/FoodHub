import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export const GOD_EMAILS = ["nguyenphutrong11102010@gmail.com"];

export async function getCurrentUserRole(school?: any) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = user?.email?.toLowerCase().trim() || null;
    const displayName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      (email ? email.split("@")[0] : null);
    const avatarUrl =
      user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

    const isGod = Boolean(email && GOD_EMAILS.includes(email));

    const mainAdminEmail =
      school?.campus_lead_email?.toLowerCase().trim() || null;
    const subAdminEmails: string[] = Array.isArray(school?.sub_admin_emails)
      ? school.sub_admin_emails.map((e: string) => e.toLowerCase().trim())
      : [];

    const isMainSchoolAdmin = Boolean(
      isGod || (email && mainAdminEmail && email === mainAdminEmail)
    );
    const isSubSchoolAdmin = Boolean(email && subAdminEmails.includes(email));
    const canManageSchool = isGod || isMainSchoolAdmin || isSubSchoolAdmin;

    let roleBadge = "🎒 Học sinh";
    if (isGod) roleBadge = "👑 GOD";
    else if (isMainSchoolAdmin) roleBadge = "🛡️ Admin Trường";
    else if (isSubSchoolAdmin) roleBadge = "🛠️ Phó Admin";

    return {
      user,
      email,
      displayName,
      avatarUrl,
      isGod,
      isMainSchoolAdmin,
      isSubSchoolAdmin,
      canManageSchool,
      roleBadge,
    };
  } catch {
    return {
      user: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      isGod: false,
      isMainSchoolAdmin: false,
      isSubSchoolAdmin: false,
      canManageSchool: false,
      roleBadge: "🎒 Học sinh",
    };
  }
}