"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";

import type { Classification, CriteriaLevel } from "@/components/market/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ActiveTaskCard } from "./active-task-card";
import { DropTaskModal } from "./drop-task-modal";
import { RevisionsBox } from "./revisions-box";
import { SubmitSolutionModal } from "./submit-solution-modal";
import type { Attachment, DailyUpdate, WorkspaceOrder } from "./types";

interface WorkerWorkspaceProps {
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  activeTask: WorkspaceOrder | null;
  revisions: WorkspaceOrder[];
  attachments: Attachment[];
  updates: DailyUpdate[];
  userName: string;
}

export function WorkerWorkspace({
  specialisations,
  gradeLevels,
  criteriaLevels,
  activeTask,
  revisions,
  attachments,
  updates,
  userName,
}: WorkerWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [addingUpdate, setAddingUpdate] = useState(false);
  const [submitOrder, setSubmitOrder] = useState<WorkspaceOrder | null>(null);
  const [dropOpen, setDropOpen] = useState(false);

  const specName = useMemo(() => {
    const map = new Map(specialisations.map((s) => [s.id, s.name]));
    return (id: number) => map.get(id) ?? "";
  }, [specialisations]);

  const gradeName = useMemo(() => {
    const map = new Map(gradeLevels.map((g) => [g.id, g.name]));
    return (id: number) => map.get(id) ?? "";
  }, [gradeLevels]);

  const criteriaById = useMemo(() => {
    const map = new Map(criteriaLevels.map((c) => [c.id, c]));
    return (id: number) => map.get(id);
  }, [criteriaLevels]);

  // Returns success so ActiveTaskCard keeps the typed note when the insert fails.
  async function handleAddUpdate(note: string): Promise<boolean> {
    if (!activeTask) return false;
    setAddingUpdate(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("daily_updates").insert({
      order_id: activeTask.id,
      note,
      ...(user ? { author_id: user.id } : {}),
    });
    setAddingUpdate(false);

    if (error) {
      toast({
        title: "تعذر إضافة التحديث",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    if (user) {
      await supabase.from("activity_logs").insert({
        order_id: activeTask.id,
        actor_id: user.id,
        action: "daily_update",
        details: note,
      });
    }

    toast({ title: "تمت إضافة التحديث" });
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          لوحة العمل
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تتبع مهمتك النشطة والتعديلات المطلوبة
        </p>
      </div>

      {activeTask ? (
        <ActiveTaskCard
          key={activeTask.id}
          order={activeTask}
          specialisationName={specName(activeTask.specialisation_id)}
          gradeName={gradeName(activeTask.grade_id)}
          criteria={criteriaById(activeTask.criteria_id)}
          attachments={attachments}
          updates={updates}
          addingUpdate={addingUpdate}
          onAddUpdate={handleAddUpdate}
          onOpenSubmit={() => setSubmitOrder(activeTask)}
          onOpenDrop={() => setDropOpen(true)}
        />
      ) : (
        <Card className="flex flex-col items-center gap-3 border-dashed bg-card p-10 text-center">
          <ShoppingBag className="h-8 w-8 text-ash-light" />
          <p className="text-sm text-muted-foreground">
            لا توجد مهمة نشطة حالياً
          </p>
          <Button asChild size="sm" className="bg-brand text-white shadow-none hover:bg-brand-pressed">
            <a href="/market">تصفح سوق الطلبات</a>
          </Button>
        </Card>
      )}

      <RevisionsBox
        revisions={revisions}
        specName={specName}
        gradeName={gradeName}
        criteriaById={criteriaById}
        onOpenSubmit={setSubmitOrder}
      />

      {submitOrder && (
        <SubmitSolutionModal
          open
          onOpenChange={(open) => {
            if (!open) setSubmitOrder(null);
          }}
          order={submitOrder}
          userName={userName}
          onSubmitted={() => {
            setSubmitOrder(null);
            router.refresh();
          }}
        />
      )}

      {activeTask && (
        <DropTaskModal
          open={dropOpen}
          onOpenChange={setDropOpen}
          order={activeTask}
          onDropped={() => {
            setDropOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
