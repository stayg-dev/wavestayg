import test from "node:test";
import assert from "node:assert/strict";
import {
  fillRateTableTariffs,
  initialSalesDraft,
  rateTableTariff,
} from "../src/lib/website-sales-defaults.ts";

const room = { id: "pms-room-id", name: "DDM" };
const snapshot = () => ({
  revision: null,
  room_types: [room, { id: "unknown-id", name: "Unknown room" }],
  config: {
    is_enabled: false,
    is_general_enabled: true,
    is_owner_enabled: false,
    message: "준비 중",
    valid_from: "2026-01-01",
    valid_to: "2027-12-31",
    tariffs: [],
    overrides: [],
    blocks: [
      {
        room_type_id: room.id,
        date: "2026-10-20",
        audience: "all",
        reason: "점검",
      },
    ],
    services: {
      general_guest: 22000,
      general_bedding: 22000,
      owner_guest: 11000,
      owner_bedding: 11000,
      extra_hour: 11000,
    },
  },
});

test("published off-season prices map all PMS types and retain a separate discount", () => {
  for (const [name, weekday] of Object.entries({
    SDX: 55000,
    DDM: 65000,
    DHO: 65000,
    THO: 65000,
    JFO: 75000,
    JDO: 75000,
    PDO: 85000,
    PTO: 85000,
    LDM: 85000,
    LDO: 85000,
    LTO: 85000,
    LFO: 95000,
  })) {
    const tariff = rateTableTariff({ id: room.id, name });
    assert.equal(tariff.room_type_id, room.id);
    assert.equal(tariff.name, name);
    for (const [period, base] of [
      ["weekday", weekday],
      ["friday", weekday + 20000],
      ["saturday", weekday + 40000],
    ]) {
      assert.deepEqual(tariff[period], {
        base_amount: base,
        discount_amount: 5000,
        sale_amount: base - 5000,
      });
    }
  }
  assert.deepEqual(
    rateTableTariff({ ...room, name: "디럭스 더블 마운틴" }).weekday,
    rateTableTariff(room).weekday,
  );
  assert.equal(rateTableTariff({ ...room, name: "Unknown room" }), null);
});

test("first-use draft fills prices without changing the source or enabling bookings", () => {
  const data = snapshot();
  const draft = initialSalesDraft(data);
  assert.equal(draft.tariffs.length, 1);
  assert.equal(data.config.tariffs.length, 0);
  assert.deepEqual({ ...draft, tariffs: [] }, data.config);
  draft.blocks[0].reason = "changed";
  assert.equal(data.config.blocks[0].reason, "점검");
});

test("saved or partially populated settings are never automatically overwritten", () => {
  const data = snapshot();
  data.revision = "saved-revision";
  assert.deepEqual(initialSalesDraft(data), data.config);
  data.revision = null;
  data.config.tariffs = [
    {
      ...rateTableTariff(room),
      weekday: {
        base_amount: 72000,
        discount_amount: 2000,
        sale_amount: 70000,
      },
    },
  ];
  assert.deepEqual(initialSalesDraft(data), data.config);
  data.config.overrides = [
    {
      room_type_id: room.id,
      date: "2026-10-20",
      base_amount: 99000,
      discount_amount: 1000,
      sale_amount: 98000,
    },
  ];
  const filled = fillRateTableTariffs(data.config, [
    ...data.room_types,
    { id: "second-id", name: "SDX" },
  ]);
  assert.equal(filled.tariffs.length, 2);
  assert.deepEqual(filled.tariffs[0], data.config.tariffs[0]);
  assert.deepEqual({ ...filled, tariffs: [] }, { ...data.config, tariffs: [] });
  assert.deepEqual(fillRateTableTariffs(filled, data.room_types), filled);
});
