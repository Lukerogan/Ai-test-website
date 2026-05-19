const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

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
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`
  );
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/leaderboard", (req, res) => {
  const limit = Math.min(25, parseInt(req.query.limit, 10) || 10);
  db.all(
    "SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?",
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
  const { name, score } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }

  const playerName = name.trim().slice(0, 20);
  const parsedScore = Number(score);

  if (!Number.isInteger(parsedScore) || parsedScore < 0) {
    return res.status(400).json({ error: "Score must be a positive integer." });
  }

  db.run(
    "INSERT INTO scores (name, score) VALUES (?, ?)",
    [playerName, parsedScore],
    function (err) {
      if (err) {
        console.error("Failed to save score:", err.message);
        return res.status(500).json({ error: "Failed to save score." });
      }
      res.json({ id: this.lastID, name: playerName, score: parsedScore });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Leaderboard server started on http://localhost:${PORT}`);
});
