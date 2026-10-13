import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  hashAdminPassword,
  issueAdminSession,
} from "../src/lib/admin-security.ts";

const key = "local-http-fixture-key-not-a-real-credential";
const secret = "local-admin-session-fixture-secret-32-characters";
const hash = await hashAdminPassword("local-test-password");
const project = "7b85fd96-06a0-42f3-bfb9-cbe14c55718a";
const calls = [];
const roomTypeId = randomUUID();
const fixturePrice = () => ({ base_amount: 65000, discount_amount: 0, sale_amount: 65000 });
let sales = { revision: randomUUID(), room_types: [{ id: roomTypeId, name: "DDM" }], config: {
  is_enabled: true, is_general_enabled: true, is_owner_enabled: true, message: "", valid_from: "2026-01-01", valid_to: "2027-12-31",
  tariffs: [{ room_type_id: roomTypeId, name: "DDM", weekday: fixturePrice(), friday: fixturePrice(), saturday: fixturePrice() }],
  overrides: [], blocks: [], services: { general_guest: 22000, general_bedding: 22000, owner_guest: 11000, owner_bedding: 11000, extra_hour: 11000 },
} };
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
  let data = req.url.endsWith("/login")
    ? { token: "owner-fixture-token" }
    : req.url.endsWith("/quote")
      ? { total: 25000 }
      : { items: [], total: 0, page: 1 };
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname.endsWith("/admin/sales")) {
    if (req.method === "POST" && body.config?.tariffs) sales = { ...sales, config: structuredClone(body.config), revision: randomUUID() };
    data = sales;
  } else if (url.pathname.endsWith("/admin/sales/history")) data = [];
  else if (url.pathname.endsWith("/sales")) {
    const from = url.searchParams.get("from") ?? "2026-10-13", to = url.searchParams.get("to") ?? from;
    const dates = [];
    for (let d = Date.parse(`${from}T00:00:00Z`); d <= Date.parse(`${to}T00:00:00Z`) && dates.length < 31; d += 86400000) {
      const date = new Date(d).toISOString().slice(0, 10);
      dates.push({ date, ...sales.config.tariffs[0].weekday, is_open: !sales.config.blocks.some(b => b.date === date), is_owner_open: true });
    }
    data = { ...sales.config, revision: sales.revision, rooms: [{ room_type_id: roomTypeId, name: "DDM", dates }] };
  }
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
  const [pathname, query] = path.split("?");
  return fetch(`${origin}/api/pms/${pathname}/${query ? `?${query}` : ""}`, {
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
  for (const path of ["admin/sales", "admin/sales/history"]) {
    assert.equal((await call(path)).status, 401);
    assert.equal((await call(path, "GET", undefined, cookie)).status, 401);
    assert.equal((await call(path, "GET", undefined, adminCookie)).status, 200);
  }
  const settings = { revision: null, request_id: project, config: {}, reason: "local fixture" };
  assert.equal((await call("admin/sales", "POST", settings, cookie)).status, 401);
  assert.equal((await call("admin/sales", "POST", settings, adminCookie, "https://another.example")).status, 403);
  assert.equal((await call("admin/sales", "POST", settings, adminCookie)).status, 200);
  assert.deepEqual(calls.at(-1).body, settings);
  assert.equal((await call("sales?from=2026-10-13&to=2026-10-19&internal=true")).status, 200);
  assert.ok(calls.at(-1).url.endsWith("sales?from=2026-10-13&to=2026-10-19"));
  assert.equal((await call("owner-inventory")).status, 401);
  assert.equal((await call("owner-inventory", "GET", undefined, cookie)).status, 200);
  assert.ok(calls.at(-1).url.endsWith("/inventory"));
  assert.equal(calls.at(-1).headers["x-owner-session"], "owner-fixture-token");
  const historicalInventory = "admin/inventory?check_in=2026-09-01&check_out=2026-09-02";
  assert.equal((await call(historicalInventory)).status, 401);
  assert.equal((await call(historicalInventory, "GET", undefined, cookie)).status, 401);
  assert.equal((await call(historicalInventory, "GET", undefined, adminCookie)).status, 200);
  assert.ok(calls.at(-1).url.endsWith(historicalInventory));
  assert.equal(calls.at(-1).headers["x-owner-session"], undefined);
  for (const path of ["admin/owner-quote", "admin/owner-applications"]) {
    const body = { owner_id: project, terms: true, adults: 2, children: 1, password: "discard-me" };
    const before = calls.length;
    assert.equal((await call(path, "POST", body)).status, 401);
    assert.equal((await call(path, "POST", body, cookie)).status, 401);
    assert.equal((await call(path, "POST", body, adminCookie, "https://another.example")).status, 403);
    assert.equal(calls.length, before, "manual booking requires administrator authentication and same origin");
    if (path.endsWith("applications")) {
      assert.equal((await call(path, "POST", { ...body, terms: false }, adminCookie)).status, 400);
    }
    assert.equal((await call(path, "POST", body, adminCookie)).status, 200);
    assert.equal(calls.at(-1).body.owner_id, project);
    assert.equal(calls.at(-1).headers["x-owner-session"], undefined);
    if (path.endsWith("applications")) {
      assert.equal(calls.at(-1).body.quoted_amount, 0);
      assert.equal(calls.at(-1).body.guest_count, 3);
      assert.equal(calls.at(-1).body.password, undefined);
      assert.equal(calls.at(-1).body.terms, undefined);
    }
  }
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
  const cancelPath = "owner-applications/11111111-1111-4111-8111-111111111111/cancellation";
  assert.equal((await call(cancelPath)).status, 401);
  assert.equal((await call(cancelPath, "POST", {})).status, 401);
  assert.equal((await call(cancelPath, "POST", {}, cookie, "https://another.example")).status, 403);
  assert.equal((await call(cancelPath, "GET", undefined, cookie)).status, 200);
  assert.equal(calls.at(-1).headers["x-owner-session"], "owner-fixture-token");
  assert.equal((await call(cancelPath, "POST", {}, cookie, origin, { "x-owner-session": "forged" })).status, 200);
  assert.equal(calls.at(-1).headers["x-owner-session"], "owner-fixture-token");
  assert.ok(calls.at(-1).url.endsWith(cancelPath));
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
  // Optional real-browser check, using an already installed Playwright runtime.
  if (process.env.SALES_PLAYWRIGHT_MODULE) {
    const { chromium } = await import(pathToFileURL(process.env.SALES_PLAYWRIGHT_MODULE).href);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addCookies([{ name: "wave_stayg_admin", value: adminCookie.split("=")[1], url: origin, httpOnly: true, sameSite: "Strict" }]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${origin}/admin/settings/`);
      await page.getByLabel("디럭스 더블 마운틴 주중 할인액", { exact: true }).fill("5000");
      assert.equal(await page.getByLabel("디럭스 더블 마운틴 주중 실제 판매가", { exact: true }).textContent(), "60,000원");
      await page.getByLabel("변경 사유", { exact: true }).fill("할인 필드 UI 검증");
      await page.getByRole("button", { name: "PMS에 설정 저장", exact: true }).click();
      await page.getByText("PMS에 저장했습니다. 새 견적과 예약에 바로 적용됩니다.").waitFor();
      await page.reload();
      await page.getByLabel("디럭스 더블 마운틴 주중 할인액", { exact: true }).waitFor();
      assert.equal(await page.getByLabel("디럭스 더블 마운틴 주중 할인액", { exact: true }).inputValue(), "5000");
      const batch = page.locator("section").filter({ has: page.getByRole("heading", { name: "날짜별 요금·방막기", exact: true }) });
      await batch.getByRole("checkbox", { name: "디럭스 더블 마운틴", exact: true }).check();
      await batch.getByLabel("작업", { exact: true }).selectOption("block");
      await batch.getByLabel("방막기 사유 (관리자만 표시)", { exact: true }).fill("시설 점검");
      await batch.getByRole("button", { name: "선택 기간에 편집 적용", exact: true }).click();
      await page.getByLabel("변경 사유", { exact: true }).fill("방막기 UI 검증");
      await page.getByRole("button", { name: "PMS에 설정 저장", exact: true }).click();
      await page.getByText("PMS에 저장했습니다. 새 견적과 예약에 바로 적용됩니다.").waitFor();
      assert.equal(sales.config.blocks.length, 1);
      assert.equal(sales.config.blocks[0].reason, "시설 점검");
      await mkdir("design-reference", { recursive: true });
      await page.screenshot({ path: "design-reference/sales-settings-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "design-reference/sales-settings-mobile.png", fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "mobile page has no horizontal overflow");
      assert.deepEqual(errors, []);
      console.log("Sales settings browser checks passed: discount input, calculated price, save/reload, stop-sale and mobile layout.");
    } finally { await browser.close(); }
  }
  console.log(
    "PMS proxy HTTP checks passed: admin auth, CSRF, route allowlist, owner cookies, scope separation and server-side pricing.",
  );
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, "exit");
  await new Promise((resolve) => pms.close(resolve));
}
