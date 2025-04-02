const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CREATE_PASSWORD = process.env.CREATE_PASSWORD || "defaultpassword";
const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || CREATE_PASSWORD;

const DB_PATH = path.join(__dirname, "data", "links.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    } else {
        console.log("Connected to SQLite database.");
    }
});

db.exec("PRAGMA journal_mode = WAL;");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            url TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link_name TEXT NOT NULL,
            referrer TEXT DEFAULT 'direct',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (link_name) REFERENCES links(name)
        )
    `);
});

app.use(express.json());
app.use(express.static("public")); 

app.post("/shorten", (req, res) => {
    const { password, name, url } = req.body;

    if (!password || password !== CREATE_PASSWORD) {
        return res.status(403).json({ error: "Invalid password" });
    }
    if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" });
    }

    const stmt = db.prepare("INSERT INTO links (name, url) VALUES (?, ?)");
    stmt.run([name, url], function (err) {
        stmt.finalize(); 
        if (err) {
            return res.status(409).json({ error: "Name already taken" });
        }
        res.json({ shortUrl: `/${name}` });
    });
});

app.get("/:name", (req, res) => {
    const name = req.params.name;
    const referrer = req.get("Referer") || "direct"; 

    db.get("SELECT url FROM links WHERE name = ?", [name], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        if (row) {

            db.run("INSERT INTO clicks (link_name, referrer) VALUES (?, ?)", [name, referrer]);

            return res.redirect(row.url);
        }
        res.status(404).json({ error: "Short link not found" });
    });
});

app.post("/analytics", (req, res) => {
    const { password, name } = req.body;

    if (!password || password !== ANALYTICS_PASSWORD) {
        return res.status(403).json({ error: "Invalid password" });
    }
    if (!name) {
        return res.status(400).json({ error: "Short link name is required" });
    }

    db.all(
        `SELECT referrer, COUNT(*) AS count FROM clicks WHERE link_name = ? GROUP BY referrer ORDER BY count DESC`,
        [name],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            console.log(`Analytics for ${name}:`);
            rows.forEach(row => {
                console.log(`  Referrer: ${row.referrer}, Clicks: ${row.count}`);
            });

            res.json({ analytics: rows });
        }
    );
});

process.on("SIGINT", () => {
    console.log("Closing database connection...");
    db.close(() => {
        console.log("Database connection closed.");
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`Link shortener running on port ${PORT}`);
});
