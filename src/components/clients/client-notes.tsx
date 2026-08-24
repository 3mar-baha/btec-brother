"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDate, relativeTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

interface ClientNote {
  id: string;
  client_phone: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string } | null;
}

/**
 * Internal CRM notes for one client. `phoneKey` is the normalized phone
 * digits (same key used for duplicate detection), so notes follow the client
 * across formatting differences in how their number was typed.
 */
export function ClientNotesPanel({
  phoneKey,
  canDeleteAny,
}: {
  phoneKey: string;
  canDeleteAny: boolean;
}) {
  const { toast } = useToast();
  const [supabase] = useState(() => createClient());
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("client_notes")
      .select("id, client_phone, author_id, content, created_at, author:users(full_name)")
      .eq("client_phone", phoneKey)
      .order("created_at", { ascending: false });
    if (!error) setNotes((data ?? []) as ClientNote[]);
    setLoading(false);
  }, [supabase, phoneKey]);

  useEffect(() => {
    void load();
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, [load, supabase]);

  async function handleAdd() {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_notes").insert({
      client_phone: phoneKey,
      author_id: userData.user?.id ?? "",
      content,
    });
    setSaving(false);
    if (error) {
      toast({
        title: "تعذر حفظ الملاحظة",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setDraft("");
    await load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("client_notes").delete().eq("id", id);
    if (error) {
      toast({
        title: "تعذر حذف الملاحظة",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ملاحظة داخلية عن العميل — مثال: يفضل التواصل مساءً، يؤجل الدفع…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="gap-1.5 bg-brand text-white shadow-none hover:bg-brand-pressed"
          >
            {saving ? <Loader2 className="animate-spin" /> : <StickyNote className="h-4 w-4" />}
            إضافة ملاحظة
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا توجد ملاحظات إدارية عن هذا العميل بعد.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-border bg-bone/40 p-3 dark:bg-surface-dark/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">
                    {n.author?.full_name ?? "مستخدم"}
                    <span className="ms-2 font-normal text-muted-foreground">
                      {relativeTime(n.created_at)} · {formatDate(n.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-body">
                    {n.content}
                  </p>
                </div>
                {(me === n.author_id || canDeleteAny) && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    aria-label="حذف الملاحظة"
                    className="shrink-0 rounded-full p-1 text-ash transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
