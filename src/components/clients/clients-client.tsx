"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Download,
  GraduationCap,
  MessageCircle,
  ShoppingBag,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateOrderModal } from "@/components/market/create-order-modal";
import { formatMoney, formatDate } from "@/lib/format";
import { downloadTextFile, toCsv, type CsvCell } from "@/lib/export";
import { DEFAULT_FILTERS } from "./types";
import { buildClients, whatsappHref } from "./aggregate";
import { ClientDrawer } from "./client-drawer";
import { ClientsFilterBar } from "./filter-bar";
import type {
  Activity,
  BrokerOption,
  Classification,
  ClientAggregate,
  ClientFilters,
  ClientOrder,
  CriteriaLevel,
  SortKey,
} from "./types";

const FILTER_KEYS = ["q", "grade", "criteria", "school", "spec", "broker", "activity", "sort"] as const;

interface ClientsClientProps {
  initialOrders: ClientOrder[];
  specialisations: Classification[];
  gradeLevels: Classification[];
  criteriaLevels: CriteriaLevel[];
  brokers: BrokerOption[];
  role: "admin" | "broker";
}

function readFilters(params: URLSearchParams): ClientFilters {
  const get = (k: string) => params.get(k)?.trim() || "";
  return {
    q: get("q"),
    gradeId: get("grade") || "all",
    criteriaCode: get("criteria") || "all",
    school: get("school") || "all",
    specId: get("spec") || "all",
    brokerId: get("broker") || "all",
    activity: (get("activity") || "all") as Activity,
    sort: (get("sort") || "recent") as SortKey,
  };
}

// Filter bar speaks URL param names; state keys differ for some dimensions.
const PARAM_TO_STATE: Record<string, keyof ClientFilters> = {
  q: "q",
  grade: "gradeId",
  criteria: "criteriaCode",
  school: "school",
  spec: "specId",
  broker: "brokerId",
  activity: "activity",
  sort: "sort",
};

export function ClientsClient({
  initialOrders,
  specialisations,
  gradeLevels,
  criteriaLevels,
  brokers,
  role,
}: ClientsClientProps) {
  const router = useRouter();

  // URL is the single source of truth; history.replaceState keeps it shallow
  // (no server round-trip on every filter change). Defaults render on the
  // server; real params hydrate in after mount.
  const [filters, setFilters] = useState<ClientFilters>(DEFAULT_FILTERS);
  useEffect(() => {
    const fromUrl = readFilters(new URLSearchParams(window.location.search));
    setFilters(fromUrl);
    setQInput(fromUrl.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback((patch: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  const onFilter = useCallback((patch: Record<string, string>) => {
    commit(patch);
    setFilters((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) {
        const stateKey = PARAM_TO_STATE[k];
        if (stateKey) (next as Record<string, string>)[stateKey] = v;
      }
      return next;
    });
  }, [commit]);

  // Omni-search debounce: input updates instantly, URL follows after 300ms.
  const [qInput, setQInput] = useState(filters.q);
  useEffect(() => {
    if (qInput === filters.q) return;
    const t = setTimeout(() => onFilter({ q: qInput }), 300);
    return () => clearTimeout(t);
  }, [qInput, filters.q, onFilter]);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.gradeId !== "all" ||
    filters.criteriaCode !== "all" ||
    filters.school !== "all" ||
    filters.specId !== "all" ||
    filters.brokerId !== "all" ||
    filters.activity !== "all";

  const criteriaCodeById = useMemo(
    () => new Map(criteriaLevels.map((c) => [c.id, c.code])),
    [criteriaLevels]
  );
  const gradeNameById = useMemo(
    () => new Map(gradeLevels.map((g) => [g.id, g.name])),
    [gradeLevels]
  );
  const specNameById = useMemo(
    () => new Map(specialisations.map((s) => [s.id, s.name])),
    [specialisations]
  );
  const brokerNameById = useMemo(
    () => new Map(brokers.map((b) => [b.id, b.full_name])),
    [brokers]
  );
  const brokerName = useCallback(
    (id: string) => brokerNameById.get(id) ?? "—",
    [brokerNameById]
  );

  const view = useMemo(
    () =>
      buildClients(initialOrders, filters, criteriaCodeById),
    [initialOrders, filters, criteriaCodeById]
  );
  const { clients, stats } = view;

  const schools = useMemo(() => {
    const set = new Set<string>();
    for (const o of initialOrders) if (o.client_school) set.add(o.client_school);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [initialOrders]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = selectedKey
    ? clients.find((c) => c.key === selectedKey) ?? null
    : null;

  const [createFor, setCreateFor] = useState<ClientAggregate | null>(null);

  const resetFilters = useCallback(() => {
    commit(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
    setFilters(DEFAULT_FILTERS);
    setQInput("");
  }, [commit]);

  // Export the currently filtered view (what you see is what you export).
  const handleExport = useCallback(() => {
    const rows: CsvCell[][] = [
      [
        "اسم العميل",
        "رقم الهاتف",
        "المدرسة",
        "الصفوف المعتادة",
        "عدد الطلبات",
        "إجمالي القيمة (د.أ)",
        "الوسيط الأساسي",
        "آخر طلب",
      ],
      ...clients.map((c) => [
        c.name,
        c.phone,
        c.schools.join("، ") || "—",
        c.gradeIds.map((id) => gradeNameById.get(id)).filter(Boolean).join("، ") || "—",
        c.totalOrders,
        c.totalValue,
        brokerName(c.orders[0].broker_id),
        formatDate(c.lastOrderAt),
      ]),
    ];
    downloadTextFile(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows)
    );
  }, [clients, gradeNameById, brokerName]);

  const statCards = [
    { label: "إجمالي العملاء", value: String(stats.totalClients), icon: Users },
    { label: "عدد المدارس المسجلة", value: String(stats.totalSchools), icon: Building2 },
    { label: "طلبات العملاء النشطة", value: String(stats.activeOrders), icon: ShoppingBag },
    {
      label: "أكثر مدرسة طلباً",
      value: stats.topSchool ?? "—",
      icon: GraduationCap,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            العملاء
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            دليل العملاء وسجل تعاملاتهم
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={clients.length === 0}
          className="shrink-0 gap-2"
        >
          <Download className="h-4 w-4" />
          تصدير البيانات (CSV / Excel)
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-lg font-bold text-ink">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ClientsFilterBar
        q={qInput}
        gradeId={filters.gradeId}
        criteriaCode={filters.criteriaCode}
        school={filters.school}
        specId={filters.specId}
        brokerId={filters.brokerId}
        activity={filters.activity}
        sort={filters.sort}
        gradeLevels={gradeLevels}
        specialisations={specialisations}
        criteriaLevels={criteriaLevels}
        schools={schools}
        brokers={brokers}
        isAdmin={role === "admin"}
        hasActiveFilters={hasActiveFilters}
        onQ={setQInput}
        onFilter={onFilter}
        onReset={resetFilters}
      />

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <Users className="h-8 w-8 text-ash-light" />
          <p className="text-sm text-muted-foreground">
            لا يوجد عملاء مطابقون للفلاتر الحالية
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-bone/60 dark:bg-surface-dark">
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>المدرسة</TableHead>
                  <TableHead>الصفوف المعتادة</TableHead>
                  <TableHead className="text-center">الطلبات</TableHead>
                  <TableHead className="text-center">إجمالي القيمة</TableHead>
                  <TableHead>الوسيط المسؤول</TableHead>
                  <TableHead>آخر طلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow
                    key={c.key}
                    onClick={() => setSelectedKey(c.key)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      <a
                        href={whatsappHref(c.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 hover:text-success"
                      >
                        {c.phone}
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>
                    <TableCell>{c.schools.join("، ") || "—"}</TableCell>
                    <TableCell>
                      {c.gradeIds
                        .map((id) => gradeNameById.get(id))
                        .filter(Boolean)
                        .join("، ") || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.activeOrders > 0 && (
                        <Badge variant="secondary" className="me-1 px-2 py-0 text-[10px]">
                          {c.activeOrders} نشط
                        </Badge>
                      )}
                      {c.totalOrders}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatMoney(c.totalValue)}
                    </TableCell>
                    <TableCell>{brokerName(c.orders[0].broker_id)}</TableCell>
                    <TableCell>{formatDate(c.lastOrderAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {clients.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedKey(c.key)}
                className="rounded-lg border border-border bg-card p-4 text-start transition-colors active:bg-bone/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{c.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.schools.join("، ") || "بدون مدرسة"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-brand">
                    {formatMoney(c.totalValue)} د.أ
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                    {c.totalOrders} طلبات
                  </Badge>
                  {c.activeOrders > 0 && (
                    <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                      {c.activeOrders} نشط
                    </Badge>
                  )}
                  <span>{formatDate(c.lastOrderAt)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span dir="ltr" className="text-xs">
                    {c.phone}
                  </span>
                  <a
                    href={whatsappHref(c.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`واتساب ${c.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selected && (
        <ClientDrawer
          client={selected}
          gradeNameById={gradeNameById}
          specNameById={specNameById}
          criteriaById={new Map(criteriaLevels.map((c) => [c.id, c]))}
          brokerName={brokerName}
          canCreateOrder={role === "broker"}
          onClose={() => setSelectedKey(null)}
          onCreateOrder={(c) => {
            setSelectedKey(null);
            setCreateFor(c);
          }}
        />
      )}

      {createFor && (
        <CreateOrderModal
          key={createFor.key}
          open
          onOpenChange={(open) => !open && setCreateFor(null)}
          defaultClient={{
            client_name: createFor.name,
            client_phone: createFor.phone,
            client_school: createFor.schools[0] ?? "",
          }}
          specialisations={specialisations}
          gradeLevels={gradeLevels}
          criteriaLevels={criteriaLevels}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  );
}
