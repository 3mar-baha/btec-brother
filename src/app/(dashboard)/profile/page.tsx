import { redirect } from "next/navigation";

import { ProfileDashboard } from "@/components/profile/profile-dashboard";
import { loadProfileData } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ملفي الشخصي",
};

export default async function OwnProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const data = await loadProfileData(user.id);

  if (!data) redirect("/market");

  return <ProfileDashboard data={data} />;
}
