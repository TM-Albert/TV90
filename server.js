import { mediaRoutes } from "./routes/mediaRoutes.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const routes = {
  ...mediaRoutes,
};

function serveFile(filePath) {
  if (!existsSync(filePath)) return new Response("Not Found", { status: 404 });
  const ext = filePath.match(/\.[^.]+$/)?.[0] || "";
  const mime = MIME[ext] || "application/octet-stream";
  return new Response(readFileSync(filePath), { headers: { "Content-Type": mime } });
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const routeHandler = routes[url.pathname];

    if (routeHandler) {
      const methodHandler = routeHandler[req.method];
      if (!methodHandler) {
        return Response.json({ error: "Method Not Allowed" }, { status: 405 });
      }
      try {
        return await methodHandler(req);
      } catch (err) {
        console.error("[error]", err);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
      }
    }

    const filePath = join(
      import.meta.dir,
      "public",
      url.pathname === "/" ? "index.html" : url.pathname
    );
    return serveFile(filePath);
  },
});

console.log(`📺 TV90 running at http://localhost:${server.port}`);
