// database.js
// Uses a plain JSON file (data/websites.json) as the database.
// No native compilation needed — works on any machine instantly!

const fs   = require("fs");
const path = require("path");

// ─── File path setup ──────────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "websites.json");

// Create the /data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Read / Write helpers ─────────────────────────────────────────────────────

/** Read all data from the JSON file */
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    // First run — seed with sample data
    const seed = {
      nextId: 6,
      websites: [
        { id: 1, name: "GitHub",        url: "https://github.com",             date_added: "2024-01-10", notes: "Code hosting platform" },
        { id: 2, name: "MDN Web Docs",  url: "https://developer.mozilla.org",  date_added: "2024-02-14", notes: "Best web reference docs" },
        { id: 3, name: "Stack Overflow",url: "https://stackoverflow.com",      date_added: "2024-03-05", notes: "Q&A for developers" },
        { id: 4, name: "Hacker News",   url: "https://news.ycombinator.com",   date_added: "2024-04-20", notes: "Tech news aggregator" },
        { id: 5, name: "Excalidraw",    url: "https://excalidraw.com",         date_added: "2024-05-01", notes: "Whiteboard / diagrams tool" },
      ]
    };
    writeData(seed);
    console.log("✅ Sample data created in data/websites.json");
    return seed;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

/** Write all data back to the JSON file */
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Exported query functions ─────────────────────────────────────────────────

/**
 * Get all websites, with optional date filtering and sorting.
 */
function getAllWebsites(startDate = null, endDate = null, sortOrder = "desc") {
  const data = readData();
  let list = [...data.websites];

  // Date filtering
  if (startDate) {
    list = list.filter(w => w.date_added >= startDate);
  }
  if (endDate) {
    list = list.filter(w => w.date_added <= endDate);
  }

  // Sorting by date_added
  list.sort((a, b) => {
    if (a.date_added < b.date_added) return sortOrder === "asc" ? -1 :  1;
    if (a.date_added > b.date_added) return sortOrder === "asc" ?  1 : -1;
    // If same date, sort by id
    return sortOrder === "asc" ? a.id - b.id : b.id - a.id;
  });

  return list;
}

/**
 * Get a single website by ID.
 */
function getWebsiteById(id) {
  const data = readData();
  return data.websites.find(w => w.id === id) || null;
}

/**
 * Insert a new website.
 */
function createWebsite({ name, url, date_added, notes = "" }) {
  const data = readData();

  const newWebsite = {
    id: data.nextId,
    name,
    url,
    date_added,
    notes,
  };

  data.websites.push(newWebsite);
  data.nextId += 1;
  writeData(data);

  return newWebsite;
}

/**
 * Update an existing website by ID.
 */
function updateWebsite(id, { name, url, date_added, notes = "" }) {
  const data = readData();
  const index = data.websites.findIndex(w => w.id === id);

  if (index === -1) return null; // not found

  data.websites[index] = { id, name, url, date_added, notes };
  writeData(data);

  return data.websites[index];
}

/**
 * Delete a website by ID.
 * Returns true if deleted, false if not found.
 */
function deleteWebsite(id) {
  const data = readData();
  const index = data.websites.findIndex(w => w.id === id);

  if (index === -1) return false;

  data.websites.splice(index, 1);
  writeData(data);

  return true;
}

module.exports = {
  getAllWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  deleteWebsite,
};