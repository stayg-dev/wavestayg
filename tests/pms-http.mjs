import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import {
  hashAdminPassword,
  issueAdminSession,
} from "../src/lib/admin-security.ts";

const key = "local-http-fixture-key-not-a-real-credential";
const secret = "local-admin-session-fixture-secret-32-characters";
const hash = await hashAdminPassword("local-test-password");
const project = "7b85fd96-06a0-42f3-bfb9-cbe14c55718a";
const calls = [];
const pms = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString())
    : undefined;
  calls.push({ url: req.url, headers: req.headers, body });
  if (
    req.headers["x-website-key"] !== key ||
    !req.url.startsWith(`/api/projects/${project}/website/`)
  ) {
    res.writeHead(401);
    res.end("{}");
    return;
  }
  const data = req.url.endsWith("/login")
    ? { token: "owner-fixture-token" }
    : req.url.endsWith("/quote")
      ? { total: 25000 }
      : { items: [], total: 0, page: 1 };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ code: 200, data }));
});
pms.listen(0, "127.0.0.1");
await once(pms, "listening");
const reserve = createServer();
reserve.listen(0, "127.0.0.1");
await once(reserve, "listening");
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
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
      WEBSITE_HTTP_TEST_TARGET: `http://127.0.0.1:${pms.address().port}/api`,
      PMS_API_URL: "",
      PMS_PROJECT_ID: project,
      PMS_API_KEY: key,
      ADMIN_PASSWORD_HASH: hash,
      ADMIN_SESSION_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (c) => {
  logs += c;
});
child.stderr.on("data", (c) => {
  logs += c;
});
async function call(
  path,
  method = "GET",
  body,
  cookie = "",
  source = origin,
  headers = {},
) {
  return fetch(`${origin}/api/pms/${path}/`, {
    method,
    headers: {
      Origin: source,
      Cookie: cookie,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(logs);
    try {
      if ((await fetch(`${origin}/owners/`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready);
  assert.equal((await call("admin/applications")).status, 401);
  assert.equal(
    (await call("owner-applications", "POST", { terms: true })).status,
    401,
  );
  assert.equal(
    (await call("login", "POST", {}, "", "https://another.example")).status,
    403,
  );
  assert.equal((await call("admin/unknown", "POST", {})).status, 404);
  assert.equal(calls.length, 0, "rejected requests never reach PMS");
  const adminCookie = `wave_stayg_admin=${issueAdminSession(secret, hash)}`;
  assert.equal(
    (await call("admin/applications", "GET", undefined, adminCookie)).status,
    200,
  );
  const logged = await call("login", "POST", {
    login_id: "301",
    password: "test-password",
  });
  assert.equal(logged.status, 200);
  const header = logged.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i);
  assert.match(header, /Secure/i);
  assert.match(header, /SameSite=strict/i);
  assert.deepEqual(
    await logged.json(),
    { authenticated: true },
    "owner token stays out of browser JS",
  );
  const cookie = header.split(";")[0];
  const balancePath = `admin/owners/${project}/balance`;
  const balanceBody = {
    year: 2026,
    annual_nights: 8,
    carryover_nights: 0,
    expected_annual_nights: 5,
    expected_carryover_nights: 0,
  };
  assert.equal(
    (await call(balancePath, "POST", balanceBody, cookie)).status,
    401,
  );
  assert.equal(
    (
      await call(
        balancePath,
        "POST",
        balanceBody,
        adminCookie,
        "https://another.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await call(balancePath, "POST", balanceBody, adminCookie)).status,
    200,
  );
  assert.deepEqual(calls.at(-1).body, balanceBody);
  assert.equal(calls.at(-1).headers["x-owner-session"], undefined);
  assert.equal((await call("me", "GET", undefined, cookie)).status, 200);
  assert.equal(calls.at(-1).headers["x-owner-session"], "owner-fixture-token");
  await call("quote", "POST", {}, cookie, origin, {
    "x-owner-session": "forged",
  });
  assert.equal(
    calls.at(-1).headers["x-owner-session"],
    undefined,
    "general requests cannot inherit or spoof owner identity",
  );
  await call("owner-quote", "POST", {}, cookie);
  assert.equal(calls.at(-1).headers["x-owner-session"], "owner-fixture-token");
  const response = await call(
    "applications",
    "POST",
    { terms: true, quoted_amount: 1, adults: 2, children: 1 },
    cookie,
  );
  assert.equal(response.status, 200);
  assert.equal(calls.at(-1).body.quoted_amount, 0, "PMS recomputes price");
  assert.equal(calls.at(-1).body.guest_count, 3);
  assert.equal(calls.at(-1).headers["x-owner-session"], undefined);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await call("login", "DELETE", undefined, cookie)).status, 200);
  console.log(
    "PMS proxy HTTP checks passed: admin auth, CSRF, route allowlist, owner cookies, scope separation and server-side pricing.",
  );
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, "exit");
  await new Promise((resolve) => pms.close(resolve));
}
