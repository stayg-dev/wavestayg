import test from "node:test";
import assert from "node:assert/strict";
import { firstOwnerCheckIn, ownerCheckInAllowed, shiftBookingDate } from "../src/lib/owner-booking-dates.ts";

test("owner calendar blocks short notice and allows exactly fourteen days", () => {
  const today = "2026-09-22";
  for (let i = 0; i < 14; i++) assert.equal(ownerCheckInAllowed(shiftBookingDate(today, i), today), false);
  assert.equal(ownerCheckInAllowed("2026-10-06", today), true);
  assert.equal(ownerCheckInAllowed("2026-10-20", today), true);
  assert.equal(firstOwnerCheckIn(today), "2026-10-06");
});
test("peak-season exception preserves disabled off-season dates across month boundaries", () => {
  assert.equal(firstOwnerCheckIn("2027-06-28"), "2027-07-01");
  assert.equal(ownerCheckInAllowed("2027-06-30", "2027-06-28"), false);
  assert.equal(ownerCheckInAllowed("2027-07-01", "2027-06-28"), true);
  assert.equal(ownerCheckInAllowed("2027-08-31", "2027-08-28"), true);
  assert.equal(ownerCheckInAllowed("2027-09-01", "2027-08-28"), false);
  assert.equal(ownerCheckInAllowed("2027-09-11", "2027-08-28"), true);
  assert.equal(ownerCheckInAllowed("2028-01-01", "2027-12-01"), false);
  assert.equal(firstOwnerCheckIn("2027-12-25"), "");
});
