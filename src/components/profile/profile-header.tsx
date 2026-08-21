import { Mail, Phone, Send } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ProfileMember } from "@/lib/profile";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  broker: "وسيط",
  worker: "عامل",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeader({ member }: { member: ProfileMember }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <Avatar className="h-20 w-20 border border-border">
          <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name} />
          <AvatarFallback className="bg-bone text-xl font-semibold text-ink">
            {initials(member.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {member.full_name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="px-2 py-0 text-[11px]">
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
            {member.telegram_username ? (
              <Badge className="border-0 bg-sky-500/10 px-2 py-0 text-[11px] text-sky-600">
                <Send className="h-3 w-3" />
                <span className="ms-1">@{member.telegram_username}</span>
              </Badge>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5" dir="ltr">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{member.email}</span>
            </span>
            {member.phone_number ? (
              <span className="flex items-center gap-1.5" dir="ltr">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{member.phone_number}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
