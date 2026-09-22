import test from "node:test";
import assert from "node:assert/strict";
import { validateNotice, sortNotices, isNewNotice } from "../src/lib/notices/model.ts";
import { sameOrigin, readJson, revisionFrom } from "../src/lib/api.ts";

const input = { title: "운영 안내", body: "첫째 줄\n둘째 줄", category: "안내" };
test("notice input requires title, body and category only", () => {
  assert.deepEqual(validateNotice(input), input);
  for (const change of [{ title: " " }, { title: "a".repeat(121) }, { body: " " }, { body: "a".repeat(20001) }, { category: "invalid" }]) {
    assert.throws(() => validateNotice({ ...input, ...change }), { status: 400 });
  }
  assert.equal(validateNotice({ ...input, title: "  안내  " }).title, "안내");
  assert.deepEqual(validateNotice({ ...input, isPublished: false, isPinned: true }), input);
  assert.throws(() => revisionFrom({}), { status: 400 });
});
test("notices sort by creation date and NEW expires after seven days", () => {
  const now = Date.parse("2026-09-08T00:00:00Z");
  assert.equal(isNewNotice("2026-09-02T00:00:00Z", now), true);
  assert.equal(isNewNotice("2026-09-01T00:00:00Z", now), false);
  assert.equal(isNewNotice("2026-09-09T00:00:00Z", now), false);
  const records = [
    { ...input, id: "1", createdAt: "2026-09-01", updatedAt: "2026-09-09" },
    { ...input, id: "2", createdAt: "2026-09-08", updatedAt: "2026-09-08" },
  ];
  assert.equal(sortNotices(records)[0].id, "2");
  assert.equal(records[0].id, "1");
});
test("write requests reject cross-origin submissions and oversized JSON", async () => {
  const request = (origin) => new Request("https://example.com/api/admin/notices/", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}",
  });
  sameOrigin(request("https://example.com"));
  sameOrigin(new Request("http://localhost:3000/api/admin/notices/", {
    method: "POST", headers: { host: "example.com", origin: "https://example.com", "x-forwarded-proto": "https" },
  }));
  assert.throws(() => sameOrigin(request("https://other.example")), { status: 403 });
  assert.throws(() => sameOrigin(new Request("https://example.com/")), { status: 403 });
  const oversized = new Request("https://example.com", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "a".repeat(100) }),
  });
  await assert.rejects(readJson(oversized, 10), { status: 413 });
});
