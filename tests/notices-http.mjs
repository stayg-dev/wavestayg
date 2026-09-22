import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { startNoticePms } from "./fixtures/pms-notices-memory.mjs";
import {
  hashAdminPassword,
  issueAdminSession,
} from "../src/lib/admin-security.ts";

const portServer = createServer();
portServer.listen(0, "127.0.0.1");
await once(portServer, "listening");
const port = portServer.address().port;
await new Promise((resolve) => portServer.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const password = "http-test-password-not-a-real-credential";
const secret = "http-test-session-secret-not-a-real-credential";
const hash = await hashAdminPassword(password);
const pmsKey = "notice-test-pms-key-not-a-real-credential";
const projectId = "7b85fd96-06a0-42f3-bfb9-cbe14c55718a";
const pms = await startNoticePms(pmsKey, projectId);
const child = spawn(
  process.execPath,
  [
    "--import",
    new URL("./fixtures/redirect-pms-fetch.mjs", import.meta.url).href,
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      BLOB_READ_WRITE_TOKEN: "",
      BLOB_STORE_ID: "",
      VERCEL_OIDC_TOKEN: "",
      ADMIN_PASSWORD_HASH: hash,
      ADMIN_SESSION_SECRET: secret,
      PMS_API_URL: "",
      PMS_API_KEY: pmsKey,
      WEBSITE_HTTP_TEST_TARGET: pms.url,
      PMS_PROJECT_ID: projectId,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (chunk) => {
  logs += chunk;
});
child.stderr.on("data", (chunk) => {
  logs += chunk;
});
let cookie = "";
async function call(
  path,
  method = "GET",
  body,
  useAuth = true,
  requestOrigin = origin,
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(useAuth && cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET"
        ? { Origin: requestOrigin, "Content-Type": "application/json" }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response;
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    try {
      if ((await fetch(`${origin}/api/admin/session/`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, "server became ready");
  assert.equal((await call("/admin/")).status, 200);
  assert.equal((await call("/api/admin/notices/")).status, 401);
  assert.equal((await call("/api/admin/notices/", "POST", {})).status, 401);
  assert.equal(
    (
      await call(
        "/api/admin/session/",
        "POST",
        { password },
        false,
        "https://other.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await call("/api/admin/session/", "POST", { password: "wrong" }, false))
      .status,
    401,
  );
  const login = await call("/api/admin/session/", "POST", { password }, false);
  assert.equal(login.status, 200, await login.text());
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
  cookie = setCookie.split(";")[0];
  const adminHtml = await (await call("/admin/")).text();
  assert.match(adminHtml, /새 공지 작성/);
  assert.doesNotMatch(adminHtml, /임시저장|상단 고정|게시하기/);
  const base = {
    title: "테스트 공지",
    body: "첫 줄\n둘째 줄 <script>literal text</script>",
    category: "안내",
  };
  let snapshot = await (await call("/api/admin/notices/")).json();
  assert.equal(snapshot.revision, null);
  let response = await call("/api/admin/notices/", "POST", {
    notice: base,
    revision: snapshot.revision,
  });
  assert.equal(response.status, 201, await response.clone().text());
  snapshot = await response.json();
  const id = snapshot.catalog.notices[0].id;
  assert.deepEqual(
    (await (await call("/api/notices/", "GET", undefined, false)).json())
      .notices,
    snapshot.catalog.notices,
  );
  const staleRevision = snapshot.revision;
  response = await call(`/api/admin/notices/${id}/`, "PUT", {
    notice: { ...base, title: "수정된 공지" },
    revision: snapshot.revision,
  });
  assert.equal(response.status, 200, await response.clone().text());
  snapshot = await response.json();
  const publicResponse = await call("/api/notices/", "GET", undefined, false);
  assert.match(publicResponse.headers.get("cache-control"), /no-store/);
  assert.equal((await publicResponse.json()).notices[0].body, base.body);
  assert.equal((await (await call("/api/notices/", "GET", undefined, false)).json()).notices[0].title, "수정된 공지");
  assert.equal(
    (
      await call(`/api/admin/notices/${id}/`, "DELETE", {
        revision: staleRevision,
      })
    ).status,
    409,
  );
  response = await call(`/api/admin/notices/${id}/`, "DELETE", {
    revision: snapshot.revision,
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).catalog.notices.length, 0);
  assert.deepEqual((await (await call("/api/notices/", "GET", undefined, false)).json()).notices, []);
  assert.equal(
    (
      await call(
        `/api/admin/notices/${id}/`,
        "DELETE",
        { revision: snapshot.revision },
        false,
      )
    ).status,
    401,
  );
  const logout = await call("/api/admin/session/", "DELETE");
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
  cookie = "";
  assert.equal((await call("/api/admin/notices/")).status, 401);
  cookie = `wave_stayg_admin=${issueAdminSession(secret, hash, Date.now() - 9 * 3600000)}`;
  assert.equal((await call("/api/admin/notices/")).status, 401);
  console.log(
    "HTTP integration passed: login, cookie flags, admin-only CRUD, CSRF, immediate public reading, stale write, delete, logout and session expiry. PMS transport is emulated; no external database was modified.",
  );
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, "exit");
  await pms.close();
}
