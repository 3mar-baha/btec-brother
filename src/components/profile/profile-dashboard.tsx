import type { ProfileData } from "@/lib/profile";
import { CollaborationMatrix } from "./collaboration-matrix";
import { MetricsGrid } from "./metrics-grid";
import { ProfileHeader } from "./profile-header";
import { RecentOrdersTable } from "./recent-orders-table";

export function ProfileDashboard({ data }: { data: ProfileData }) {
  return (
    <div className="space-y-6">
      <ProfileHeader member={data.member} />
      <MetricsGrid data={data} />
      <CollaborationMatrix
        member={data.member}
        collaboration={data.collaboration}
      />
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-ink">
          أحدث الطلبات
        </h2>
        <RecentOrdersTable orders={data.recentOrders} />
      </div>
    </div>
  );
}
