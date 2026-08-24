import { Card } from "@/components/ui/card";
import type { CollaborationEntry, ProfileMember } from "@/lib/profile";

export function CollaborationMatrix({
  member,
  collaboration,
}: {
  member: ProfileMember;
  collaboration: CollaborationEntry[];
}) {
  const isWorker = member.role === "worker";
  const title = isWorker ? "التعاون مع الوسطاء" : "التعاون مع العمال";

  return (
    <Card className="p-5">
      <h2 className="font-display text-base font-bold text-ink">{title}</h2>

      {collaboration.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          لا توجد مهام مكتملة بعد.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {collaboration.map((c) => (
            <div
              key={c.peer_id}
              className="flex items-center justify-between rounded-lg bg-bone/60 px-3 py-2"
            >
              <span className="text-sm text-ink">{c.peer_name}</span>
              <span className="font-mono text-sm font-semibold text-ink">
                {c.count} طلب
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
