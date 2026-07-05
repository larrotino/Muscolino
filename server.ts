import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Data persistence directory setup
  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const PROGRAM_FILE = path.join(DATA_DIR, "custom_workout_program.json");
  const SESSIONS_FILE = path.join(DATA_DIR, "workout_sessions.json");
  const PREFERENCES_FILE = path.join(DATA_DIR, "user_preferences.json");

  // Middleware to parse JSON
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get all saved workout data
  app.get("/api/workout-data", (req, res) => {
    try {
      let program = null;
      if (fs.existsSync(PROGRAM_FILE)) {
        try {
          program = JSON.parse(fs.readFileSync(PROGRAM_FILE, "utf-8"));
        } catch (e) {
          console.error("Error parsing program file, resetting to default:", e);
        }
      }

      let sessions = [];
      if (fs.existsSync(SESSIONS_FILE)) {
        try {
          sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
        } catch (e) {
          console.error("Error parsing sessions file:", e);
        }
      }

      let preferences = {};
      if (fs.existsSync(PREFERENCES_FILE)) {
        try {
          preferences = JSON.parse(fs.readFileSync(PREFERENCES_FILE, "utf-8"));
        } catch (e) {
          console.error("Error parsing preferences file:", e);
        }
      }

      res.json({ program, sessions, preferences });
    } catch (error) {
      console.error("Errore nel recupero dei dati:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Save workout program
  app.post("/api/workout-program", (req, res) => {
    try {
      const { program } = req.body;
      if (program === null) {
        if (fs.existsSync(PROGRAM_FILE)) {
          fs.unlinkSync(PROGRAM_FILE);
        }
      } else {
        fs.writeFileSync(PROGRAM_FILE, JSON.stringify(program, null, 2), "utf-8");
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nel salvataggio del programma:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Save workout sessions
  app.post("/api/workout-sessions", (req, res) => {
    try {
      const { sessions } = req.body;
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions || [], null, 2), "utf-8");
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nel salvataggio delle sessioni:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Save user preferences (currentWeek, currentDay, personalWeight)
  app.post("/api/workout-preferences", (req, res) => {
    try {
      const { preferences } = req.body;
      fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(preferences || {}, null, 2), "utf-8");
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nel salvataggio delle preferenze:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
