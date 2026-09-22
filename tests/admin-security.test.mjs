import test from "node:test";
import assert from "node:assert/strict";
import {
  hashAdminPassword,
  verifyAdminPassword,
  issueAdminSession,
  verifyAdminSession,
  adminSessionSeconds,
} from "../src/lib/admin-security.ts";

test("password hashes verify the correct password and use independent salts", async () => {
  const hash = await hashAdminPassword("test-only-password");
  assert.equal(await verifyAdminPassword("test-only-password", hash), true);
  assert.equal(await verifyAdminPassword("wrong", hash), false);
  assert.notEqual(hash, await hashAdminPassword("test-only-password"));
  assert.equal(
    await verifyAdminPassword("test-only-password", "invalid"),
    false,
  );
});

test("sessions reject tampering, expiration and credential rotation", async () => {
  const secret = "test-only-session-secret-32-characters-long";
  const hash = await hashAdminPassword("test-only-password");
  const now = 1_800_000_000_000;
  const token = issueAdminSession(secret, hash, now);
  assert.equal(verifyAdminSession(token, secret, hash, now), true);
  assert.equal(verifyAdminSession(token + "x", secret, hash, now), false);
  assert.equal(
    verifyAdminSession(token, secret, hash, now + adminSessionSeconds * 1000),
    false,
  );
  assert.equal(verifyAdminSession(token, secret + "changed", hash, now), false);
  assert.equal(
    verifyAdminSession(
      token,
      secret,
      await hashAdminPassword("new-password"),
      now,
    ),
    false,
  );
  assert.equal(verifyAdminSession("malformed", secret, hash, now), false);
});

test("fixed configuration salt preserves sessions across server instances", async () => {
  const salt = "5e357170c145ada9220ebf2023de5d40";
  const first = await hashAdminPassword("fixture-password", salt);
  const second = await hashAdminPassword("fixture-password", salt);
  const secret = "fixture-session-secret-32-characters-long";
  assert.equal(first, second);
  assert.equal(verifyAdminSession(issueAdminSession(secret, first), secret, second), true);
  assert.notEqual(first, await hashAdminPassword("changed-password", salt));
});
