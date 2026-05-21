const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const dbFile = path.join(__dirname, "leaderboard.db");

const db = new sqlite3.Database(dbFile, err => {
  if (err) {
    console.error("Failed to open leaderboard database:", err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      lives INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`
  );

  db.all(`PRAGMA table_info(scores)`, (err, columns) => {
    if (err) {
      console.error("Failed to inspect leaderboard schema:", err.message);
      return;
    }
    const names = (columns || []).map(col => col.name);
    if (!names.includes("lives")) {
      db.run("ALTER TABLE scores ADD COLUMN lives INTEGER NOT NULL DEFAULT 0");
    }
    if (!names.includes("level")) {
      db.run("ALTER TABLE scores ADD COLUMN level INTEGER NOT NULL DEFAULT 1");
    }
  });
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get("/api/leaderboard", (req, res) => {
  const limit = Math.min(25, parseInt(req.query.limit, 10) || 10);
  db.all(
    "SELECT name, score, lives, level, created_at FROM scores ORDER BY score DESC, lives DESC, created_at ASC LIMIT ?",
    [limit],
    (err, rows) => {
      if (err) {
        console.error("Leaderboard query failed:", err.message);
        return res.status(500).json({ error: "Failed to load leaderboard." });
      }
      res.json({ entries: rows });
    }
  );
});

app.post("/api/score", (req, res) => {
  const { name, score, lives, level } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }

  const playerName = name.trim().slice(0, 20);
  const parsedScore = Number(score);
  const parsedLives = Number(lives);
  const parsedLevel = Number(level);

  if (!Number.isInteger(parsedScore) || parsedScore < 0) {
    return res.status(400).json({ error: "Score must be a positive integer." });
  }
  if (!Number.isInteger(parsedLives) || parsedLives < 0) {
    return res.status(400).json({ error: "Lives must be a non-negative integer." });
  }
  if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
    return res.status(400).json({ error: "Level must be a positive integer." });
  }

  db.run(
    "INSERT INTO scores (name, score, lives, level) VALUES (?, ?, ?, ?)",
    [playerName, parsedScore, parsedLives, parsedLevel],
    function (err) {
      if (err) {
        console.error("Failed to save score:", err.message);
        return res.status(500).json({ error: "Failed to save score." });
      }
      res.json({ id: this.lastID, name: playerName, score: parsedScore, lives: parsedLives, level: parsedLevel });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Leaderboard server started on http://localhost:${PORT}`);
});
