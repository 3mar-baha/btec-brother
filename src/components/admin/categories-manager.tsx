"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "./types";

interface CategoriesManagerProps {
  specialisations: Category[];
  gradeLevels: Category[];
  criteriaLevels: Category[];
}

export function CategoriesManager({
  specialisations,
  gradeLevels,
  criteriaLevels,
}: CategoriesManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  async function toggle(
    table: "specialisations" | "grade_levels" | "criteria_levels",
    item: Category
  ) {
    const { error } = await supabase
      .from(table)
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      toast({
        title: "تعذر التحديث",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "تم تحديث الحالة" });
    router.refresh();
  }

  async function add(
    table: "specialisations" | "grade_levels",
    name: string
  ): Promise<boolean> {
    const { error } = await supabase.from(table).insert({ name });
    if (error) {
      toast({
        title: "تعذرت الإضافة",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    toast({ title: "تمت الإضافة" });
    router.refresh();
    return true;
  }

  async function addCriteria(code: string, name: string): Promise<boolean> {
    const { error } = await supabase
      .from("criteria_levels")
      .insert({ code, name });
    if (error) {
      toast({
        title: "تعذرت الإضافة",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    toast({ title: "تمت الإضافة" });
    router.refresh();
    return true;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <CategoryColumn
        title="التخصصات"
        items={specialisations}
        onAdd={(name) => add("specialisations", name)}
        onToggle={(item) => toggle("specialisations", item)}
      />
      <CategoryColumn
        title="المستويات الدراسية"
        items={gradeLevels}
        onAdd={(name) => add("grade_levels", name)}
        onToggle={(item) => toggle("grade_levels", item)}
      />
      <CategoryColumn
        title="المعايير (P/M/D)"
        items={criteriaLevels}
        withCode
        onAdd={(name, code) => {
          if (code) return addCriteria(code, name);
          return Promise.resolve(true); // unreachable: the form requires a code
        }}
        onToggle={(item) => toggle("criteria_levels", item)}
      />
    </div>
  );
}

interface CategoryColumnProps {
  title: string;
  items: Category[];
  withCode?: boolean;
  onAdd: (name: string, code?: string) => Promise<boolean>;
  onToggle: (item: Category) => Promise<void>;
}

function CategoryColumn({
  title,
  items,
  withCode,
  onAdd,
  onToggle,
}: CategoryColumnProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (withCode && !code.trim()) return;

    setAdding(true);
    const ok = await onAdd(trimmedName, withCode ? code.trim() : undefined);
    setAdding(false);
    // Keep the typed values when the insert fails so nothing is lost.
    if (ok) {
      setName("");
      setCode("");
    }
  }

  async function handleToggle(item: Category) {
    setTogglingId(item.id);
    await onToggle(item);
    setTogglingId(null);
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>

      <form onSubmit={handleSubmit} className="flex gap-2">
        {withCode && (
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="الرمز"
            className="w-20"
          />
        )}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="الاسم"
        />
        <Button
          type="submit"
          size="icon"
          disabled={adding || !name.trim()}
          className="bg-ink text-background shadow-none hover:opacity-90"
        >
          {adding ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              {item.code && (
                <span className="font-mono text-xs font-semibold text-charcoal">
                  {item.code}
                </span>
              )}
              <span className="truncate text-sm text-ink">{item.name}</span>
              {!item.is_active && (
                <Badge className="border-0 bg-ink/5 text-ash">معطل</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant={item.is_active ? "outline" : "secondary"}
              disabled={togglingId === item.id}
              onClick={() => handleToggle(item)}
            >
              {togglingId === item.id ? (
                <Loader2 className="animate-spin" />
              ) : item.is_active ? (
                "تعطيل"
              ) : (
                "تفعيل"
              )}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
