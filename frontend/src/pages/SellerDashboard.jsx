// ============================================================
//  pages/SellerDashboard.jsx  —  Seller View
//
//  Interview explanation:
//    - On mount (useEffect with empty []), we fetch inventory from backend
//    - Barcode update calls updateStock() → POST to backend
//    - After successful update, we re-fetch inventory to stay in sync
// ============================================================

import { useState, useEffect } from "react";
import { getInventory, updateStock } from "../api/api.js";

export default function SellerDashboard({ user, onLogout }) {
  const [inventory,   setInventory]   = useState([]);
  const [barcode,     setBarcode]     = useState("");
  const [qty,         setQty]         = useState("");
  const [barcodeMsg,  setBarcodeMsg]  = useState(null);
  const [loadingInv,  setLoadingInv]  = useState(true);

  // Fetch inventory when component first loads
  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoadingInv(true);
    try {
      const data = await getInventory();
      if (data.success) setInventory(data.inventory);
    } catch {
      console.error("Could not fetch inventory");
    } finally {
      setLoadingInv(false);
    }
  }

  async function handleBarcodeUpdate(action) {
    setBarcodeMsg(null);
    if (!barcode.trim() || !qty) {
      setBarcodeMsg({ type: "error", text: "❌ Enter both barcode and quantity." });
      return;
    }
    try {
      const data = await updateStock(barcode.trim(), parseInt(qty), action);
      if (!data.success) {
        setBarcodeMsg({ type: "error", text: `❌ ${data.message}` });
      } else {
        setBarcodeMsg({ type: "success", text: `✅ ${data.message}` });
        setBarcode("");
        setQty("");
        fetchInventory();   // refresh the table after update
      }
    } catch {
      setBarcodeMsg({ type: "error", text: "❌ Server error. Is backend running?" });
    }
  }

  // Derived stats from inventory array
  const totalProducts = inventory.length;
  const totalStock    = inventory.reduce((s, i) => s + i.stock, 0);
  const lowStock      = inventory.filter((i) => i.stock > 0 && i.stock < 10).length;
  const outOfStock    = inventory.filter((i) => i.stock === 0).length;

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.hLeft}>
          <span style={s.logo}>⚡ SmarterBlinkit</span>
          <span style={s.roleBadge}>Seller Panel</span>
        </div>
        <div style={s.hRight}>
          <span style={s.uname}>🏪 {user.name}</span>
          <button style={s.logout} onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Stat Cards ── */}
        <div style={s.statsRow}>
          {[
            { label: "Total Products", value: totalProducts, icon: "📦", color: "#4f9cf9" },
            { label: "Total Stock",    value: totalStock,    icon: "📊", color: "#5bc47a" },
            { label: "Low Stock",      value: lowStock,      icon: "⚠️", color: "#f6a623" },
            { label: "Out of Stock",   value: outOfStock,    icon: "🚫", color: "#f05252" },
          ].map((stat) => (
            <div key={stat.label} style={{ ...s.statCard, borderTop: `3px solid ${stat.color}` }}>
              <span style={s.statIcon}>{stat.icon}</span>
              <div style={{ ...s.statVal, color: stat.color }}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={s.twoCol}>
          {/* ── Barcode Panel ── */}
          <div style={s.panel}>
            <h3 style={s.panelTitle}>📷 Barcode Inventory Manager</h3>
            <p style={s.panelSub}>Enter barcode to update stock instantly</p>

            <label style={s.label}>Barcode Number</label>
            <input
              style={s.input}
              placeholder="e.g. 8901234567890"
              value={barcode}
              onChange={(e) => { setBarcode(e.target.value); setBarcodeMsg(null); }}
            />

            <label style={s.label}>Quantity</label>
            <input
              style={s.input}
              type="number"
              placeholder="Enter qty"
              value={qty}
              onChange={(e) => { setQty(e.target.value); setBarcodeMsg(null); }}
            />

            <div style={s.actions}>
              <button
                style={{ ...s.actBtn, background: "#5bc47a" }}
                onClick={() => handleBarcodeUpdate("add")}
              >
                + Add Stock
              </button>
              <button
                style={{ ...s.actBtn, background: "#f05252" }}
                onClick={() => handleBarcodeUpdate("remove")}
              >
                − Remove Stock
              </button>
            </div>

            {barcodeMsg && (
              <div style={{
                ...s.msg,
                background: barcodeMsg.type === "success" ? "#d1fae5" : "#fee2e2",
                color:      barcodeMsg.type === "success" ? "#065f46" : "#991b1b",
              }}>
                {barcodeMsg.text}
              </div>
            )}

            <div style={s.hint}>
              <b>💡 Test Barcodes:</b><br />
              8901234567890 — Amul Milk<br />
              8901234567892 — Honey 250g<br />
              8901234567894 — Coconut Water
            </div>
          </div>

          {/* ── Inventory Table ── */}
          <div style={s.panel}>
            <h3 style={s.panelTitle}>📋 Live Inventory</h3>
            {loadingInv ? (
              <p style={{ color: "#aaa", padding: 20 }}>Loading inventory...</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {["Product", "Category", "Price", "Stock", "Status"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} style={s.tr}>
                      <td style={s.td}><span style={{ marginRight: 8 }}>{item.emoji}</span>{item.name}</td>
                      <td style={s.td}>{item.category}</td>
                      <td style={s.td}>₹{item.price}</td>
                      <td style={{ ...s.td, fontWeight: 700 }}>{item.stock}</td>
                      <td style={s.td}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: item.stock === 0 ? "#fee2e2" : item.stock < 10 ? "#fef3c7" : "#d1fae5",
                          color:      item.stock === 0 ? "#991b1b" : item.stock < 10 ? "#92400e" : "#065f46",
                        }}>
                          {item.stock === 0 ? "Out of Stock" : item.stock < 10 ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:      { minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" },
  header:    { background: "#1a1a2e", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  hLeft:     { display: "flex", alignItems: "center", gap: 14 },
  logo:      { fontSize: 20, fontWeight: 800, color: "#f6a623" },
  roleBadge: { background: "#f6a62333", color: "#f6a623", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, border: "1px solid #f6a62355" },
  hRight:    { display: "flex", alignItems: "center", gap: 14 },
  uname:     { color: "#ccc", fontSize: 14, fontWeight: 600 },
  logout:    { background: "#ffffff15", border: "1px solid #ffffff22", color: "#ccc", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  body:      { padding: 28, maxWidth: 1200, margin: "0 auto" },
  statsRow:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard:  { background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 12px #0001" },
  statIcon:  { fontSize: 24 },
  statVal:   { fontSize: 32, fontWeight: 800, margin: "6px 0 2px" },
  statLabel: { color: "#888", fontSize: 13, fontWeight: 500 },
  twoCol:    { display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 },
  panel:     { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px #0001" },
  panelTitle:{ fontSize: 17, fontWeight: 800, color: "#1a1a1a", marginTop: 0, marginBottom: 4 },
  panelSub:  { color: "#888", fontSize: 13, marginBottom: 20 },
  label:     { display: "block", color: "#555", fontSize: 13, fontWeight: 600, marginBottom: 6, marginTop: 14 },
  input:     { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#1a1a1a" },
  actions:   { display: "flex", gap: 10, marginTop: 18 },
  actBtn:    { flex: 1, padding: 12, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  msg:       { borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 600, marginTop: 14 },
  hint:      { background: "#f8f9fa", borderRadius: 10, padding: 14, fontSize: 12, color: "#666", marginTop: 16, lineHeight: 1.8, border: "1px dashed #ddd" },
  table:     { width: "100%", borderCollapse: "collapse" },
  thead:     { background: "#f8f9fa" },
  th:        { padding: "10px 14px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#666", borderBottom: "2px solid #eee" },
  tr:        { borderBottom: "1px solid #f5f5f5" },
  td:        { padding: "12px 14px", fontSize: 14, color: "#333" },
};
