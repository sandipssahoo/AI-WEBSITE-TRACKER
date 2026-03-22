// server.js
// Main Express server for Website Tracker API
// Runs on http://localhost:5000 by default

require("dotenv").config(); // Load environment variables from .env

const express = require("express");
const cors    = require("cors");
const db      = require("./database");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// Allow requests from any origin (needed for frontend <-> backend communication)
// In production, replace "*" with your actual frontend domain
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Simple request logger for development
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.path}`);
  next();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

// Validate that a string looks like "YYYY-MM-DD"
function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check — useful for deployment platforms
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Website Tracker API is running 🚀" });
});

// ── GET /api/websites ─────────────────────────────────────────────────────────
// Returns all websites. Supports optional query params:
//   ?startDate=YYYY-MM-DD
//   ?endDate=YYYY-MM-DD
//   ?sort=asc|desc  (default: desc)
app.get("/api/websites", (req, res) => {
  try {
    const { startDate, endDate, sort = "desc" } = req.query;

    // Validate dates if provided
    if (startDate && !isValidDate(startDate)) {
      return res.status(400).json({ error: "Invalid startDate format. Use YYYY-MM-DD." });
    }
    if (endDate && !isValidDate(endDate)) {
      return res.status(400).json({ error: "Invalid endDate format. Use YYYY-MM-DD." });
    }
    if (!["asc", "desc"].includes(sort)) {
      return res.status(400).json({ error: "sort must be 'asc' or 'desc'." });
    }

    const websites = db.getAllWebsites(startDate || null, endDate || null, sort);
    res.json({ data: websites, total: websites.length });
  } catch (err) {
    console.error("GET /api/websites error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/websites/:id ─────────────────────────────────────────────────────
app.get("/api/websites/:id", (req, res) => {
  try {
    const website = db.getWebsiteById(Number(req.params.id));
    if (!website) return res.status(404).json({ error: "Website not found." });
    res.json({ data: website });
  } catch (err) {
    console.error("GET /api/websites/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/websites ────────────────────────────────────────────────────────
// Creates a new website entry
// Body: { name, url, date_added, notes? }
app.post("/api/websites", (req, res) => {
  try {
    const { name, url, date_added, notes = "" } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "name is required." });
    }
    if (!url || typeof url !== "string" || url.trim() === "") {
      return res.status(400).json({ error: "url is required." });
    }
    if (!date_added || !isValidDate(date_added)) {
      return res.status(400).json({ error: "date_added is required (format: YYYY-MM-DD)." });
    }

    const newWebsite = db.createWebsite({
      name: name.trim(),
      url: url.trim(),
      date_added,
      notes: notes.trim(),
    });

    res.status(201).json({ data: newWebsite, message: "Website added successfully." });
  } catch (err) {
    console.error("POST /api/websites error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── PUT /api/websites/:id ─────────────────────────────────────────────────────
// Updates an existing website entry
// Body: { name, url, date_added, notes? }
app.put("/api/websites/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, url, date_added, notes = "" } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "name is required." });
    }
    if (!url || typeof url !== "string" || url.trim() === "") {
      return res.status(400).json({ error: "url is required." });
    }
    if (!date_added || !isValidDate(date_added)) {
      return res.status(400).json({ error: "date_added is required (format: YYYY-MM-DD)." });
    }

    const updated = db.updateWebsite(id, {
      name: name.trim(),
      url: url.trim(),
      date_added,
      notes: notes.trim(),
    });

    if (!updated) return res.status(404).json({ error: "Website not found." });

    res.json({ data: updated, message: "Website updated successfully." });
  } catch (err) {
    console.error("PUT /api/websites/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── DELETE /api/websites/:id ──────────────────────────────────────────────────
app.delete("/api/websites/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = db.deleteWebsite(id);

    if (!deleted) return res.status(404).json({ error: "Website not found." });

    res.json({ message: "Website deleted successfully." });
  } catch (err) {
    console.error("DELETE /api/websites/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Website Tracker API running at http://localhost:${PORT}`);
  console.log(`📄  GET  http://localhost:${PORT}/api/websites`);
  console.log(`🩺  Health: http://localhost:${PORT}/\n`);
});