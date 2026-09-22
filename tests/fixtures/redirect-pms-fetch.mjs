// Loaded only by the HTTP test child process, never by the deployed application.
import { readFile } from "node:fs/promises";
const settings = JSON.parse(await readFile(new URL("../../src/config/website.server.json", import.meta.url), "utf8"));
const target = new URL(process.env.WEBSITE_HTTP_TEST_TARGET);
if (target.protocol !== "http:" || target.hostname !== "127.0.0.1") throw new Error("HTTP test target must be loopback");
const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url.startsWith(`${settings.pmsApiUrl}/`)) {
    const redirected = `${target.toString().replace(/\/$/, "")}${url.slice(settings.pmsApiUrl.length)}`;
    return original(input instanceof Request ? new Request(redirected, input) : redirected, init);
  }
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("External network is blocked in the HTTP fixture");
  return original(input, init);
};
