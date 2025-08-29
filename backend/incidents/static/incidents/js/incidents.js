// Felix Taylor
// 08/28/2025

const API_BASE = "/api/incidents/";
var initialLoad = true;

// Makes status more visually friendly
const STATUS_LABELS = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
};

let currentPageUrl = null;
let nextUrl = null;
let prevUrl = null;

// which status transitions to which status
const ALLOWED_TRANSITIONS = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: null, // does not transition to any status
};

function applyStatusUI(li, statusEl, newStatus) {
  statusEl.textContent = STATUS_LABELS[newStatus] || newStatus; // update status text
  statusEl.className = "status " + newStatus; // update status color
}

// Sets up the "cycle status" button, or hides where resolved
function setupStatusButton(li, item, statusEl) {
  const btn = li.querySelector(".status-select");
  if (!btn) return;

  // hide button immediately if already resolved
  if ((item.status || "").toLowerCase() === "resolved") {
    btn.style.visibility = 'hidden';
    return; // no need to set up event listener
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const current = (item.status || "").toLowerCase(); // safely cast to lowercase
    const next = ALLOWED_TRANSITIONS[current]; // get next status
    if (!next) return; // no legal transition

    // disable button while request is in-flight
    btn.disabled = true;

    try { // make patch request
      const r = await fetch(`${API_BASE}${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }), // update with next status
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert("Update failed: " + JSON.stringify(err));
        btn.disabled = false; // re-enable on failure
        return;
      }

      let serverStatus = next;
        if (r.status !== 204) {
          const data = await r.json();
          if (data && data.status) serverStatus = String(data.status).toLowerCase(); // get status returned by the server
        }

      // update local state + UI
      item.status = serverStatus;
      applyStatusUI(li, statusEl, serverStatus);

      showSuccessMessage("Incident status updated successfully!");

      if (serverStatus === "resolved") { // hide button for resolved incidents
        btn.style.visibility='hidden';
        return;
      }
      btn.disabled = false;
    } catch (err) {
      console.error("Network error updating status:", err);
      alert("Network error updating status.");
      btn.disabled = false; // re-enable on error
    }
  });
}

let successMessageTimeout = null;

function showSuccessMessage(text) {
  const el = document.getElementById("success-message");
  el.textContent = text;
  el.style.display = "block";

  // clear any existing timer so it doesn't hide too soon
  if (successMessageTimeout) {
    clearTimeout(successMessageTimeout);
  }

  // start a new timer, message disappears after 3 seconds
  successMessageTimeout = setTimeout(() => {
    el.style.display = "none";
    successMessageTimeout = null; // reset
  }, 3000);
}

// Shows loading icon and hides incidents
function showLoading() {
    const el = document.getElementById("loading");
    if (el) el.style.display = "block";
    const li = document.getElementById("list");
    if (li) li.style.display = "none";
}

// Shows incidents and hides loading icon
function hideLoading() {
    const el = document.getElementById("loading");
    if (el) el.style.display = "none";
    const li = document.getElementById("list");
    if (li) li.style.display = "block";
}

// Takes current page as a parameter
function buildApiUrl(page) {
    const p = new URLSearchParams();
    const statusEl = document.getElementById("statusFilter"); // check if user is filtering by status
    const pageSizeEl = document.getElementById("pageSizeInput"); // check if user has changed page size

    const status = statusEl ? statusEl.value.trim() : "";
    const pageSize = pageSizeEl ? pageSizeEl.value.trim() : "";

    // add queries to url
    if (status) p.set("status", status);
    if (page) p.set("page", page);
    if (pageSize) p.set("page_size", pageSize);

    const q = p.toString();
    // return url plus queries (if applicable)
    return q ? `${API_BASE}?${q}` : API_BASE;
}

function renderList(results) { // takes API results as a parameter
    const ul = document.getElementById("list");
    ul.innerHTML = ""; // make sure list is empty
    const tmpl = document.getElementById("row");

    results.forEach((item) => {
        const li = tmpl.content.firstElementChild.cloneNode(true); // clones the template list item
        li.dataset.id = item.id;

        // set title and location
        li.querySelector(".title").textContent = item.title;
        li.querySelector(".location").textContent = item.location;

        const statusEl = li.querySelector(".status"); // assigns li's status element to a pointer
        statusEl.textContent = STATUS_LABELS[item.status] || item.status; // makes status human-readable
        statusEl.className = "status " + item.status; // changes status class for css purposes

        // converts item's creation date to something more readable
        const createdEl = li.querySelector(".created");
        if (item.created_at) {
            const dt = new Date(item.created_at);
            createdEl.textContent = dt.toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        }

        setupStatusButton(li, item, statusEl);

        // Delete button handler
        const delBtn = li.querySelector(".delete");
        if (delBtn) {
            delBtn.addEventListener("click", async () => {
                const ok = confirm("Delete this incident?"); // make sure user wants to delete
                if (!ok) return;
                try { // make API call to delete
                    const r = await fetch(`${API_BASE}${item.id}/`, {
                        method: "DELETE"
                    });
                    if (r.ok || r.status === 204) {
                        li.remove();
                        loadByUrl(currentPageUrl || buildApiUrl(1)); // refresh list
                    } else {
                        const err = await r.json().catch(() => ({
                            detail: "Delete failed"
                        }));
                        alert("Delete failed: " + JSON.stringify(err));
                    }
                } finally {
                    showSuccessMessage("Incident deleted successfully!");
                }
            });
        }
        ul.appendChild(li); // add incident to list
    });
}

async function loadByUrl(url) {
    if (initialLoad) showLoading(); // show spinner
    currentPageUrl = url;
    try {
        const r = await fetch(url);
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            alert("Load failed: " + JSON.stringify(err));
            return;
        }
        const data = await r.json();

        // check if data has any entries
        const showingCount = Array.isArray(data) ?
            data.length :
            data.results ?
            data.results.length :
            0;
        // either data has an explicit count set, or just use the array length
        const totalCount = data.count ?? showingCount;

        const pageParam = new URL(url, window.location.origin).searchParams.get("page");
        const currentPage = pageParam ? parseInt(pageParam, 10) : 1; // parse the current page, else 1

        // displays the current page number and how many items are shown out of how many there are total
        const countEl = document.getElementById("countLabel");
        if (countEl) {
            countEl.textContent = `Page ${currentPage} — Showing ${showingCount} of ${totalCount} total incidents.`;
        }

        if (Array.isArray(data)) {
            renderList(data); // if data is an array, just show the array
            nextUrl = prevUrl = null; // no need for other pages
        } else {
            renderList(data.results || []); // show current results, or else nothing
            nextUrl = data.next; // set next page
            prevUrl = data.previous; // set previous page
        }

        document.getElementById("nextBtn").disabled = !nextUrl; // set to disabled if there is no next page
        document.getElementById("prevBtn").disabled = !prevUrl; // set to disabled if there is no previous page

        // make url display queries
        const pageUrl = new URL(window.location);
        const status = (document.getElementById("statusFilter")?.value || "").trim();
        const pageSize = (document.getElementById("pageSizeInput")?.value || "").trim();

        if (status) pageUrl.searchParams.set("status", status);
        else pageUrl.searchParams.delete("status");

        if (pageSize) pageUrl.searchParams.set("page_size", pageSize);
        else pageUrl.searchParams.delete("page_size");

        window.history.replaceState({}, "", pageUrl); // set new url
    } finally {
        if (initialLoad) {
            hideLoading();
            initialLoad = false;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    // check if any filters are in place
    document.getElementById("statusFilter").value = params.get("status") || "";
    const ps = params.get("page_size");
    if (ps) document.getElementById("pageSizeInput").value = ps;

    loadByUrl(buildApiUrl(1)); // initially on page 1

    // just refresh page if status filter is set
    document.getElementById("applyFilter").addEventListener("click", (e) => {
        e.preventDefault();
        loadByUrl(buildApiUrl(1));
    });

    document.getElementById("nextBtn").addEventListener("click", (e) => {
        e.preventDefault();
        if (nextUrl) loadByUrl(nextUrl);
    });

    document.getElementById("prevBtn").addEventListener("click", (e) => {
        e.preventDefault();
        if (prevUrl) loadByUrl(prevUrl);
    });

    document.getElementById("pageSizeInput").addEventListener("change", () => {
        loadByUrl(buildApiUrl(1));
    });

    document.getElementById("create").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const r = await fetch(API_BASE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data),
            });
            if (r.ok) {
                e.target.reset();
                loadByUrl(buildApiUrl(1));
            } else {
                const err = await r.json().catch(() => ({}));
                alert("Create failed: " + JSON.stringify(err));
            }
        } finally {
            showSuccessMessage("Incident created successfully!");
        }
    });
});