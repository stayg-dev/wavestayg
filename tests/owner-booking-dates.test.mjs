import test from "node:test";
import assert from "node:assert/strict";
import { firstOwnerCheckIn, ownerCheckInAllowed, shiftBookingDate } from "../src/lib/owner-booking-dates.ts";

test("owner calendar requires five days outside July and August", () => {
  const today = "2026-09-22";
  for (let i = 0; i < 5; i++) assert.equal(ownerCheckInAllowed(shiftBookingDate(today, i), today), false);
  assert.equal(ownerCheckInAllowed("2026-09-27", today), true);
  assert.equal(ownerCheckInAllowed("2026-10-06", today), true);
  assert.equal(ownerCheckInAllowed("2026-10-20", today), true);
  assert.equal(firstOwnerCheckIn(today), "2026-09-27");
});
test("July and August require fourteen days based on check-in month", () => {
  for (const today of ["2027-07-01", "2027-08-01"]) {
    for (let i = 0; i < 14; i++) assert.equal(ownerCheckInAllowed(shiftBookingDate(today, i), today), false);
    assert.equal(ownerCheckInAllowed(shiftBookingDate(today, 14), today), true);
  }
  assert.equal(firstOwnerCheckIn("2027-06-28"), "2027-07-12");
  assert.equal(ownerCheckInAllowed("2027-06-30", "2027-06-28"), false);
  assert.equal(ownerCheckInAllowed("2027-07-01", "2027-06-28"), false);
  assert.equal(ownerCheckInAllowed("2027-07-01", "2027-06-17"), true);
  assert.equal(ownerCheckInAllowed("2027-07-01", "2027-06-18"), false);
  assert.equal(ownerCheckInAllowed("2027-08-31", "2027-08-28"), false);
  assert.equal(ownerCheckInAllowed("2027-09-01", "2027-08-28"), false);
  assert.equal(ownerCheckInAllowed("2027-09-01", "2027-08-27"), true);
  assert.equal(firstOwnerCheckIn("2027-08-28"), "2027-09-02");
  assert.equal(ownerCheckInAllowed("2027-09-11", "2027-08-28"), true);
});
test("past dates, invalid dates and the supported year limit remain blocked", () => {
  for (const date of ["", "invalid", "2027-02-30", "2026-09-21"]) assert.equal(ownerCheckInAllowed(date, "2026-09-22"), false);
  assert.equal(ownerCheckInAllowed("2028-01-01", "2027-12-01"), false);
  assert.equal(firstOwnerCheckIn("2027-12-25"), "2027-12-30");
  assert.equal(firstOwnerCheckIn("2027-12-27"), "");
});
