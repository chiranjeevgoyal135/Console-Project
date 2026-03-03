// ============================================================
//  api/api.js  —  All Backend API Calls Live Here
//
//  Interview explanation:
//    - Centralising API calls means if the backend URL changes,
//      we only update ONE file, not every component
//    - Each function returns the parsed JSON response
//    - We use the native browser `fetch` API (no extra library needed)
// ============================================================

// Base URL of our Express backend
const BASE_URL = "http://localhost:5000/api";

// ── Auth ──────────────────────────────────────────────────
// Sends login credentials to backend, returns user object on success
export async function loginUser(email, password, role) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  return response.json();
}

// ── Suggestions ───────────────────────────────────────────
// Sends search query, gets AI product suggestions back
export async function getSuggestions(query) {
  const response = await fetch(
    `${BASE_URL}/suggestions?query=${encodeURIComponent(query)}`
  );
  return response.json();
}

// ── Inventory ─────────────────────────────────────────────
// Fetches the full inventory list for seller dashboard
export async function getInventory() {
  const response = await fetch(`${BASE_URL}/inventory`);
  return response.json();
}

// Updates stock for a product using its barcode
export async function updateStock(barcode, quantity, action) {
  const response = await fetch(`${BASE_URL}/inventory/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ barcode, quantity, action }),
  });
  return response.json();
}
