import { Database } from "bun:sqlite";

const db = new Database("history.db");
db.run(`CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  watched_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") || u.pathname.split("/").pop();
    }
  } catch {}
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export const mediaRoutes = {
  "/api/watch": {
    POST: async (req) => {
      const body = await req.json();
      const videoId = extractVideoId(body.url || "");
      if (!videoId) return Response.json({ error: "Invalid YouTube URL" }, { status: 400 });
      db.run(
        "INSERT INTO history (url, video_id, title) VALUES (?, ?, ?)",
        [body.url, videoId, body.title || null]
      );
      return Response.json({ videoId });
    },
  },

  "/api/history": {
    GET: async () => {
      const rows = db
        .query("SELECT * FROM history ORDER BY watched_at DESC LIMIT 20")
        .all();
      return Response.json(rows);
    },
    DELETE: async () => {
      db.run("DELETE FROM history");
      return Response.json({ ok: true });
    },
  },
};
