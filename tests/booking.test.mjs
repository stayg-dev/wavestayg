import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  initialBooking,
  nightsBetween,
  normalizeBookingQuery,
  totalFor,
  validISO,
  validateDates,
  validateGuest,
} from "../src/lib/booking.ts";
test("date ranges cross month and leap-year boundaries correctly", () => {
  assert.equal(addDays("2028-02-28", 2), "2028-03-01");
  assert.equal(nightsBetween("2028-02-28", "2028-03-01"), 2);
  assert.equal(nightsBetween("2026-12-31", "2027-01-03"), 3);
  assert.equal(validISO("2026-02-30"), false);
  assert.equal(nightsBetween("invalid", "2026-09-22"), 0);
});
test("guest details reject whitespace and nonnumeric phone numbers", () => {
  const b = {
    ...initialBooking,
    lastName: "홍",
    firstName: "길동",
    email: "test@example.com",
    phone: "010-1234-5678",
    terms: true,
  };
  assert.equal(validateGuest(b), "");
  assert.notEqual(validateGuest({ ...b, lastName: "  " }), "");
  assert.notEqual(validateGuest({ ...b, phone: "--------" }), "");
  assert.notEqual(validateGuest({ ...b, terms: false }), "");
});
test("invalid dates and oversized parties cannot proceed", () => {
  assert.notEqual(
    validateDates({ ...initialBooking, checkout: initialBooking.checkin }),
    "",
  );
  assert.notEqual(
    validateDates({ ...initialBooking, adults: 6, children: 1 }),
    "",
  );
  assert.notEqual(
    validateDates({ ...initialBooking, checkout: "2026-11-01" }),
    "",
  );
  assert.equal(validateDates(initialBooking), "");
});
test("booking totals use nightly price times nights and tax after discount", () => {
  assert.deepEqual(totalFor(initialBooking), {
    subtotal: 84000,
    saving: 0,
    tax: 8400,
    total: 92400,
  });
  assert.deepEqual(totalFor(initialBooking, true), {
    subtotal: 84000,
    saving: 12600,
    tax: 7140,
    total: 78540,
  });
});
test("query values are validated before initializing the booking", () => {
  assert.deepEqual(
    normalizeBookingQuery("checkin=bad&checkout=bad&guests=99&room=0"),
    {},
  );
  assert.deepEqual(
    normalizeBookingQuery(
      "checkin=2026-10-01&checkout=2026-10-04&guests=3&room=4",
    ),
    { checkin: "2026-10-01", checkout: "2026-10-04", adults: 3, room: 4 },
  );
});
