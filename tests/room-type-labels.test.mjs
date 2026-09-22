import test from "node:test";
import assert from "node:assert/strict";
import { roomTypeLabel } from "../src/lib/room-type-labels.ts";
import { rooms } from "../src/lib/rooms.ts";

test("production PMS codes display the eleven rate-sheet room names", () => {
  const codes = ["SDX", "DDM", "DHO", "THO", "JFO", "JDO", "PDO", "PTO", "LDO", "LTO", "LFO"];
  assert.deepEqual(codes.map(roomTypeLabel).sort(), rooms.map(r => r.korean).sort());
  assert.equal(roomTypeLabel("DDM"), "디럭스 더블 마운틴");
  assert.equal(roomTypeLabel("THO"), "디럭스 트윈 하프오션");
  assert.equal(roomTypeLabel("디럭스 더블 마운틴"), "디럭스 더블 마운틴");
  assert.equal(roomTypeLabel("JDM"), "JDM");
});
