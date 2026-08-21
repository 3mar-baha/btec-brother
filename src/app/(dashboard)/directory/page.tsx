import { redirect } from "next/navigation";

import { DirectoryGrid } from "@/components/directory/directory-grid";
import type {
  CollaborationRow,
  DirectoryMember,
} from "@/components/directory/types";
import {
  createClient,
  getCurrentProfile,
  getCurrentUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const [profile, { data }] = await Promise.all([
    getCurrentProfile(user.id),
    supabase.rpc("directory_stats"),
  ]);

  const members = (data?.members ?? []) as DirectoryMember[];
  const matrix = (data?.matrix ?? []) as CollaborationRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          دليل الفريق
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أعضاء الفريق وإحصائيات الإنجاز
        </p>
      </div>

      <DirectoryGrid
        members={members}
        matrix={matrix}
        isAdmin={profile?.role === "admin"}
      />
    </div>
  );
}
