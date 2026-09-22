import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { hashAdminPassword } from "../src/lib/admin-security.ts";

const path = new URL("../.env.local", import.meta.url);
let existing = "";
try {
  existing = await readFile(path, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (/^ADMIN_PASSWORD_HASH=.+/m.test(existing) && !process.argv.includes("--reset")) {
  console.log("관리자 설정이 이미 있습니다. 재발급하려면 npm run admin:setup -- --reset 을 실행하세요.");
  process.exit(0);
}
const password = randomBytes(18).toString("base64url");
const values = {
  ADMIN_PASSWORD_HASH: await hashAdminPassword(password),
  ADMIN_SESSION_SECRET: randomBytes(48).toString("base64url"),
};
for (const [key, value] of Object.entries(values)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  existing = pattern.test(existing)
    ? existing.replace(pattern, () => `${key}=${value}`)
    : `${existing.trimEnd()}\n${key}=${value}\n`;
}
await writeFile(path, existing.trimStart(), { encoding: "utf8", mode: 0o600 });
await writeFile(new URL("../.env.admin.local", import.meta.url), `ADMIN_PASSWORD=${password}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`관리자 설정을 .env.local에 저장했습니다.\n관리자 비밀번호: ${password}\n비밀번호 보관 파일: .env.admin.local (Git 제외)\nVercel에는 ADMIN_PASSWORD_HASH와 ADMIN_SESSION_SECRET을 등록하세요.`);
