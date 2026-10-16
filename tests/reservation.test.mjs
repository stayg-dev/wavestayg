import test from "node:test";
import assert from "node:assert/strict";
import { reservationPrice, reservationRoom } from "../src/lib/reservation.ts";

const sales = () => ({
  is_enabled: true,
  is_general_enabled: true,
  rooms: [
    {
      name: "DDM",
      dates: [
        {
          date: "2026-11-10",
          base_amount: 65000,
          discount_amount: 5000,
          sale_amount: 60000,
          is_open: true,
        },
        {
          date: "2026-11-11",
          base_amount: 75000,
          discount_amount: 10000,
          sale_amount: 65000,
          is_open: true,
        },
      ],
    },
  ],
});
test("reservation totals use PMS nightly discounts and exclude checkout night", () => {
  assert.deepEqual(
    reservationPrice(sales(), "DDM", "2026-11-10", "2026-11-12"),
    { base: 140000, discount: 15000, total: 125000, nights: 2 },
  );
  assert.equal(
    reservationPrice(sales(), "DDM", "2026-11-10", "2026-11-11").total,
    60000,
  );
});
test("missing price, closed night, missing room or disabled sales cannot use static fallback prices", () => {
  const missing = sales();
  missing.rooms[0].dates[1].sale_amount = null;
  const blocked = sales();
  blocked.rooms[0].dates[1].is_open = false;
  for (const value of [
    null,
    missing,
    blocked,
    { ...sales(), is_general_enabled: false },
    { ...sales(), is_enabled: false },
  ]) {
    assert.equal(
      reservationPrice(value, "DDM", "2026-11-10", "2026-11-12"),
      null,
    );
  }
  assert.equal(
    reservationPrice(sales(), "THO", "2026-11-10", "2026-11-12"),
    null,
  );
  assert.equal(
    reservationPrice(sales(), "DDM", "2026-11-10", "2026-11-13"),
    null,
  );
});
test("PMS codes resolve to existing representative room photos without invented mapping", () => {
  assert.equal(reservationRoom("DDM").id, 1);
  assert.equal(reservationRoom("디럭스 더블 하프 오션").id, 2);
  assert.equal(reservationRoom("LDO").id, 8);
  assert.equal(reservationRoom("unknown"), undefined);
});

test("an explicitly open PMS test product is selectable while general sales are disabled", () => {
  const value = { ...sales(), is_enabled: false, is_general_enabled: false };
  value.rooms.push({ name: "테스트타입", dates: [{
    date: "2026-11-10", base_amount: 500, discount_amount: 0, sale_amount: 500, is_open: true,
  }] });
  assert.equal(reservationPrice(value, "테스트타입", "2026-11-10", "2026-11-11")?.total, 500);
  assert.equal(reservationPrice(value, "DDM", "2026-11-10", "2026-11-11"), null);
  value.rooms[1].dates[0].is_open = false;
  assert.equal(reservationPrice(value, "테스트타입", "2026-11-10", "2026-11-11"), null);
  value.rooms.pop();
  assert.equal(reservationPrice(value, "테스트타입", "2026-11-10", "2026-11-11"), null);
});
