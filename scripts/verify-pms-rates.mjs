// Run after building the PMS backend. Optional argument: PMS backend directory.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { rooms } from '../src/lib/rooms.ts';
import { initialBooking, totalFor, addDays } from '../src/lib/booking.ts';
const require = createRequire(import.meta.url);
const backend = resolve(process.argv[2] ?? '../HIO/stayg-pms/backend');
const { websitePrice } = require(resolve(backend, 'dist/application/website-booking/pricing.js'));
let checked = 0;
for (const room of rooms) {
  for (let date = '2026-01-01'; date <= '2027-12-31'; date = addDays(date, 1)) {
    const checkout = addDays(date, 1);
    const website = totalFor({ ...initialBooking, room: room.id, checkin: date, checkout });
    const pms = websitePrice({ checkIn: date, checkOut: checkout, roomTypeName: room.korean, roomCount: 1, adults: 2, children: 0, extraBedding: 0 });
    assert.equal(pms.total, website.total, `${room.korean} / ${date}`);
    checked++;
  }
}
console.log(`Homepage/PMS rate parity passed: ${checked} room-night combinations.`);
