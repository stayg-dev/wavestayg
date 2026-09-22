// Only emulates the external PMS transport for the Next.js HTTP tests.
// Real PMS persistence is exercised separately with pg-mem in backend tests.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { once } from "node:events";

export async function startNoticePms(key, projectId) {
  let notices = [];
  let revision = null;
  let loginAvailable = true;
  const server = createServer(async (req, res) => {
    const send = (status, data, message = "ok") => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ code: status < 300 ? 200 : status, message, data }));
    };
    const prefix = `/projects/${projectId}/website/`;
    if (req.headers["x-website-key"] !== key || !req.url.startsWith(prefix)) return send(401, null);
    const path = req.url.slice(prefix.length);
    if (path === "admin-login-attempt" && req.method === "POST") {
      return loginAvailable ? send(201, null) : send(404, null, `Cannot POST ${req.url}`);
    }
    if (req.method === "GET" && ["notices", "admin/notices"].includes(path)) return send(200, { notices, ...(path === "admin/notices" ? { revision } : {}) });
    if (!path.startsWith("admin/notices")) return send(404, null);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (body.revision !== revision) return send(409, null, "목록을 새로고침해 주세요.");
    const id = path.split("/")[2];
    const previous = notices.find((n) => n.id === id);
    if (id && !previous) return send(404, null);
    if (req.method === "DELETE") notices = notices.filter((n) => n.id !== id);
    else {
      const now = new Date().toISOString();
      const notice = { ...body.notice, id: id ?? randomUUID(), created_at: previous?.created_at ?? now, updated_at: now };
      notices = previous ? notices.map((n) => n.id === id ? notice : n) : [...notices, notice];
    }
    revision = randomUUID();
    send(req.method === "POST" ? 201 : 200, { notices, revision });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    setLoginAvailable(value) { loginAvailable = value; },
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }),
  };
}
