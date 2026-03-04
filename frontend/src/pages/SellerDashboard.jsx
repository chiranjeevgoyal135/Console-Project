import { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000/api/inventory";

export default function SellerDashboard({ user, onLogout }) {
  const [inventory,   setInventory]   = useState([]);
  const [barcode,     setBarcode]     = useState("");
  const [scanned,     setScanned]     = useState(null);   // product found by barcode
  const [qty,         setQty]         = useState(1);
  const [action,      setAction]      = useState("add");
  const [msg,         setMsg]         = useState(null);   // { text, type: "ok"|"err" }
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("All");
  const [showLabels,  setShowLabels]  = useState(false);
  const [bulkMode,    setBulkMode]    = useState(false);
  const [bulkQueue,   setBulkQueue]   = useState([]);     // [{barcode,name,action,qty}]
  const barcodeRef = useRef(null);

  useEffect(() => { loadInventory(); }, []);

  async function loadInventory() {
    try {
      const res  = await fetch(API);
      const data = await res.json();
      if (data.success) setInventory(data.inventory);
    } catch { showMsg("Cannot reach server.", "err"); }
  }

  // Look up barcode as seller types / scans
  async function handleBarcodeInput(val) {
    setBarcode(val);
    setScanned(null);
    if (val.length >= 8) {
      try {
        const res  = await fetch(`${API}/barcode/${val}`);
        const data = await res.json();
        if (data.success) setScanned(data.product);
        else setScanned(null);
      } catch {}
    }
  }

  // Submit single update
  async function handleUpdate() {
    if (!scanned) { showMsg("Scan a valid barcode first.", "err"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, action, quantity: qty }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✅ ${data.product.name}: ${data.before} → ${data.after} units`, "ok");
        setInventory(prev => prev.map(p => p.barcode === barcode ? data.product : p));
        if (bulkMode) {
          setBulkQueue(prev => [...prev, { barcode, name: scanned.name, action, qty }]);
        }
        setBarcode(""); setScanned(null); setQty(1);
        barcodeRef.current?.focus();
      } else {
        showMsg(data.message, "err");
      }
    } catch { showMsg("Server error.", "err"); }
    finally { setLoading(false); }
  }

  // Submit all bulk updates
  async function handleBulkSubmit() {
    if (bulkQueue.length === 0) { showMsg("No items in bulk queue.", "err"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: bulkQueue.map(b => ({ barcode: b.barcode, action: b.action, quantity: b.qty })) }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✅ Bulk updated ${data.results.filter(r=>r.success).length} products`, "ok");
        setBulkQueue([]);
        loadInventory();
      }
    } catch { showMsg("Bulk update failed.", "err"); }
    finally { setLoading(false); }
  }

  function showMsg(text, type) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  // Print barcode labels for all products
  function printLabels() {
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Barcode Labels - SmarterBlinkit</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .label { border: 2px solid #333; border-radius: 8px; padding: 12px; text-align: center; break-inside: avoid; }
        .brand { font-size: 10px; color: #f6a623; font-weight: bold; letter-spacing: 1px; }
        .name  { font-size: 13px; font-weight: bold; margin: 4px 0; }
        .bars  { font-family: 'Libre Barcode 128', monospace; font-size: 48px; line-height: 1; letter-spacing: 2px; }
        .code  { font-size: 11px; color: #666; margin-top: 2px; letter-spacing: 2px; }
        .price { font-size: 12px; font-weight: bold; color: #333; }
        @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2 style="color:#f6a623">⚡ SmarterBlinkit — Inventory Labels</h2>
      <div class="grid">
        ${inventory.map(p => `
          <div class="label">
            <div class="brand">SMARTERBLINKIT</div>
            <div class="name">${p.name}</div>
            <div class="bars">${p.barcode}</div>
            <div class="code">${p.barcode}</div>
            <div class="price">₹${p.price} / ${p.unit}</div>
          </div>
        `).join("")}
      </div>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    win.document.close();
  }

  const categories = ["All", ...new Set(inventory.map(p => p.category))];
  const filtered   = inventory
    .filter(p => filterCat === "All" || p.category === filterCat)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search));

  const outOfStock  = inventory.filter(p => p.stock === 0).length;
  const lowStock    = inventory.filter(p => p.stock > 0 && p.stock <= 10).length;
  const totalUnits  = inventory.reduce((s, p) => s + p.stock, 0);

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>⚡ SmarterBlinkit</span>
          <span style={s.sellerBadge}>🏪 Seller Dashboard</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.userName}>👤 {user.name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={s.body}>
        {/* LEFT PANEL — Barcode scanner + controls */}
        <div style={s.leftPanel}>

          {/* Stats */}
          <div style={s.statsRow}>
            <div style={s.stat}><span style={s.statVal}>{inventory.length}</span><span style={s.statLbl}>Products</span></div>
            <div style={s.stat}><span style={s.statVal}>{totalUnits}</span><span style={s.statLbl}>Total Units</span></div>
            <div style={{ ...s.stat, ...( lowStock > 0 ? s.statWarn : {}) }}><span style={s.statVal}>{lowStock}</span><span style={s.statLbl}>Low Stock</span></div>
            <div style={{ ...s.stat, ...( outOfStock > 0 ? s.statDanger : {}) }}><span style={s.statVal}>{outOfStock}</span><span style={s.statLbl}>Out of Stock</span></div>
          </div>

          {/* Mode toggle */}
          <div style={s.modeRow}>
            <button style={{ ...s.modeBtn, ...(!bulkMode ? s.modeBtnActive : {}) }} onClick={() => setBulkMode(false)}>Single Scan</button>
            <button style={{ ...s.modeBtn, ...(bulkMode  ? s.modeBtnActive : {}) }} onClick={() => setBulkMode(true)}>Bulk Mode</button>
          </div>
          {bulkMode && <p style={s.bulkNote}>Scan multiple barcodes one by one — all queued for one submit at the end.</p>}

          {/* Barcode input */}
          <div style={s.scanSection}>
            <label style={s.sectionTitle}>📦 Scan or Type Barcode</label>
            <div style={s.barcodeRow}>
              <input
                ref={barcodeRef}
                style={s.barcodeInput}
                placeholder="Scan barcode or type manually..."
                value={barcode}
                onChange={e => handleBarcodeInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && scanned && handleUpdate()}
                autoFocus
              />
              {barcode && <button style={s.clearBtn} onClick={() => { setBarcode(""); setScanned(null); }}>✕</button>}
            </div>

            {/* Product found card */}
            {scanned && (
              <div style={s.foundCard}>
                <div style={s.foundTop}>
                  <div>
                    <div style={s.foundName}>{scanned.name}</div>
                    <div style={s.foundMeta}>{scanned.category} · ₹{scanned.price}/{scanned.unit}</div>
                  </div>
                  <div style={{ ...s.stockBadge, ...(scanned.stock === 0 ? s.stockOut : scanned.stock <= 10 ? s.stockLow : s.stockOk) }}>
                    {scanned.stock} in stock
                  </div>
                </div>

                {/* Action selector */}
                <div style={s.actionRow}>
                  {[
                    { val: "add",      label: "➕ Add Stock",    color: "#16a34a" },
                    { val: "subtract", label: "➖ Remove Stock",  color: "#dc2626" },
                    { val: "set",      label: "✏️ Set Exact",    color: "#7c3aed" },
                  ].map(a => (
                    <button key={a.val}
                      style={{ ...s.actionBtn, ...(action === a.val ? { background: a.color, color: "#fff", borderColor: a.color } : {}) }}
                      onClick={() => setAction(a.val)}>
                      {a.label}
                    </button>
                  ))}
                </div>

                <div style={s.qtyRow}>
                  <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input style={s.qtyInput} type="number" min="0" value={qty}
                    onChange={e => setQty(Math.max(0, parseInt(e.target.value) || 0))} />
                  <button style={s.qtyBtn} onClick={() => setQty(q => q + 1)}>+</button>
                  <span style={s.qtyLbl}>{scanned.unit}s</span>
                </div>

                <button style={s.updateBtn} onClick={handleUpdate} disabled={loading}>
                  {loading ? "Updating..." : `${action === "add" ? "Add" : action === "subtract" ? "Remove" : "Set"} ${qty} ${scanned.unit}(s)`}
                </button>
              </div>
            )}

            {barcode.length >= 8 && !scanned && (
              <div style={s.notFound}>❌ Barcode not found in system. Check the code and try again.</div>
            )}
          </div>

          {/* Bulk queue */}
          {bulkMode && bulkQueue.length > 0 && (
            <div style={s.bulkQueue}>
              <div style={s.sectionTitle}>📋 Bulk Queue ({bulkQueue.length} items)</div>
              {bulkQueue.map((b, i) => (
                <div key={i} style={s.bulkItem}>
                  <span style={s.bulkName}>{b.name}</span>
                  <span style={{ ...s.bulkAction, color: b.action === "add" ? "#16a34a" : b.action === "subtract" ? "#dc2626" : "#7c3aed" }}>
                    {b.action} {b.qty}
                  </span>
                  <button style={s.bulkRemove} onClick={() => setBulkQueue(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button style={s.bulkSubmitBtn} onClick={handleBulkSubmit} disabled={loading}>
                {loading ? "Updating..." : `✅ Apply All ${bulkQueue.length} Updates`}
              </button>
            </div>
          )}

          {/* Notification */}
          {msg && <div style={{ ...s.msg, ...(msg.type === "ok" ? s.msgOk : s.msgErr) }}>{msg.text}</div>}

          {/* Print Labels button */}
          <button style={s.printBtn} onClick={printLabels}>🖨️ Print Barcode Labels for All Products</button>
        </div>

        {/* RIGHT PANEL — Inventory table */}
        <div style={s.rightPanel}>
          <div style={s.tableHeader}>
            <span style={s.sectionTitle}>📦 Live Inventory</span>
            <div style={s.tableControls}>
              <input style={s.searchInput} placeholder="Search product or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
              <select style={s.catSelect} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Barcode</th>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Price</th>
                  <th style={s.th}>Stock</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.barcode} style={s.tr}
                    onClick={() => { setBarcode(p.barcode); handleBarcodeInput(p.barcode); barcodeRef.current?.focus(); }}
                    title="Click to select this product">
                    <td style={s.td}><span style={s.barcodeCell}>{p.barcode}</span></td>
                    <td style={s.td}><strong>{p.name}</strong></td>
                    <td style={s.td}>{p.category}</td>
                    <td style={s.td}>₹{p.price}</td>
                    <td style={s.td}><strong>{p.stock}</strong> {p.unit}s</td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, ...(p.stock === 0 ? s.statusOut : p.stock <= 10 ? s.statusLow : s.statusOk) }}>
                        {p.stock === 0 ? "Out of Stock" : p.stock <= 10 ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:         { minHeight: "100vh", background: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif" },
  header:       { background: "#1a1a1a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft:   { display: "flex", alignItems: "center", gap: 12 },
  logo:         { fontWeight: 800, fontSize: 18, color: "#fff" },
  sellerBadge:  { background: "#f6a62322", border: "1px solid #f6a62344", color: "#f6a623", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 },
  headerRight:  { display: "flex", alignItems: "center", gap: 12 },
  userName:     { fontSize: 13, color: "#aaa" },
  logoutBtn:    { padding: "5px 14px", borderRadius: 8, border: "1px solid #444", background: "transparent", cursor: "pointer", fontSize: 13, color: "#ccc" },
  body:         { display: "flex", gap: 20, padding: 20, maxWidth: 1300, margin: "0 auto" },
  leftPanel:    { width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 },
  rightPanel:   { flex: 1 },
  statsRow:     { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 },
  stat:         { background: "#fff", borderRadius: 10, padding: "12px 8px", textAlign: "center", border: "1px solid #eee" },
  statWarn:     { background: "#fffbeb", border: "1px solid #f59e0b33" },
  statDanger:   { background: "#fff5f5", border: "1px solid #f8717133" },
  statVal:      { display: "block", fontSize: 22, fontWeight: 800, color: "#1a1a1a" },
  statLbl:      { display: "block", fontSize: 11, color: "#888", marginTop: 2 },
  modeRow:      { display: "flex", gap: 8, background: "#fff", padding: 4, borderRadius: 10, border: "1px solid #eee" },
  modeBtn:      { flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#888" },
  modeBtnActive:{ background: "#1a1a1a", color: "#fff" },
  bulkNote:     { fontSize: 12, color: "#888", margin: 0, background: "#f9f9f9", padding: "8px 12px", borderRadius: 8, border: "1px dashed #ddd" },
  scanSection:  { background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee" },
  sectionTitle: { display: "block", fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 },
  barcodeRow:   { position: "relative", display: "flex" },
  barcodeInput: { flex: 1, padding: "11px 14px", borderRadius: 10, border: "2px solid #f6a623", fontSize: 15, outline: "none", fontFamily: "monospace", background: "#fffdf7" },
  clearBtn:     { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa" },
  foundCard:    { marginTop: 12, background: "#f9fafb", borderRadius: 10, padding: 14, border: "1px solid #e5e7eb" },
  foundTop:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  foundName:    { fontSize: 15, fontWeight: 700, color: "#1a1a1a" },
  foundMeta:    { fontSize: 12, color: "#888", marginTop: 2 },
  stockBadge:   { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  stockOk:      { background: "#dcfce7", color: "#16a34a" },
  stockLow:     { background: "#fef9c3", color: "#ca8a04" },
  stockOut:     { background: "#fee2e2", color: "#dc2626" },
  actionRow:    { display: "flex", gap: 6, marginBottom: 12 },
  actionBtn:    { flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#555" },
  qtyRow:       { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  qtyBtn:       { width: 32, height: 32, borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 700 },
  qtyInput:     { width: 60, textAlign: "center", padding: "6px 0", borderRadius: 8, border: "1px solid #ddd", fontSize: 16, fontWeight: 700 },
  qtyLbl:       { fontSize: 13, color: "#888" },
  updateBtn:    { width: "100%", padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f6a623,#f97316)", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  notFound:     { marginTop: 10, background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13 },
  bulkQueue:    { background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #eee" },
  bulkItem:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f5f5f5" },
  bulkName:     { fontSize: 13, color: "#1a1a1a", flex: 1 },
  bulkAction:   { fontSize: 13, fontWeight: 700, marginRight: 10 },
  bulkRemove:   { background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14 },
  bulkSubmitBtn:{ width: "100%", marginTop: 10, padding: 11, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  msg:          { borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 600 },
  msgOk:        { background: "#dcfce7", border: "1px solid #86efac", color: "#15803d" },
  msgErr:       { background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626" },
  printBtn:     { padding: 12, borderRadius: 10, border: "1.5px dashed #ddd", background: "#fff", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 600, textAlign: "center" },
  tableHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  tableControls:{ display: "flex", gap: 10 },
  searchInput:  { padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none", width: 200 },
  catSelect:    { padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none", background: "#fff" },
  tableWrap:    { background: "#fff", borderRadius: 12, border: "1px solid #eee", overflow: "hidden" },
  table:        { width: "100%", borderCollapse: "collapse" },
  thead:        { background: "#f9fafb" },
  th:           { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #eee" },
  tr:           { borderBottom: "1px solid #f5f5f5", cursor: "pointer" },
  td:           { padding: "12px 16px", fontSize: 14, color: "#1a1a1a" },
  barcodeCell:  { fontFamily: "monospace", fontSize: 12, color: "#888", background: "#f5f5f5", padding: "2px 8px", borderRadius: 4 },
  statusBadge:  { padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusOk:     { background: "#dcfce7", color: "#16a34a" },
  statusLow:    { background: "#fef9c3", color: "#ca8a04" },
  statusOut:    { background: "#fee2e2", color: "#dc2626" },
};