// ============================================================
//  pages/BuyerDashboard.jsx  —  Buyer View
//
//  Interview explanation:
//    - Calls getSuggestions() from api.js when user types
//    - Uses debounce pattern (useEffect + delay) to avoid
//      hitting backend on every single keystroke
//    - Cart state lives here locally (in production: store in backend)
// ============================================================

import { useState, useEffect } from "react";
import { getSuggestions } from "../api/api.js";

export default function BuyerDashboard({ user, onLogout }) {
  const [search,      setSearch]      = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [cartItems,   setCartItems]   = useState([
    { id: 1, name: "Amul Milk 500ml", price: 28, qty: 2, emoji: "🥛" },
    { id: 2, name: "Brown Bread",     price: 45, qty: 1, emoji: "🍞" },
  ]);

  // useEffect watches `search` — whenever it changes, we wait 500ms
  // before calling the API (this is called "debouncing")
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getSuggestions(search);
        if (data.success && data.matched) {
          setSuggestions(data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);                          // 500ms debounce delay

    return () => clearTimeout(timer); // cleanup if user keeps typing
  }, [search]);

  function addToCart(item) {
    setCartItems((prev) => {
      const exists = prev.find((c) => c.name === item.name);
      if (exists)
        return prev.map((c) => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, id: Date.now(), qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCartItems((prev) =>
      prev
        .map((c) => c.id === id ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0)
    );
  }

  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.hLeft}>
          <span style={s.logo}>⚡ SmarterBlinkit</span>
          <span style={s.badge}>📍 Delivering in <b>10 mins</b></span>
        </div>
        <div style={s.hRight}>
          <span style={s.uname}>👤 {user.name}</span>
          <button style={s.logout} onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Main Area ── */}
        <div style={s.main}>
          <h2 style={s.greeting}>Hello {user.name.split(" ")[0]}! 👋</h2>
          <p style={s.sub}>What do you need today?</p>

          {/* Search Bar */}
          <div style={s.searchBar}>
            <span style={{ fontSize: 20 }}>🔍</span>
            <input
              style={s.searchInput}
              placeholder='Try "I have cold" or "fever" or "party"...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button style={s.clear} onClick={() => setSearch("")}>✕</button>
            )}
          </div>

          {/* AI Suggestions */}
          {loading && <div style={s.loadingMsg}>🤖 Thinking...</div>}

          {!loading && suggestions.length > 0 && (
            <div style={s.aiBox}>
              <div style={s.aiHeader}>
                <span style={s.aiTag}>🤖 AI Smart Cart</span>
                <span style={s.aiDesc}>Based on "{search}", you might need:</span>
              </div>
              <div style={s.grid}>
                {suggestions.map((item, i) => (
                  <div key={i} style={s.sugCard}>
                    <span style={s.emoji}>{item.emoji}</span>
                    <div style={s.info}>
                      <div style={s.iName}>{item.name}</div>
                      <div style={s.iReason}>{item.reason}</div>
                      <div style={s.iPrice}>₹{item.price}</div>
                    </div>
                    <button style={s.addBtn} onClick={() => addToCart(item)}>
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !search && (
            <div style={s.empty}>
              <div style={{ fontSize: 48 }}>🛍️</div>
              <p style={{ color: "#888" }}>Search a symptom or occasion to get AI suggestions!</p>
            </div>
          )}

          {!loading && search && suggestions.length === 0 && (
            <div style={s.empty}>
              <div style={{ fontSize: 48 }}>🤔</div>
              <p style={{ color: "#888" }}>
                Try "cold", "fever", "party", "headache" or "breakfast"!
              </p>
            </div>
          )}
        </div>

        {/* ── Cart Sidebar ── */}
        <div style={s.cart}>
          <h3 style={s.cartTitle}>🛒 Your Cart</h3>

          {cartItems.length === 0 && (
            <p style={{ color: "#aaa", textAlign: "center", padding: 20 }}>
              Cart is empty
            </p>
          )}

          {cartItems.map((item) => (
            <div key={item.id} style={s.cartItem}>
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={s.ciName}>{item.name}</div>
                <div style={s.ciPrice}>₹{item.price} × {item.qty}</div>
              </div>
              <div style={s.qty}>
                <button style={s.qBtn} onClick={() => changeQty(item.id, -1)}>−</button>
                <span style={s.qNum}>{item.qty}</span>
                <button style={s.qBtn} onClick={() => changeQty(item.id, +1)}>+</button>
              </div>
            </div>
          ))}

          {cartItems.length > 0 && (
            <>
              <div style={s.total}>
                <span>Total</span>
                <span style={{ color: "#f6a623", fontWeight: 700 }}>₹{total}</span>
              </div>
              <button style={s.checkout}>Proceed to Checkout →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight: "100vh", background: "#f8f9fb", fontFamily: "'Segoe UI', sans-serif" },
  header:     { background: "#fff", borderBottom: "1px solid #eee", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px #0001" },
  hLeft:      { display: "flex", alignItems: "center", gap: 16 },
  logo:       { fontSize: 20, fontWeight: 800, color: "#1a1a1a" },
  badge:      { background: "#fff8e6", color: "#c07800", fontSize: 13, padding: "4px 12px", borderRadius: 20, border: "1px solid #f6e0a0" },
  hRight:     { display: "flex", alignItems: "center", gap: 14 },
  uname:      { color: "#555", fontSize: 14, fontWeight: 600 },
  logout:     { background: "#f1f1f1", border: "none", color: "#555", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  body:       { display: "flex", gap: 24, padding: 28, maxWidth: 1200, margin: "0 auto" },
  main:       { flex: 1 },
  greeting:   { fontSize: 26, fontWeight: 800, margin: 0, color: "#1a1a1a" },
  sub:        { color: "#888", fontSize: 15, marginTop: 4, marginBottom: 20 },
  searchBar:  { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16, padding: "14px 18px", boxShadow: "0 2px 16px #0001", marginBottom: 24 },
  searchInput:{ flex: 1, border: "none", outline: "none", fontSize: 16, color: "#1a1a1a", background: "transparent" },
  clear:      { background: "#eee", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", color: "#888" },
  loadingMsg: { textAlign: "center", color: "#f6a623", padding: 24, fontSize: 18 },
  aiBox:      { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 16px #0001", border: "1px solid #f0e8d0" },
  aiHeader:   { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  aiTag:      { background: "linear-gradient(135deg, #f6a623, #f97316)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20 },
  aiDesc:     { color: "#888", fontSize: 14 },
  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  sugCard:    { display: "flex", alignItems: "center", gap: 10, background: "#fafafa", borderRadius: 12, padding: "12px 14px", border: "1px solid #f0f0f0" },
  emoji:      { fontSize: 28 },
  info:       { flex: 1 },
  iName:      { fontWeight: 700, fontSize: 14, color: "#1a1a1a" },
  iReason:    { color: "#888", fontSize: 12, marginTop: 2 },
  iPrice:     { color: "#f6a623", fontWeight: 700, fontSize: 14, marginTop: 4 },
  addBtn:     { background: "#f6a623", border: "none", color: "#000", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 8, cursor: "pointer" },
  empty:      { textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px #0001" },
  cart:       { width: 300, background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 16px #0001", height: "fit-content", position: "sticky", top: 80 },
  cartTitle:  { fontSize: 18, fontWeight: 800, marginTop: 0, marginBottom: 16, color: "#1a1a1a" },
  cartItem:   { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f5f5" },
  ciName:     { fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
  ciPrice:    { fontSize: 13, color: "#888", marginTop: 2 },
  qty:        { display: "flex", alignItems: "center", gap: 6 },
  qBtn:       { background: "#f1f1f1", border: "none", width: 26, height: 26, borderRadius: 6, cursor: "pointer", fontWeight: 700 },
  qNum:       { fontWeight: 700, minWidth: 18, textAlign: "center" },
  total:      { display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 700, fontSize: 16, borderTop: "2px solid #f0f0f0", marginTop: 8 },
  checkout:   { width: "100%", padding: 14, background: "linear-gradient(135deg, #f6a623, #f97316)", border: "none", borderRadius: 12, color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8 },
};
