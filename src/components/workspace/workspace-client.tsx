"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type {
  Classification,
  CriteriaLevel,
  Role,
} from "@/components/market/types";
import { createClient } from "@/lib/supabase/client";
import { BrokerWorkspace } from "./broker-workspace";
import type {
  Attachment,
  DailyUpdate,
  WorkerProfile,
  WorkspaceOrder,
} from "./types";
import { WorkerWorkspace } from "./worker-workspace";

interface WorkspaceClientProps {
  role: Role;
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  activeTask: WorkspaceOrder | null;
  revisions: WorkspaceOrder[];
  activeAttachments: Attachment[];
  activeUpdates: DailyUpdate[];
  ongoingOrders: WorkspaceOrder[];
  workerProfiles: WorkerProfile[];
  brokerUpdates: DailyUpdate[];
  userName: string;
}

export function WorkspaceClient({
  role,
  specialisations,
  gradeLevels,
  criteriaLevels,
  activeTask,
  revisions,
  activeAttachments,
  activeUpdates,
  ongoingOrders,
  workerProfiles,
  brokerUpdates,
  userName,
}: WorkspaceClientProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("workspace-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_updates" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  if (role === "worker") {
    return (
      <WorkerWorkspace
        specialisations={specialisations}
        gradeLevels={gradeLevels}
        criteriaLevels={criteriaLevels}
        activeTask={activeTask}
        revisions={revisions}
        attachments={activeAttachments}
        updates={activeUpdates}
        userName={userName}
      />
    );
  }

  return (
    <BrokerWorkspace
      specialisations={specialisations}
      gradeLevels={gradeLevels}
      criteriaLevels={criteriaLevels}
      orders={ongoingOrders}
      workerProfiles={workerProfiles}
      updates={brokerUpdates}
    />
  );
}
