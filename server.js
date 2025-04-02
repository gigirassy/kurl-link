const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CREATE_PASSWORD = process.env.CREATE_PASSWORD || "defaultpassword";
const INSTANCE_URL = process.env.INSTANCE_URL || "http://localhost:3000"; // Default to local

// Define database path
const DB_PATH = path.join(__dirname, "data", "links.db");

// Initialize a single shared SQLite connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1); // Exit if database connection fails
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Create table once at startup
db.run(`
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL
    )
`);

app.use(express.json());
app.use(express.static("public")); // Serve index.html

// Route to inject instance URL into the page
app.get("/config.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(`window.INSTANCE_URL = "${INSTANCE_URL}";`);
});

// Route to create a short link (requires password)
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
        stmt.finalize(); // Release memory immediately after use
        if (err) {
            return res.status(409).json({ error: "Name already taken" });
        }
        res.json({ shortUrl: `/${name}` });
    });
});

// Route to redirect to the original URL
app.get("/:name", (req, res) => {
    const name = req.params.name;

    db.get("SELECT url FROM links WHERE name = ?", [name], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        if (row) {
            return res.redirect(row.url);
        }
        res.status(404).json({ error: "Short link not found" });
    });
});

// Handle graceful shutdown to avoid database lock issues
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
