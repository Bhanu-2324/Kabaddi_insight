const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: "127.0.0.1",   // or "localhost"
  user: "root",        // your MySQL username
  password: "Bhanu@2324", // your MySQL password
  database: "login",  // your database name
  port: "3306"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  else{
    console.log("Connected to MySQL database");
  }
});

  // Create users table if not exists
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `;

  db.query(createUsersTable, (err, result) => {
    if (err) {
      console.error("Error creating users table:", err);
    } else {
      console.log("Users table is ready");
    }
  });


// ---------------- SIGNUP ----------------
app.post("/Register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (result.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Error inserting user" });

        res.status(201).json({ message: "User registered successfully" });
      }
    );
  });
});

// ---------------- LOGIN ----------------
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (result.length === 0) return res.status(401).json({ message: "User not found" });

    const user = result[0];

    if (password!==user.password){
       return res.status(401).json({ message: "Invalid password" });
    }


    res.json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});

// Start server
app.listen(5500, () => {
  console.log("Server running on http://localhost:5500");
});
