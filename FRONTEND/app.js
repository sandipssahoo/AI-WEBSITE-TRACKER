// app.js
// Website Tracker — Frontend JavaScript
// Handles all UI interactions and API communication

// ─── Config ──────────────────────────────────────────────────────────────────

// Change this if your backend runs on a different port / domain
const API_BASE = "https://ai-website-tracker.onrender.com/api";

// ─── State ───────────────────────────────────────────────────────────────────
let sortOrder    = "desc";   // "asc" | "desc"
let allWebsites  = [];       // full list returned by last API call

// ─── Utility: Get today's date as "YYYY-MM-DD" ───────────────────────────────
function todayISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ─── Utility: Format "YYYY-MM-DD" → "12 Jan 2024" ───────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ─── Utility: Extract hostname for favicon ───────────────────────────────────
function faviconURL(url) {
  try {
    const parsed = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
  } catch {
    return null;
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────
let toastTimer;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// ─── Show / hide loading & states ────────────────────────────────────────────
function showLoading(show) {
  document.getElementById("loadingState").classList.toggle("hidden", !show);
}

function showError(show) {
  document.getElementById("errorState").classList.toggle("hidden", !show);
}

function showEmpty(show) {
  document.getElementById("emptyState").classList.toggle("hidden", !show);
}

// ─── API helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch websites from the backend.
 * @param {string|null} startDate
 * @param {string|null} endDate
 * @param {string}      sort
 */
async function fetchWebsites(startDate = null, endDate = null, sort = "desc") {
  showLoading(true);
  showError(false);
  showEmpty(false);
  document.getElementById("websitesList").innerHTML = "";

  const params = new URLSearchParams({ sort });
  if (startDate) params.append("startDate", startDate);
  if (endDate)   params.append("endDate",   endDate);

  try {
    const res  = await fetch(`${API_BASE}/websites?${params}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const json = await res.json();

    allWebsites = json.data;
    renderWebsites(allWebsites);

    // Update stats
    // We need the TOTAL count separately (unfiltered) for display
    document.getElementById("filteredCount").textContent = allWebsites.length;
    return allWebsites;
  } catch (err) {
    console.error("fetchWebsites:", err);
    showError(true);
    return [];
  } finally {
    showLoading(false);
  }
}

async function apiAddWebsite(data) {
  const res = await fetch(`${API_BASE}/websites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add website");
  }
  return res.json();
}

async function apiUpdateWebsite(id, data) {
  const res = await fetch(`${API_BASE}/websites/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update website");
  }
  return res.json();
}

async function apiDeleteWebsite(id) {
  const res = await fetch(`${API_BASE}/websites/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delete website");
  }
  return res.json();
}

// ─── Render the websites list ─────────────────────────────────────────────────
function renderWebsites(list) {
  const container = document.getElementById("websitesList");
  container.innerHTML = "";

  if (list.length === 0) {
    showEmpty(true);
    return;
  }

  showEmpty(false);

  list.forEach(site => {
    const card = document.createElement("div");
    card.className = "website-card";
    card.dataset.id = site.id;

    const fav = faviconURL(site.url);
    const iconHTML = fav
      ? `<img src="${fav}" alt="" onerror="this.parentElement.innerHTML='<i class=\\'ph ph-globe\\'></i>'" />`
      : `<i class="ph ph-globe"></i>`;

    card.innerHTML = `
      <div class="card-icon">${iconHTML}</div>
      <div class="card-body">
        <div class="card-name" title="${escapeHtml(site.name)}">${escapeHtml(site.name)}</div>
        <a class="card-url" href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer"
           title="${escapeHtml(site.url)}">${escapeHtml(site.url)}</a>
        <div class="card-meta">
          <span class="card-date">
            <i class="ph ph-calendar-blank"></i>
            ${formatDate(site.date_added)}
          </span>
          ${site.notes ? `<span class="card-notes" title="${escapeHtml(site.notes)}">— ${escapeHtml(site.notes)}</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="icon-btn edit" title="Edit" data-id="${site.id}">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="icon-btn delete" title="Delete" data-id="${site.id}" data-name="${escapeHtml(site.name)}">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach edit / delete handlers
  container.querySelectorAll(".icon-btn.edit").forEach(btn => {
    btn.addEventListener("click", () => openEditModal(Number(btn.dataset.id)));
  });
  container.querySelectorAll(".icon-btn.delete").forEach(btn => {
    btn.addEventListener("click", () => openDeleteModal(Number(btn.dataset.id), btn.dataset.name));
  });
}

// ─── Simple XSS escaping ─────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ─── Form validation helpers ──────────────────────────────────────────────────
function setFieldError(inputEl, errorEl, message) {
  inputEl.classList.add("input--error");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearFieldError(inputEl, errorEl) {
  inputEl.classList.remove("input--error");
  errorEl.classList.add("hidden");
}

function validateForm(nameInput, urlInput, nameError, urlError) {
  let valid = true;
  clearFieldError(nameInput, nameError);
  clearFieldError(urlInput, urlError);

  if (!nameInput.value.trim()) {
    setFieldError(nameInput, nameError, "Website name is required.");
    valid = false;
  }

  if (!urlInput.value.trim()) {
    setFieldError(urlInput, urlError, "URL is required.");
    valid = false;
  } else {
    try { new URL(urlInput.value.trim()); }
    catch {
      setFieldError(urlInput, urlError, "Enter a valid URL (include https://).");
      valid = false;
    }
  }

  return valid;
}

// ─── Load total count (unfiltered) ───────────────────────────────────────────
async function refreshTotalCount() {
  try {
    const res  = await fetch(`${API_BASE}/websites`);
    const json = await res.json();
    document.getElementById("totalCount").textContent = json.total;
  } catch { /* ignore */ }
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// Close on overlay click
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });
});

// ─── ADD Modal ────────────────────────────────────────────────────────────────
document.getElementById("openAddModal").addEventListener("click", () => {
  // Reset form
  document.getElementById("addForm").reset();
  clearFieldError(document.getElementById("addName"), document.getElementById("addNameError"));
  clearFieldError(document.getElementById("addUrl"),  document.getElementById("addUrlError"));

  // Auto-set today's date
  document.getElementById("addDate").value = todayISO();
  openModal("addModal");
  document.getElementById("addName").focus();
});

document.getElementById("closeAddModal").addEventListener("click", () => closeModal("addModal"));
document.getElementById("cancelAdd").addEventListener("click",      () => closeModal("addModal"));

document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nameInput  = document.getElementById("addName");
  const urlInput   = document.getElementById("addUrl");
  const nameError  = document.getElementById("addNameError");
  const urlError   = document.getElementById("addUrlError");

  if (!validateForm(nameInput, urlInput, nameError, urlError)) return;

  const submitBtn = document.getElementById("addSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    await apiAddWebsite({
      name:       nameInput.value.trim(),
      url:        document.getElementById("addUrl").value.trim(),
      date_added: document.getElementById("addDate").value,
      notes:      document.getElementById("addNotes").value.trim(),
    });

    closeModal("addModal");
    showToast("✅ Website added!", "success");
    await loadPage();
  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ph ph-check"></i> Save';
  }
});

// ─── EDIT Modal ───────────────────────────────────────────────────────────────
async function openEditModal(id) {
  // Find the entry from local state (avoids an extra network call)
  const site = allWebsites.find(s => s.id === id);
  if (!site) return showToast("Entry not found.", "error");

  clearFieldError(document.getElementById("editName"), document.getElementById("editNameError"));
  clearFieldError(document.getElementById("editUrl"),  document.getElementById("editUrlError"));

  document.getElementById("editId").value    = site.id;
  document.getElementById("editName").value  = site.name;
  document.getElementById("editUrl").value   = site.url;
  document.getElementById("editDate").value  = site.date_added;
  document.getElementById("editNotes").value = site.notes || "";

  openModal("editModal");
  document.getElementById("editName").focus();
}

document.getElementById("closeEditModal").addEventListener("click", () => closeModal("editModal"));
document.getElementById("cancelEdit").addEventListener("click",      () => closeModal("editModal"));

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nameInput  = document.getElementById("editName");
  const urlInput   = document.getElementById("editUrl");
  const nameError  = document.getElementById("editNameError");
  const urlError   = document.getElementById("editUrlError");

  if (!validateForm(nameInput, urlInput, nameError, urlError)) return;

  const id = Number(document.getElementById("editId").value);
  const submitBtn = document.getElementById("editSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    await apiUpdateWebsite(id, {
      name:       document.getElementById("editName").value.trim(),
      url:        document.getElementById("editUrl").value.trim(),
      date_added: document.getElementById("editDate").value,
      notes:      document.getElementById("editNotes").value.trim(),
    });

    closeModal("editModal");
    showToast("✏️ Website updated!", "success");
    await loadPage();
  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ph ph-check"></i> Update';
  }
});

// ─── DELETE Modal ─────────────────────────────────────────────────────────────
let pendingDeleteId = null;

function openDeleteModal(id, name) {
  pendingDeleteId = id;
  document.getElementById("deleteWebsiteName").textContent = name;
  openModal("deleteModal");
}

document.getElementById("closeDeleteModal").addEventListener("click", () => closeModal("deleteModal"));
document.getElementById("cancelDelete").addEventListener("click",      () => closeModal("deleteModal"));

document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById("confirmDelete");
  btn.disabled = true;
  btn.textContent = "Deleting…";

  try {
    await apiDeleteWebsite(pendingDeleteId);
    closeModal("deleteModal");
    showToast("🗑️ Website deleted.", "success");
    await loadPage();
  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    pendingDeleteId = null;
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-trash"></i> Delete';
  }
});

// ─── Sort buttons ─────────────────────────────────────────────────────────────
document.getElementById("sortDesc").addEventListener("click", () => {
  sortOrder = "desc";
  document.getElementById("sortDesc").classList.add("active");
  document.getElementById("sortAsc").classList.remove("active");
  loadPage();
});

document.getElementById("sortAsc").addEventListener("click", () => {
  sortOrder = "asc";
  document.getElementById("sortAsc").classList.add("active");
  document.getElementById("sortDesc").classList.remove("active");
  loadPage();
});

// ─── Filter ───────────────────────────────────────────────────────────────────
document.getElementById("applyFilter").addEventListener("click", () => {
  const start = document.getElementById("filterStart").value;
  const end   = document.getElementById("filterEnd").value;
  fetchWebsites(start || null, end || null, sortOrder);
});

document.getElementById("clearFilter").addEventListener("click", () => {
  document.getElementById("filterStart").value = "";
  document.getElementById("filterEnd").value   = "";
  fetchWebsites(null, null, sortOrder);
});

// Allow pressing Enter inside filter fields to trigger apply
["filterStart", "filterEnd"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("applyFilter").click();
  });
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  // Escape closes any open modal
  if (e.key === "Escape") {
    ["addModal", "editModal", "deleteModal"].forEach(id =>
      document.getElementById(id).classList.add("hidden")
    );
  }
  // Ctrl+N / Cmd+N opens add modal (doesn't override browser new tab in most cases)
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    document.getElementById("openAddModal").click();
  }
});

// ─── Main load function ───────────────────────────────────────────────────────
async function loadPage() {
  const start = document.getElementById("filterStart").value;
  const end   = document.getElementById("filterEnd").value;
  const list  = await fetchWebsites(start || null, end || null, sortOrder);

  // Always refresh total (unfiltered) count
  await refreshTotalCount();

  return list;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadPage();
})();