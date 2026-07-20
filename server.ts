import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables
dotenv.config();

const PORT = 3000;

async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("DATABASE_URL is not set. Database features will not work.");
    return;
  }
  try {
    const sql = neon(dbUrl);
    // Create team_logs table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS team_logs (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL
      )
    `;
    console.log("Database table 'team_logs' verified/created successfully.");
  } catch (error) {
    console.error("Failed to initialize database table:", error);
  }
}

async function startServer() {
  const app = express();

  // Parse JSON payloads
  app.use(express.json());

  // Initialize DB tables
  await initDatabase();

  // API Route: Get logs
  app.get("/api/get-logs", async (req, res) => {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return res.status(500).json({ error: "DATABASE_URL is not configured on the server." });
      }
      const sql = neon(dbUrl);
      const result = await sql`SELECT id, content FROM team_logs ORDER BY id DESC LIMIT 50`;
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Save log
  app.post("/api/save-log", async (req, res) => {
    try {
      const { text, idToOverwrite } = req.body || {};
      if (!text) {
        return res.status(400).json({ error: "Text content is required" });
      }

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return res.status(500).json({ error: "DATABASE_URL is not configured on the server." });
      }
      const sql = neon(dbUrl);

      if (idToOverwrite) {
        // Overwrite existing log
        await sql`UPDATE team_logs SET content = ${text} WHERE id = ${idToOverwrite}`;
      } else {
        // Insert new log
        await sql`INSERT INTO team_logs (content) VALUES (${text})`;
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving log:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Static serving or Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
