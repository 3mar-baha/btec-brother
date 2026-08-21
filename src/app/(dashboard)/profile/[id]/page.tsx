import { redirect } from "next/navigation";

import { ProfileDashboard } from "@/components/profile/profile-dashboard";
import { loadProfileData } from "@/lib/profile";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);

  if (profile?.role !== "admin") redirect("/market");

  const data = await loadProfileData(params.id);

  if (!data) redirect("/directory");

  return <ProfileDashboard data={data} />;
}
