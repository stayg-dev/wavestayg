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
const paymentOrder = randomUUID(), applicationId = randomUUID(), statusToken = 's'.repeat(43), callbackToken = 'c'.repeat(43);
let paymentStatus = 'awaiting_auth';
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
  if (url.pathname.endsWith('/payments/config')) data = { enabled: true, ready: true, policy_version: 'test-v1', policy_text: '테스트 취소 규정입니다.' };
  else if (url.pathname.endsWith('/payments/prepare')) data = { order_id: paymentOrder, application_id: applicationId, expires_at: new Date(Date.now() + 900000).toISOString(), status_token: statusToken, fields: { MID: 'fixture00m', Moid: 'Wfixture', Amt: '25000', PayMethod: 'CARD', ReturnURL: `${origin}/api/payments/return/?order=${paymentOrder}&token=${callbackToken}` } };
  else if (url.pathname.endsWith('/authenticate')) { paymentStatus = 'paid'; data = { order_id: paymentOrder, status_token: statusToken }; }
  else if (url.pathname.endsWith('/status')) { assert.equal(body.token, statusToken); data = { order_id: paymentOrder, application_id: applicationId, status: paymentStatus, amount: 25000, refunded_amount: 0, expires_at: new Date().toISOString(), created_at: new Date().toISOString(), environment: 'test' }; }
  else if (url.pathname.endsWith('/payments/lookup')) data = { order_id: paymentOrder, status_token: statusToken };
  else if (url.pathname.endsWith('/lookup')) {
    if (body.password !== 'fixture-password') { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: '예약번호 또는 비밀번호를 확인해 주세요.' })); return; }
    data = { id: applicationId, kind: 'general', owner_id: null, status: 'registered', check_in: '2026-11-10', check_out: '2026-11-11', room_count: 1, room_type_name: 'DDM', guest_name: '투숙 테스트', phone: '01012345678', booker_name: '결제 테스트', booker_phone: '01012345678', guest_count: 2, quoted_amount: 25000, pricing: { room_amount: 25000, guest_fee: 0, bedding_fee: 0, total: 25000 }, note: '늦은 체크인 예정', admin_note: '', report_ids: [], is_peak: false, payment_order_id: paymentOrder };
  }
  else if (url.pathname.endsWith('/admin/payments')) data = { page: 1, total: 1, items: [{ order_id: paymentOrder, application_id: applicationId, status: paymentStatus, amount: 25000, refunded_amount: 0, expires_at: new Date().toISOString(), created_at: new Date().toISOString(), environment: 'test', moid: 'Wfixture', tid: 'fixture00m01012610131200000001', last_error: null, review_note: '', refunds: [] }] };
  else if (url.pathname.endsWith('/refund')) { paymentStatus = 'refund_pending'; data = { id: randomUUID(), status: 'queued', moid: 'Rfixture' }; }
  else if (url.pathname.endsWith('/inventory')) data = [{ name: 'DDM', available: 2 }];
  else if (url.pathname.endsWith('/quote')) data = { room_amount: 25000, upgrade_amount: 0, guest_fee: 0, bedding_fee: 0, total: 25000, owned_type: null, pricing_revision: sales.revision };
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
  const paymentCall = (path, body, extra = {}) => fetch(`${origin}/api/payments/${path}/`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal((await paymentCall('prepare', { terms: true, payment_terms: true }, { Origin: 'https://other.test' })).status, 403);
  assert.equal((await paymentCall('prepare', { terms: true })).status, 400);
  assert.equal((await paymentCall(`${paymentOrder}/status`)).status, 401);
  const prepared = await paymentCall('prepare', { terms: true, payment_terms: true, adults: 2, children: 1, quoted_amount: 1 });
  const preparedBody = await prepared.json();
  assert.equal(prepared.status, 200); assert.equal(preparedBody.status_token, undefined);
  assert.equal(calls.at(-1).body.quoted_amount, 0); assert.equal(calls.at(-1).body.guest_count, 3);
  assert.equal(calls.at(-1).body.terms, undefined); assert.equal(calls.at(-1).body.payment_terms, undefined);
  const paymentCookie = prepared.headers.get('set-cookie'); assert.match(paymentCookie, /HttpOnly/i); assert.match(paymentCookie, /Secure/i);
  assert.equal((await paymentCall(`${paymentOrder}/status`, undefined, { Cookie: paymentCookie.split(';')[0] })).status, 200);
  // Mobile return is a cross-site POST without the original browser cookie.
  const returned = await fetch(`${origin}/api/payments/return/?order=${paymentOrder}&token=${callbackToken}`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://pg-web.nicepay.co.kr' }, body: 'AuthResultCode=0000&Amt=000000025000&AuthToken=test%2Btoken&AuthResultMsg=%C3%EB%BC%D2' });
  assert.equal(returned.status, 303); assert.equal(returned.headers.get('location'), `/reservation/payment/?order=${paymentOrder}`);
  assert.match(returned.headers.get('set-cookie'), /HttpOnly/i); assert.equal(calls.at(-1).body.fields.AuthToken, 'test+token');
  assert.equal(calls.at(-1).body.fields.Amt, '000000025000'); assert.equal(calls.at(-1).body.fields.AuthResultMsg, undefined);
  assert.equal((await call('admin/payments')).status, 401);
  assert.equal((await call(`admin/payments/${paymentOrder}/refund`, 'POST', { request_id: randomUUID(), reason: '테스트' }, adminCookie, 'https://other.test')).status, 403);
  // Optional real-browser check, using an already installed Playwright runtime.
  if (process.env.SALES_PLAYWRIGHT_MODULE) {
    const { chromium } = await import(pathToFileURL(process.env.SALES_PLAYWRIGHT_MODULE).href);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addCookies([{ name: "wave_stayg_admin", value: adminCookie.split("=")[1], url: origin, httpOnly: true, sameSite: "Strict" }]);
      const page = await context.newPage();
      async function reservationScreenshot(name) {
        await page.evaluate(async () => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); }));
        });
        assert.deepEqual(await page.locator('main img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src'))), [], 'reservation images must load');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'reservation has no horizontal overflow');
        await page.screenshot({ path: `design-reference/${name}.png`, fullPage: true });
      }
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
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route('https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.goPay = function(form) { const field = document.createElement('input'); field.type='hidden'; field.name='AuthResultCode'; field.value='0000'; form.appendChild(field); window.nicepaySubmit(); };` }));
      await page.goto(origin);
      await page.getByRole('link', { name: '예약&조회', exact: true }).click();
      await page.waitForURL('**/reservation/');
      await page.goto(`${origin}/reservation/book/?check_in=2026-11-10&check_out=2026-11-11&adults=3`);
      assert.equal(await page.getByLabel('체크인', { exact: true }).inputValue(), '2026-11-10');
      assert.equal(await page.getByLabel('체크아웃', { exact: true }).inputValue(), '2026-11-11');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await reservationScreenshot('reservation-step1-desktop');
      await page.setViewportSize({ width: 390, height: 844 });
      await reservationScreenshot('reservation-step1-mobile');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.getByRole('button', { name: '다음 → 객실 선택', exact: true }).click();
      await page.getByText('인원 초과', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '다음 → 예약자 정보', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: '← 이전', exact: true }).click();
      await page.getByRole('button', { name: '성인 줄이기', exact: true }).click();
      await page.getByRole('button', { name: '다음 → 객실 선택', exact: true }).click();
      await page.getByRole('radio').check();
      await reservationScreenshot('reservation-step2-desktop');
      await page.setViewportSize({ width: 390, height: 844 });
      await reservationScreenshot('reservation-step2-mobile');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.getByRole('button', { name: '다음 → 예약자 정보', exact: true }).click();
      await page.getByRole('button', { name: '← 이전', exact: true }).click();
      await page.getByRole('button', { name: '← 이전', exact: true }).click();
      await page.getByRole('button', { name: '아동 늘리기', exact: true }).click();
      assert.equal(await page.getByRole('complementary', { name: '예약 요약' }).getByText('총액', { exact: true }).count(), 0, 'changing occupancy invalidates the old quote');
      await page.getByRole('button', { name: '아동 줄이기', exact: true }).click();
      await page.getByRole('button', { name: '다음 → 객실 선택', exact: true }).click();
      await page.getByRole('button', { name: '다음 → 예약자 정보', exact: true }).click();
      await page.getByLabel('예약자 이름', { exact: true }).fill('결제 테스트');
      await page.getByLabel('예약자 연락처 · 알림톡 수신', { exact: true }).fill('01012345678');
      await page.getByRole('checkbox', { name: '예약자와 실제 투숙객이 같습니다.', exact: true }).uncheck();
      await page.getByLabel('실제 투숙객 이름', { exact: true }).fill('투숙 테스트');
      await page.getByLabel('투숙객 연락처', { exact: true }).fill('01012345678');
      await page.locator('input[name=password]').fill('fixture-password');
      await page.locator('input[name=terms]').check();
      await reservationScreenshot('reservation-step3-desktop');
      await page.setViewportSize({ width: 390, height: 844 });
      await reservationScreenshot('reservation-step3-mobile');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.getByRole('button', { name: '다음 → 결제 확인', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '카드 결제 준비', exact: true }).isDisabled(), true);
      await page.locator('input[name=payment_terms]').check();
      await reservationScreenshot('reservation-step4-desktop');
      await page.setViewportSize({ width: 390, height: 844 });
      await reservationScreenshot('reservation-step4-mobile');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await page.getByRole('button', { name: '카드 결제 준비', exact: true }).click();
      await page.getByRole('button', { name: 'NICEPAY 카드 결제창 열기', exact: true }).waitFor();
      const prepareCall = calls.findLast(call => call.url.endsWith('/payments/prepare'));
      assert.equal(prepareCall.body.adults, 2); assert.equal(prepareCall.body.booker_name, '결제 테스트');
      assert.equal(prepareCall.body.guest_name, '투숙 테스트'); assert.equal(prepareCall.body.pricing_revision, sales.revision);
      await page.getByRole('button', { name: 'NICEPAY 카드 결제창 열기', exact: true }).click();
      await page.getByRole('heading', { name: '결제 완료 · 예약 접수', exact: true }).waitFor();
      await reservationScreenshot('payment-result-mobile');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await reservationScreenshot('payment-result-desktop');
      paymentStatus = 'manual_review';
      await page.getByRole('button', { name: '상태 새로고침', exact: true }).click();
      await page.getByRole('heading', { name: '관리자 확인 중', exact: true }).waitFor();
      assert.equal(await page.locator('img[src$="success-check.svg"]').count(), 0);
      paymentStatus = 'failed';
      await page.getByRole('button', { name: '상태 새로고침', exact: true }).click();
      await page.getByRole('heading', { name: '결제 미완료 · 예약 취소', exact: true }).waitFor();
      await page.getByText('해당 예약은 종료되었습니다.', { exact: true }).waitFor();
      paymentStatus = 'paid';
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await page.goto(`${origin}/reservation/lookup/?id=${applicationId}`);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await reservationScreenshot('reservation-lookup-desktop');
      await page.getByLabel('조회 비밀번호', { exact: true }).fill('wrong-password');
      await page.getByRole('button', { name: '예약 조회하기', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: '예약번호 또는 비밀번호' }).waitFor();
      await page.getByLabel('조회 비밀번호', { exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: '예약 조회하기', exact: true }).click();
      await page.getByText('결제 완료 · 예약 접수', { exact: true }).waitFor();
      await reservationScreenshot('reservation-detail-desktop');
      await page.setViewportSize({ width: 390, height: 844 });
      await reservationScreenshot('reservation-detail-mobile');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await page.getByRole('button', { name: '다른 예약 조회하기', exact: true }).click();
      await reservationScreenshot('reservation-lookup-mobile');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await page.goto(`${origin}/admin/payments/`);
      await page.getByRole('button', { name: '전액 환불', exact: true }).click();
      await page.getByLabel('환불 사유', { exact: true }).fill('브라우저 환불 요청 테스트');
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: '확인 후 처리', exact: true }).click();
      await page.getByText('환불 처리 중', { exact: true }).waitFor();
      await page.screenshot({ path: 'design-reference/payment-admin-mobile.png', fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      assert.deepEqual(errors, []);
      console.log('Payment HTTP/browser checks passed: cookies, CSRF, raw mobile return, price stripping, official SDK callback and result page.');
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
