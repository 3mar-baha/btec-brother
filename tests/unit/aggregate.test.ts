// Runnable check for the clients aggregation logic: `node --test tests/unit/`
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClients,
  phoneKey,
  whatsappHref,
} from "../../src/components/clients/aggregate.ts";
import {
  DEFAULT_FILTERS,
  type Activity,
  type ClientFilters,
  type ClientOrder,
} from "../../src/components/clients/types.ts";

const codeById = new Map([
  [1, "P"],
  [2, "M"],
  [3, "D"],
]);

interface OrderOverrides {
  [key: string]: unknown;
}

function order(overrides: OrderOverrides = {}) {
  return {
    id: crypto.randomUUID(),
    order_number: 1,
    broker_id: "b1",
    title: "تقرير",
    unit_title: "الوحدة 1",
    assignment_name: "تكليف",
    client_name: "عميل",
    client_phone: "0790000000",
    client_school: null,
    specialisation_id: 1,
    grade_id: 1,
    criteria_id: 1,
    total_price: 10,
    deadline: "2026-09-01T00:00:00Z",
    status: "completed",
    created_at: "2026-08-01T00:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

test("phoneKey normalizes digits and falls back to name", () => {
  assert.equal(phoneKey("+962 79-000 0000", "س"), "962790000000");
  assert.equal(phoneKey("", " أحمد "), "name:أحمد");
});

test("whatsappHref converts local numbers", () => {
  assert.equal(whatsappHref("0790000000"), "https://wa.me/962790000000");
  assert.equal(whatsappHref("00962790000000"), "https://wa.me/962790000000");
  assert.equal(whatsappHref("962790000000"), "https://wa.me/962790000000");
});

test("groups orders by phone and computes stats", () => {
  const orders = [
    order({ created_at: "2026-08-10T00:00:00Z", total_price: 50 }),
    order({ client_name: "نفس العميل", total_price: 20 }),
    order({
      client_phone: "0781111111",
      client_name: "آخر",
      client_school: "مدرسة الأمل",
      grade_id: 2,
      criteria_id: 3,
      broker_id: "b2",
      status: "in_progress",
    }),
    order({ client_phone: "0781111111", status: "open" }),
  ];

  const { clients, stats } = buildClients(orders, DEFAULT_FILTERS, codeById);

  assert.equal(clients.length, 2);
  assert.deepEqual(
    clients.map((c) => c.totalOrders).sort((a, b) => a - b),
    [2, 2]
  );
  assert.deepEqual(
    clients.map((c) => c.activeOrders).sort((a, b) => a - b),
    [0, 2]
  );
  assert.equal(clients[0].totalValue, 70);
  assert.equal(stats.totalClients, 2);
  assert.equal(stats.activeOrders, 2);
  assert.equal(stats.topSchool, "مدرسة الأمل");
  assert.equal(stats.totalSchools, 1);
  // most recent first
  assert.ok(clients[0].lastOrderAt >= clients[1].lastOrderAt);
});

test("filters compose (grade + criteria + activity + search)", () => {
  const orders = [
    order({ grade_id: 1, criteria_id: 2, status: "in_progress" }),
    order({ grade_id: 2, criteria_id: 2, status: "in_progress" }),
    order({ grade_id: 1, criteria_id: 1, status: "in_progress" }),
    order({ grade_id: 1, criteria_id: 2, status: "completed" }),
  ];
  const f: ClientFilters = {
    ...DEFAULT_FILTERS,
    gradeId: "1",
    criteriaCode: "M",
    activity: "active" as Activity,
  };
  const { clients } = buildClients(orders, f, codeById);
  assert.equal(clients.length, 1); // only orders[0] survives
  assert.equal(clients[0].orders.length, 1);

  // omni-search hits school text too
  const withSchool = [
    order({ client_school: "مدرسة السلام" }),
    order({ client_school: "ثانوية النور" }),
  ];
  const res = buildClients(
    withSchool,
    { ...DEFAULT_FILTERS, q: "السلام" },
    codeById
  );
  assert.equal(res.clients.length, 1);
  assert.equal(res.clients[0].schools[0], "مدرسة السلام");

  // empty result set is safe
  const empty = buildClients(withSchool, { ...DEFAULT_FILTERS, q: "لا يوجد" }, codeById);
  assert.deepEqual(empty.clients, []);
  assert.equal(empty.stats.totalClients, 0);
  assert.equal(empty.stats.topSchool, null);
});

test("sorting keys work", () => {
  const mk = (
    name: string,
    value: number,
    n: number,
    at: string
  ): ClientOrder[] =>
    Array.from({ length: n }, (_, i) =>
      order({
        client_name: name,
        client_phone: name,
        total_price: value / n,
        created_at: at,
      })
    );
  const orders = [
    ...mk("أ", 100, 2, "2026-08-01"),
    ...mk("ب", 200, 1, "2026-08-05"),
    ...mk("ج", 10, 5, "2026-08-03"),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const bySpend = buildClients(orders, { ...DEFAULT_FILTERS, sort: "spending" }, codeById);
  assert.deepEqual(bySpend.clients.map((c) => c.name), ["ب", "أ", "ج"]);

  const byOrders = buildClients(orders, { ...DEFAULT_FILTERS, sort: "orders" }, codeById);
  assert.deepEqual(byOrders.clients.map((c) => c.name), ["ج", "أ", "ب"]);

  const byAlpha = buildClients(orders, { ...DEFAULT_FILTERS, sort: "alpha" }, codeById);
  assert.deepEqual(byAlpha.clients.map((c) => c.name), ["أ", "ب", "ج"]);
});
