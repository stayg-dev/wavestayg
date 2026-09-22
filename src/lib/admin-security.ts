import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const scryptOptions = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, scryptOptions, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}
export const adminSessionSeconds = 30 * 24 * 60 * 60;

export async function hashAdminPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const key = await derive(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export function validPasswordHash(hash: string) {
  return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);
}

export async function verifyAdminPassword(password: string, hash: string) {
  if (!validPasswordHash(hash) || !password || password.length > 256)
    return false;
  const [, salt, expected] = hash.split(":");
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

function sign(payload: string, secret: string, passwordHash: string) {
  return createHmac("sha256", secret)
    .update(`${passwordHash}:${payload}`)
    .digest("base64url");
}

export function issueAdminSession(
  secret: string,
  passwordHash: string,
  now = Date.now(),
) {
  const payload = `${Math.floor(now / 1000) + adminSessionSeconds}.${randomBytes(24).toString("base64url")}`;
  return `${payload}.${sign(payload, secret, passwordHash)}`;
}

export function verifyAdminSession(
  token: string,
  secret: string,
  passwordHash: string,
  now = Date.now(),
) {
  if (
    secret.length < 32 ||
    !validPasswordHash(passwordHash) ||
    token.length > 200
  )
    return false;
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    !/^[A-Za-z0-9_-]{32}$/.test(parts[1])
  )
    return false;
  const expires = Number(parts[0]);
  const current = Math.floor(now / 1000);
  if (expires <= current || expires > current + adminSessionSeconds)
    return false;
  const expected = Buffer.from(
    sign(`${parts[0]}.${parts[1]}`, secret, passwordHash),
  );
  const actual = Buffer.from(parts[2]);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
