const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CREATE_PASSWORD = process.env.CREATE_PASSWORD || "defaultpassword";

const DB_PATH = path.join(__dirname, "data", "links.db");

let db;

db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL
    )
`, (err) => {
    if (err) {
        console.error("Error creating table:", err.message);
    }
});

app.use(express.static("public"));

app.use(express.json());

app.post("/shorten", (req, res) => {
    const { password, name, url } = req.body;

    if (!password || password !== CREATE_PASSWORD) {
        return res.status(403).json({ error: "Invalid password" });
    }
    if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" });
    }

    const stmt = db.prepare("INSERT INTO links (name, url) VALUES (?, ?)");
    stmt.run([name, url], (err) => {
        if (err) {
            res.status(409).json({ error: "Name already taken" });
        } else {
            res.json({ shortUrl: `/${name}` });
        }
    });
});

app.get("/:name", (req, res) => {
    const name = req.params.name;

    db.get("SELECT url FROM links WHERE name = ?", [name], (err, row) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else if (row) {
            res.redirect(row.url);
        } else {
            res.status(404).json({ error: "Short link not found" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Link shortener running on port ${PORT}`);
});
