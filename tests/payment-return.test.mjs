import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentReturn } from '../src/lib/payment-return.ts';
test('PG return preserves raw amounts and handles both legacy and UTF-8 non-protocol text', () => {
  for (const message of ['%C3%EB%BC%D2', '%EC%B7%A8%EC%86%8C']) {
    const fields = parsePaymentReturn(Buffer.from(`AuthResultCode=0000&Amt=000000005000&AuthToken=a%2Bb%3D&AuthResultMsg=${message}`));
    assert.equal(fields.Amt, '000000005000'); assert.equal(fields.AuthToken, 'a+b='); assert.equal(fields.AuthResultMsg, undefined);
  }
});
test('PG callback rejects duplicated, oversized and invalid protocol fields', () => {
  for (const body of ['AuthResultCode=0000&Amt=1&Amt=2', 'AuthResultCode=0000&AuthToken=%ZZ', 'AuthResultCode=0000&AuthToken=%00', 'AuthResultCode=0000&Amt=%C3%EB', 'Amt=10', 'x'.repeat(32001)]) assert.throws(() => parsePaymentReturn(Buffer.from(body)));
});
