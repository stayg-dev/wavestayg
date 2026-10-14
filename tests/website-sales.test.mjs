import test from "node:test";
import assert from "node:assert/strict";
import { editSalesDates, editGeneralSalesStatus, salesDateRange } from "../src/lib/website-sales.ts";

test("date selection uses inclusive stay-nights, validates dates and filters weekdays", () => {
  assert.deepEqual(salesDateRange("2026-10-12", "2026-10-18", [5, 6]), ["2026-10-16", "2026-10-17"]);
  for (const [from, to] of [["", ""], ["2026-02-30", "2026-03-02"], ["2026-10-02", "2026-10-01"], ["2026-01-01", "2027-02-01"]])
    assert.throws(() => salesDateRange(from, to));
});

test("general sale status clears legacy blocks while preserving owner records and prices", () => {
  const config = { tariffs: [{ room_type_id: "A" }], overrides: [], blocks: [
    { room_type_id: "A", date: "2026-10-20", audience: "all", reason: "old" },
    { room_type_id: "A", date: "2026-10-20", audience: "general", reason: "old" },
    { room_type_id: "A", date: "2026-10-20", audience: "owner", reason: "legacy owner" },
    { room_type_id: "B", date: "2026-10-20", audience: "all", reason: "other room" },
  ] };
  const open = editGeneralSalesStatus(config, ["A"], ["2026-10-20"], true);
  assert.deepEqual(open.blocks, config.blocks.slice(2));
  assert.equal(config.blocks.length, 4);
  const closed = editGeneralSalesStatus(open, ["A"], ["2026-10-20"], false);
  assert.equal(closed.blocks.at(-1).audience, "general");
  assert.equal(closed.blocks.at(-1).reason, "홈페이지 판매 불가");
  assert.deepEqual(closed.tariffs, config.tariffs);
  assert.deepEqual(editGeneralSalesStatus(closed, ["A"], ["2026-10-20"], false), closed);
});
test("reopening only clears selected scope; dates and other channels remain blocked", () => {
  const c = { valid_from: "2026-01-01", valid_to: "2027-12-31", tariffs: [{ room_type_id: "A" }], overrides: [], blocks: [
    { room_type_id: "A", date: "2026-10-13", audience: "all", reason: "점검" },
    { room_type_id: "A", date: "2026-10-13", audience: "general", reason: "단체" },
    { room_type_id: "B", date: "2026-10-13", audience: "all", reason: "점검" },
  ] };
  const next = editSalesDates(c, ["A"], ["2026-10-13"], "reopen", {}, "all", "");
  assert.equal(c.blocks.length, 3);
  assert.deepEqual(next.blocks, c.blocks.slice(1));
  const price = editSalesDates(next, ["A"], ["2026-10-13"], "price", { base_amount: 65000, discount_amount: 5000, sale_amount: 1 }, "all", "");
  assert.equal(price.overrides[0].discount_amount, 5000);
  assert.equal(price.overrides[0].sale_amount, 60000);
  assert.equal(price.blocks.length, 2);
  for (const discount_amount of [-1, 65000, 66000, 0.5]) assert.throws(() => editSalesDates(c, ["A"], ["2026-10-13"], "price", { base_amount: 65000, discount_amount, sale_amount: 1 }, "all", ""));
  assert.throws(() => editSalesDates(c, ["A"], ["2028-01-01"], "block", {}, "all", "점검"));
});
