import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  initialBooking,
  nightsBetween,
  normalizeBookingQuery,
  totalFor,
  rateTypeFor,
  validateRoomOccupancy,
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
test("rate sheet prices are charged directly without tax or coupon adjustments", () => {
  assert.deepEqual(totalFor(initialBooking), {
    nightly: [
      { date: "2026-09-20", type: "weekday", amount: 190000 },
      { date: "2026-09-21", type: "weekday", amount: 190000 },
    ],
    subtotal: 380000, extraGuests: 0, guestFee: 0,
    beddingSets: 0, beddingFee: 0, total: 380000,
  });
});
test("query values are validated before initializing the booking", () => {
  assert.deepEqual(
    normalizeBookingQuery("checkin=bad&checkout=bad&guests=99&room=99"),
    {},
  );
  assert.deepEqual(
    normalizeBookingQuery(
      "checkin=2026-10-01&checkout=2026-10-04&guests=3&room=4",
    ),
    { checkin: "2026-10-01", checkout: "2026-10-04", adults: 3, room: 4 },
  );
});

test("room links retain every catalog selection and reject invalid room IDs", () => {
  for (let room = 0; room < 11; room++) {
    assert.deepEqual(normalizeBookingQuery(`room=${room}`), { room });
    assert.ok(totalFor({ ...initialBooking, room }).total >= 340000);
  }
  for (const invalid of ["", "-1", "11", "1.5", "abc"]) {
    assert.deepEqual(normalizeBookingQuery(`room=${invalid}`), {});
  }
});

// Literal expectations transcribed from the supplied rate sheet, in stable ID order.
const expectedRates = [
  [170000, 190000, 220000], [190000, 210000, 240000],
  [210000, 230000, 260000], [210000, 230000, 260000],
  [230000, 250000, 280000], [230000, 250000, 280000],
  [240000, 260000, 290000], [240000, 260000, 290000],
  [240000, 260000, 290000], [240000, 260000, 290000],
  [250000, 270000, 300000],
];
test("all 33 room/date combinations match the supplied rate sheet", () => {
  for (const [room, prices] of expectedRates.entries()) {
    for (const [index, checkin] of ["2026-09-17", "2026-09-18", "2026-09-19"].entries()) {
      const quote = totalFor({ ...initialBooking, room, checkin, checkout: addDays(checkin, 1) });
      assert.equal(quote.total, prices[index], `room ${room}, date ${checkin}`);
    }
  }
});
test("mixed weekday/weekend stays sum nightly rates and exclude checkout day", () => {
  const quote = totalFor({ ...initialBooking, room: 0, checkin: "2026-09-17", checkout: "2026-09-21" });
  assert.deepEqual(quote.nightly.map(n => n.amount), [170000, 190000, 220000, 170000]);
  assert.equal(quote.total, 750000);
  assert.equal(quote.nightly.length, 4);
});
test("holiday eves take precedence, including lunar, substitute and election holidays", () => {
  for (const date of [
    "2026-02-15", "2026-02-16", "2026-02-17", "2026-03-01",
    "2026-04-30", "2026-05-24", "2026-06-02", "2026-07-16",
    "2026-08-14", "2026-08-16", "2026-09-23", "2026-09-24", "2026-09-25",
    "2026-10-04", "2026-10-08", "2026-12-24", "2026-12-31",
    "2027-02-05", "2027-02-08", "2027-05-02", "2027-05-12",
    "2027-07-18", "2027-12-26", "2027-12-31",
  ]) assert.equal(rateTypeFor(date), "peak", date);
  assert.equal(rateTypeFor("2026-10-09"), "friday", "holiday itself is not a holiday eve");
  assert.equal(rateTypeFor("2026-09-27"), "weekday", "ordinary Sunday");
  assert.equal(rateTypeFor("2027-06-06"), "weekday", "Memorial Day has no substitute holiday");
});
test("extra guests include bedding; young children are free; separately ordered bedding is charged per night", () => {
  const base = { ...initialBooking, room: 7 };
  assert.equal(totalFor({ ...base, children: 1 }).total, 480000);
  const extraGuest = totalFor({ ...base, adults: 3 });
  assert.equal(extraGuest.guestFee, 44000);
  assert.equal(extraGuest.beddingFee, 0);
  assert.equal(extraGuest.total, 524000);
  const extraBedding = totalFor({ ...base, adults: 3, extraBedding: 1 });
  assert.equal(extraBedding.total, 568000);
  assert.equal(totalFor({ ...base, adults: 1, children: 2 }).guestFee, 0);
});
test("room capacities and invalid pricing inputs are validated", () => {
  assert.notEqual(validateRoomOccupancy({ ...initialBooking, children: 1 }), "");
  assert.equal(validateRoomOccupancy({ ...initialBooking, room: 4, children: 1 }), "");
  assert.notEqual(validateRoomOccupancy({ ...initialBooking, room: 4, children: 2 }), "");
  assert.equal(validateRoomOccupancy({ ...initialBooking, room: 8, adults: 3, children: 1 }), "");
  for (const changes of [{ adults: -1 }, { children: -1 }, { adults: 2.5 }, { extraBedding: -1 }, { extraBedding: 0.5 }, { extraBedding: 7 }, { room: 99 }]) {
    assert.throws(() => totalFor({ ...initialBooking, ...changes }), RangeError);
  }
  assert.throws(() => rateTypeFor("invalid"), RangeError);
  assert.throws(() => totalFor({ ...initialBooking, checkin: "2028-01-01", checkout: "2028-01-02" }), /공휴일|프런트/);
  assert.equal(totalFor({ ...initialBooking, checkin: "2027-12-31", checkout: "2028-01-01" }).total, 240000);
});
