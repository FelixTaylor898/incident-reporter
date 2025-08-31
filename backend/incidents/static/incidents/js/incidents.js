// Felix Taylor
// 08/28/2025

// base path for the incidents api used by all requests on this page
const API_BASE = "/api/incidents/";

// tracks if we are doing the very first load of the page
// used to show and then hide the spinner exactly once
var initialLoad = true;

// makes status more visually friendly
const STATUS_LABELS = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
};

let currentPageUrl = null;
let nextUrl = null;
let prevUrl = null;

const ALLOWED_TRANSITIONS = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: null, // does not transition to any status
};

// updates the status text and class on one list item
// this only affects the dom; it does not call the server
function applyStatusUI(statusElement, newStatus) {
  statusElement.textContent = STATUS_LABELS[newStatus] || newStatus; // update status text
  statusElement.className = "status " + newStatus; // update status color
}

// sets up the "cycle status" button on one row, or hides it if already resolved
// this wires up the click, sends the patch, and updates the row on success
function setupStatusButton(li, item, statusElement) {
  const button = li.querySelector(".status-select");
  if (!button) return;

  // hide button immediately if already resolved
  // this keeps the ui aligned with backend rules
  if ((item.status || "").toLowerCase() === "resolved") {
    button.style.visibility = 'hidden';
    return; // no need to set up event listener
  }

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    const current = (item.status || "").toLowerCase(); // safely cast to lowercase
    const next = ALLOWED_TRANSITIONS[current]; // get next status
    if (!next) return; // no transition

    // disable button while request is in-flight
    button.disabled = true;

    try { // make patch request
      const response = await fetch(`${API_BASE}${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }), // update with next status
      });

      // if the server rejects the change, show the reason and re-enable the button
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert("Update failed: " + JSON.stringify(err));
        button.disabled = false; // re-enable on failure
        return;
      }

      let serverStatus = next;
      if (response.status !== 204) {
        const data = await response.json();
        if (data && data.status) serverStatus = String(data.status).toLowerCase(); // get status returned by the server
      }

      // update local state + ui so the row reflects the new status
      item.status = serverStatus;
      applyStatusUI(statusElement, serverStatus);

      // small friendly message on success
      showSuccessMessage("Incident status updated successfully!");

      // once resolved, hide the button so it cannot be pressed again
      if (serverStatus === "resolved") {
        button.style.visibility='hidden';
        return;
      }

      // if not resolved, allow more cycles later
      button.disabled = false;
    } catch (err) {
      // covers network errors like being offline or server not reachable
      console.error("Network error updating status:", err);
      alert("Network error updating status.");
      button.disabled = false; // re-enable on error
    }
  });
}

// holds the timeout id for the success message hide timer
let successMessageTimeout = null;

// shows a small success message for a few seconds and then hides it
// calling this again resets the timer so the message stays long enough
function showSuccessMessage(text) {
  const element = document.getElementById("success-message");
  element.textContent = text;
  element.style.display = "block";

  // clear any existing timer so it doesn't hide too soon
  if (successMessageTimeout) {
    clearTimeout(successMessageTimeout);
  }

  // start a new timer, message disappears after 3 seconds
  successMessageTimeout = setTimeout(() => {
    element.style.display = "none";
    successMessageTimeout = null; // reset
  }, 3000);
}

// shows loading icon and hides incidents
// used only on the first load so we do not flicker on every page change
function showLoading() {
    const element = document.getElementById("loading");
    if (element) element.style.display = "block";
    const list = document.getElementById("list");
    if (list) list.style.display = "none";
}

// shows incidents and hides loading icon
// paired with showLoading to restore the list
function hideLoading() {
    const element = document.getElementById("loading");
    if (element) element.style.display = "none";
    const list = document.getElementById("list");
    if (list) list.style.display = "block";
}

// builds the api url for a given page, including selected filters and page size
// reads current form values directly from the dom so we do not track them elsewhere
function buildApiUrl(page) {
    const params = new URLSearchParams();
    const statusElement = document.getElementById("statusFilter"); // check if user is filtering by status
    const pageSizeElement = document.getElementById("pageSizeInput"); // check if user has changed page size

    const status = statusElement ? statusElement.value.trim() : "";
    const pageSize = pageSizeElement ? pageSizeElement.value.trim() : "";

    // add queries to url
    if (status) params.set("status", status);
    if (page) params.set("page", page);
    if (pageSize) params.set("page_size", pageSize);

    const queries = params.toString();
    // return url plus queries (if applicable)
    return queries ? `${API_BASE}?${queries}` : API_BASE;
}

// renders one page of results into the list element
// this clears the list, fills rows from a template, and wires up row actions
function renderList(results) { // takes api results as a parameter
    const ul = document.getElementById("list");
    ul.innerHTML = ""; // make sure list is empty
    const template = document.getElementById("row");

    results.forEach((item) => {
        const li = template.content.firstElementChild.cloneNode(true); // clones the template list item
        li.dataset.id = item.id;

        // set title and location
        li.querySelector(".title").textContent = item.title;
        li.querySelector(".location").textContent = item.location;

        // set status badge text and css class for color
        const statusElement = li.querySelector(".status"); // assigns li's status element to a pointer
        statusElement.textContent = STATUS_LABELS[item.status] || item.status; // makes status human-readable
        statusElement.className = "status " + item.status; // changes status class for css purposes

        // converts item's creation date to something more readable
        // guard in case the api does not send the field
        const createdElement = li.querySelector(".created");
        if (item.created_at) {
            const date = new Date(item.created_at);
            createdElement.textContent = date.toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        }

        // add the cycle status behavior to the row
        setupStatusButton(li, item, statusElement);

        // delete button handler
        // shows a simple confirm, calls delete, removes the row, then refreshes the page list
        const deleteButton = li.querySelector(".delete");
        if (deleteButton) {
            deleteButton.addEventListener("click", async () => {
                const ok = confirm("Delete this incident?"); // make sure user wants to delete
                if (!ok) return;
                    const response = await fetch(`${API_BASE}${item.id}/`, {
                        method: "DELETE"
                    });
                    if (response.ok || response.status === 204) {
                        li.remove();
                        loadByUrl(currentPageUrl || buildApiUrl(1)); // refresh list
                        showSuccessMessage("Incident deleted successfully!");
                    } else {
                        const err = await response.json().catch(() => ({
                            detail: "Delete failed"
                        }));
                        alert("Delete failed: " + JSON.stringify(err));
                    }
                    // show a small success message every time the delete finishes
                    showSuccessMessage("Incident deleted successfully!");
                
            });
        }

        // add incident to list at the end
        ul.appendChild(li);
    });
}

// loads data from the given url and updates the page ui
// handles both array and paginated shapes from the api
async function loadByUrl(url) {
    if (initialLoad) showLoading(); // show spinner
    currentPageUrl = url;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // try to show a specific error body, fall back to empty object
            const err = await response.json().catch(() => ({}));
            alert("Load failed: " + JSON.stringify(err));
            return;
        }
        const data = await response.json();

        // compute how many items we are showing right now
        // paginated responses store rows in data.results
        const showingCount = Array.isArray(data) ?
            data.length :
            data.results ?
            data.results.length :
            0;

        // total count comes from the server when paginated; else use what we have
        const totalCount = data.count ?? showingCount;

        // get the current page from the url we just loaded; default to 1
        const pageParam = new URL(url, window.location.origin).searchParams.get("page");
        const currentPage = pageParam ? parseInt(pageParam, 10) : 1; // parse the current page, else 1

        // displays the current page number and how many items are shown out of how many there are total
        const countEl = document.getElementById("countLabel");
        if (countEl) {
            countEl.textContent = `Page ${currentPage} — Showing ${showingCount} of ${totalCount} total incidents.`;
        }

        // render the list and set paging links based on the response shape
        if (Array.isArray(data)) {
            renderList(data); // if data is an array, just show the array
            nextUrl = prevUrl = null; // no need for other pages
        } else {
            renderList(data.results || []); // show current results, or else nothing
            nextUrl = data.next; // set next page
            prevUrl = data.previous; // set previous page
        }

        // enable or disable pager buttons based on whether next/prev exist
        document.getElementById("nextBtn").disabled = !nextUrl; // set to disabled if there is no next page
        document.getElementById("prevBtn").disabled = !prevUrl; // set to disabled if there is no previous page

        // update the browser url to reflect the current filters
        const pageUrl = new URL(window.location);
        const status = (document.getElementById("statusFilter")?.value || "").trim();
        const pageSize = (document.getElementById("pageSizeInput")?.value || "").trim();

        if (status) pageUrl.searchParams.set("status", status);
        else pageUrl.searchParams.delete("status");

        if (pageSize) pageUrl.searchParams.set("page_size", pageSize);
        else pageUrl.searchParams.delete("page_size");

        window.history.replaceState({}, "", pageUrl); // set new url
    } finally {
        // hide spinner after the first load finishes
        if (initialLoad) {
            hideLoading();
            initialLoad = false;
        }
    }
}

// wire up page events after the dom is ready
// this reads any query params, applies them to controls, and loads page 1
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);

    // check if any filters are in place from the url and apply them to inputs
    document.getElementById("statusFilter").value = params.get("status") || "";
    const pageSize = params.get("page_size");
    if (pageSize) document.getElementById("pageSizeInput").value = pageSize;

    loadByUrl(buildApiUrl(1)); // initially on page 1

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

    // on success we reset the form and reload page 1 so the list shows the new row
    document.getElementById("create").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const response = await fetch(API_BASE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                e.target.reset();
                loadByUrl(buildApiUrl(1));
                showSuccessMessage("Incident created successfully!");
            } else {
                const err = await response.json().catch(() => ({}));
                alert("Create failed: " + JSON.stringify(err));
            }
    });
});
