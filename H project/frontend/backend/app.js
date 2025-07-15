const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Database setup
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) return console.error(err.message);
  console.log("Connected to SQLite database.");
});

function initializeDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      denomination TEXT,
      count INTEGER,
      timestamp TEXT
    )`);

    // Create default admin user (username: admin, password: 1234)
    const adminPassHash = bcrypt.hashSync("1234", 8);
    db.run(
      "INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)",
      ["admin", adminPassHash]
    );
  });
}

initializeDB();

const denominationValues = {
  "LKR1": 1,
  "LKR2": 2,
  "LKR5": 5,
  "LKR10": 10,
  "LKR20": 20,
  "LKR50": 50,
  "LKR100": 100,
  "LKR500": 500,
  "LKR1000": 1000,
  "LKR5000": 5000,
};

// Register user
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "Missing username or password" });

  const hashedPassword = bcrypt.hashSync(password, 8);

  const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
  stmt.run(username, hashedPassword, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(409).json({ success: false, message: "Username already exists" });
      }
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "User registered successfully" });
  });
  stmt.finalize();
});

// Login user
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "Missing username or password" });

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (!row) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const passwordIsValid = bcrypt.compareSync(password, row.password);
    if (!passwordIsValid)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    res.json({ success: true, message: "Login successful" });
  });
});

// Submit counts of coins/notes
app.post("/submit_counts", (req, res) => {
  const { username, counts } = req.body;
  if (!username || !counts)
    return res.status(400).json({ success: false, message: "Missing username or counts" });

  const timestamp = new Date().toISOString();

  const insertStmt = db.prepare(
    "INSERT INTO counts (username, denomination, count, timestamp) VALUES (?, ?, ?, ?)"
  );

  for (const denom in counts) {
    insertStmt.run(username, denom, counts[denom], timestamp);
  }
  insertStmt.finalize();

  // Calculate totals
  let totalValue = 0;
  let totalCount = 0;
  for (const denom in counts) {
    totalValue += (denominationValues[denom] || 0) * counts[denom];
    totalCount += counts[denom];
  }

  res.json({ success: true, message: "Counts saved", total_value: totalValue, total_count: totalCount });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:5000`);
});
