import { useState, useEffect, useRef } from "react";
import { getSuggestions } from "../api/api.js";
import CheckoutModal from "./CheckoutModal.jsx";
import RecipeAgent from "./RecipeAgent.jsx";

// Fetch nearest shops from backend
async function fetchNearestShops(lat, lng) {
  const res = await fetch(`http://localhost:5000/api/shops/nearest?lat=${lat}&lng=${lng}`);
  return res.json();
}

export default function BuyerDashboard({ user, onLogout }) {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [cart,        setCart]        = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [shopInfo,    setShopInfo]    = useState(null);   // nearest shop
  const [allShops,    setAllShops]    = useState([]);
  const [locStatus,   setLocStatus]   = useState("detecting"); // detecting | found | denied
  const [showShops,   setShowShops]   = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const debounceRef = useRef(null);

  // On mount — ask for location and find nearest shop
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const data = await fetchNearestShops(lat, lng);
          if (data.success) {
            setShopInfo(data.nearest);
            setAllShops(data.allShops);
            setLocStatus("found");
          }
        } catch {
          setLocStatus("denied");
        }
      },
      () => setLocStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  // Debounced AI search
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await getSuggestions(query);
        setSuggestions(data.matched ? data.suggestions : []);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 500);
  }, [query]);

  function addToCart(item) {
    setCart(prev => {
      const exists = prev.find(c => c.name === item.name);
      if (exists) return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function changeQty(name, delta) {
    setCart(prev =>
      prev.map(c => c.name === name ? { ...c, qty: c.qty + delta } : c)
          .filter(c => c.qty > 0)
    );
  }

  const cartTotal    = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount    = cart.reduce((s, c) => s + c.qty, 0);
  const deliveryFee  = shopInfo ? shopInfo.deliveryFee : 0;
  const grandTotal   = cartTotal + deliveryFee;

  function addToCartFromRecipe(items) {
    items.forEach(item => {
      setCart(prev => {
        const exists = prev.find(c => c.name === item.name);
        if (exists) return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
        return [...prev, { ...item, qty: 1 }];
      });
    });
  }

  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>⚡ SmarterBlinkit</span>
          {/* Location pill */}
          {locStatus === "detecting" && (
            <div style={s.locPill}>📍 Detecting location...</div>
          )}
          {locStatus === "found" && shopInfo && (
            <div style={{ ...s.locPill, ...s.locFound }} onClick={() => setShowShops(!showShops)}
              title="Click to see all nearby shops">
              📍 Delivering in <strong style={{ color: "#f6a623" }}>&nbsp;{shopInfo.deliveryMins} mins</strong>
              &nbsp;· {shopInfo.city} &nbsp;▾
            </div>
          )}
          {locStatus === "denied" && (
            <div style={{ ...s.locPill, ...s.locDenied }}>📍 Location unavailable</div>
          )}
        </div>
        <div style={s.headerRight}>
          <span style={s.userName}>👤 {user.name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* ── SHOP DROPDOWN ── */}
      {showShops && allShops.length > 0 && (
        <div style={s.shopDropdown}>
          <p style={s.shopDropTitle}>🏪 Shops ranked by distance from you</p>
          {allShops.slice(0, 5).map((shop, i) => (
            <div key={shop.id} style={{ ...s.shopRow, ...(i === 0 ? s.shopRowBest : {}) }}>
              <div>
                <div style={s.shopName}>{i === 0 ? "⭐ " : ""}{shop.name}</div>
                <div style={s.shopAddr}>{shop.address}</div>
              </div>
              <div style={s.shopMeta}>
                <span style={s.shopDist}>{shop.distanceKm} km</span>
                <span style={s.shopTime}>{shop.deliveryMins} min · ₹{shop.deliveryFee}</span>
              </div>
            </div>
          ))}
          <button style={s.closeShops} onClick={() => setShowShops(false)}>Close ✕</button>
        </div>
      )}

      <div style={s.body}>
        {/* ── MAIN CONTENT ── */}
        <div style={s.main}>
          <h2 style={s.greeting}>Hello {user.name.split(" ")[0]}! 👋</h2>
          <p style={s.sub}>What do you need today?</p>

          {/* Nearest shop banner */}
          {locStatus === "found" && shopInfo && (
            <div style={s.shopBanner}>
              <div style={s.bannerLeft}>
                <span style={s.bannerIcon}>🏪</span>
                <div>
                  <div style={s.bannerName}>{shopInfo.name}</div>
                  <div style={s.bannerAddr}>{shopInfo.address}</div>
                </div>
              </div>
              <div style={s.bannerRight}>
                <div style={s.bannerStat}>
                  <span style={s.bannerStatVal}>{shopInfo.deliveryMins} min</span>
                  <span style={s.bannerStatLbl}>Delivery</span>
                </div>
                <div style={s.bannerDivider}/>
                <div style={s.bannerStat}>
                  <span style={s.bannerStatVal}>{shopInfo.distanceKm} km</span>
                  <span style={s.bannerStatLbl}>Away</span>
                </div>
                <div style={s.bannerDivider}/>
                <div style={s.bannerStat}>
                  <span style={s.bannerStatVal}>₹{shopInfo.deliveryFee}</span>
                  <span style={s.bannerStatLbl}>Fee</span>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={s.searchInput}
              placeholder='Try "fever", "italian dinner", "movie night"...'
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button style={s.clearBtn} onClick={() => { setQuery(""); setSuggestions([]); }}>✕</button>
            )}
          </div>

          {/* Recipe Agent button */}
          <button style={s.recipeBtn} onClick={() => setShowRecipe(true)}>
            🤖 Recipe Agent — type a dish, get all ingredients instantly
          </button>

          {/* Suggestions */}
          <div style={s.resultsBox}>
            {searching && (
              <div style={s.centreMsg}>🤖 AI is thinking...</div>
            )}
            {!searching && suggestions.length === 0 && !query && (
              <div style={s.centreMsg}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
                <div style={{ color: "#555", fontSize: 15 }}>
                  Search for anything — symptoms, meals, occasions
                </div>
              </div>
            )}
            {!searching && suggestions.length === 0 && query && (
              <div style={s.centreMsg}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🤔</div>
                <div style={{ color: "#555" }}>No suggestions for that. Try something else!</div>
              </div>
            )}
            {!searching && suggestions.length > 0 && (
              <div style={s.grid}>
                {suggestions.map((item, i) => (
                  <div key={i} style={s.card}>
                    <div style={s.cardEmoji}>{item.emoji}</div>
                    <div style={s.cardName}>{item.name}</div>
                    <div style={s.cardReason}>{item.reason}</div>
                    <div style={s.cardBottom}>
                      <span style={s.cardPrice}>₹{item.price}</span>
                      <button style={s.addBtn} onClick={() => addToCart(item)}>+ Add</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CART ── */}
        <div style={s.cartPanel}>
          <div style={s.cartHeader}>
            🛒 Your Cart {cartCount > 0 && <span style={s.cartBadge}>{cartCount}</span>}
          </div>

          {cart.length === 0 ? (
            <div style={s.emptyCart}>Add items from search to get started</div>
          ) : (
            <>
              <div style={s.cartItems}>
                {cart.map(item => (
                  <div key={item.name} style={s.cartItem}>
                    <div style={s.cartItemLeft}>
                      <span style={{ fontSize: 22 }}>{item.emoji}</span>
                      <div>
                        <div style={s.cartItemName}>{item.name}</div>
                        <div style={s.cartItemPrice}>₹{item.price} × {item.qty}</div>
                      </div>
                    </div>
                    <div style={s.qtyRow}>
                      <button style={s.qtyBtn} onClick={() => changeQty(item.name, -1)}>−</button>
                      <span style={s.qtyNum}>{item.qty}</span>
                      <button style={s.qtyBtn} onClick={() => changeQty(item.name, +1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={s.cartSummary}>
                <div style={s.summaryRow}>
                  <span style={s.summaryLbl}>Subtotal</span>
                  <span style={s.summaryVal}>₹{cartTotal}</span>
                </div>
                {shopInfo && (
                  <div style={s.summaryRow}>
                    <span style={s.summaryLbl}>Delivery fee</span>
                    <span style={s.summaryVal}>₹{deliveryFee}</span>
                  </div>
                )}
                <div style={{ ...s.summaryRow, ...s.summaryTotal }}>
                  <span>Total</span>
                  <span style={s.totalAmt}>₹{grandTotal}</span>
                </div>
              </div>

              {shopInfo && (
                <div style={s.deliveryNote}>
                  📍 Delivering from <strong>{shopInfo.city}</strong> in ~{shopInfo.deliveryMins} mins
                </div>
              )}

              <button style={s.checkoutBtn} onClick={() => setShowCheckout(true)}>
                Proceed to Checkout →
              </button>
            </>
          )}
        </div>
      </div>
      {showRecipe && (
        <RecipeAgent
          onAddToCart={addToCartFromRecipe}
          onClose={() => setShowRecipe(false)}
        />
      )}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          shopInfo={shopInfo}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => { setCart([]); }}
        />
      )}
    </div>
  );
}

const s = {
  page:           { minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Segoe UI', sans-serif" },
  header:         { background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px #0001" },
  headerLeft:     { display: "flex", alignItems: "center", gap: 14 },
  logo:           { fontWeight: 800, fontSize: 18, color: "#1a1a1a" },
  locPill:        { padding: "5px 12px", borderRadius: 20, background: "#f5f5f5", fontSize: 13, color: "#666", cursor: "pointer", border: "1px solid #eee" },
  locFound:       { background: "#fff8ee", border: "1px solid #f6a62333", color: "#333" },
  locDenied:      { background: "#fff0f0", border: "1px solid #f8717133", color: "#888" },
  headerRight:    { display: "flex", alignItems: "center", gap: 12 },
  userName:       { fontSize: 14, color: "#555" },
  logoutBtn:      { padding: "6px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13, color: "#555" },
  shopDropdown:   { background: "#fff", border: "1px solid #eee", borderRadius: 12, margin: "8px 24px", padding: 16, boxShadow: "0 4px 20px #0001" },
  shopDropTitle:  { fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 10, marginTop: 0 },
  shopRow:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, marginBottom: 6, background: "#fafafa", border: "1px solid #f0f0f0" },
  shopRowBest:    { background: "#fff8ee", border: "1px solid #f6a62333" },
  shopName:       { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 },
  shopAddr:       { fontSize: 12, color: "#888" },
  shopMeta:       { textAlign: "right" },
  shopDist:       { display: "block", fontSize: 14, fontWeight: 700, color: "#f6a623" },
  shopTime:       { display: "block", fontSize: 12, color: "#888", marginTop: 2 },
  closeShops:     { marginTop: 8, width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid #eee", background: "#fafafa", cursor: "pointer", fontSize: 13, color: "#888" },
  body:           { display: "flex", gap: 24, padding: 24, maxWidth: 1200, margin: "0 auto" },
  main:           { flex: 1 },
  greeting:       { margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "#1a1a1a" },
  sub:            { margin: "0 0 16px", color: "#888", fontSize: 15 },
  shopBanner:     { background: "#fff", border: "1px solid #f6a62333", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px #f6a62311" },
  bannerLeft:     { display: "flex", alignItems: "center", gap: 12 },
  bannerIcon:     { fontSize: 28 },
  bannerName:     { fontSize: 14, fontWeight: 700, color: "#1a1a1a" },
  bannerAddr:     { fontSize: 12, color: "#888", marginTop: 2 },
  bannerRight:    { display: "flex", alignItems: "center", gap: 16 },
  bannerStat:     { textAlign: "center" },
  bannerStatVal:  { display: "block", fontSize: 16, fontWeight: 800, color: "#f6a623" },
  bannerStatLbl:  { display: "block", fontSize: 11, color: "#aaa", marginTop: 2 },
  bannerDivider:  { width: 1, height: 30, background: "#eee" },
  searchBox:      { background: "#fff", borderRadius: 12, border: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 14px", marginBottom: 16, boxShadow: "0 2px 8px #0001" },
  searchIcon:     { fontSize: 18, marginRight: 10, color: "#aaa" },
  searchInput:    { flex: 1, border: "none", outline: "none", fontSize: 15, padding: "14px 0", background: "transparent", color: "#1a1a1a" },
  clearBtn:       { background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16, padding: 4 },
  resultsBox:     { background: "#fff", borderRadius: 14, border: "1px solid #eee", minHeight: 300, padding: 16 },
  centreMsg:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 250, color: "#888", fontSize: 15 },
  grid:           { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 },
  card:           { background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 },
  cardEmoji:      { fontSize: 32 },
  cardName:       { fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
  cardReason:     { fontSize: 12, color: "#888", flexGrow: 1 },
  cardBottom:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  cardPrice:      { fontSize: 15, fontWeight: 700, color: "#f6a623" },
  addBtn:         { padding: "5px 12px", borderRadius: 8, border: "none", background: "#f6a623", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  cartPanel:      { width: 300, background: "#fff", borderRadius: 14, border: "1px solid #eee", padding: 16, height: "fit-content", position: "sticky", top: 76, boxShadow: "0 2px 12px #0001" },
  cartHeader:     { fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
  cartBadge:      { background: "#f6a623", color: "#000", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  emptyCart:      { color: "#aaa", fontSize: 14, textAlign: "center", padding: "30px 0" },
  cartItems:      { display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 },
  cartItem:       { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cartItemLeft:   { display: "flex", alignItems: "center", gap: 10 },
  cartItemName:   { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  cartItemPrice:  { fontSize: 12, color: "#888" },
  qtyRow:         { display: "flex", alignItems: "center", gap: 8 },
  qtyBtn:         { width: 26, height: 26, borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum:         { fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: "center" },
  cartSummary:    { borderTop: "1px solid #eee", paddingTop: 12, marginBottom: 12 },
  summaryRow:     { display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#666" },
  summaryLbl:     {},
  summaryVal:     {},
  summaryTotal:   { fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginTop: 4 },
  totalAmt:       { color: "#f6a623", fontSize: 17 },
  deliveryNote:   { background: "#fff8ee", border: "1px solid #f6a62322", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#888", marginBottom: 12, textAlign: "center" },
  recipeBtn:     { width:"100%",padding:"12px 16px",borderRadius:12,border:"2px dashed #f6a62366",background:"linear-gradient(135deg,#fff8ee,#fffdf7)",color:"#f6a623",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:14,textAlign:"center" },
  checkoutBtn:    { width: "100%", padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f6a623,#f97316)", color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer" },
};

// ── PATCH: add this to the top of BuyerDashboard.jsx ──
// 1. Add this import at the top:
//
// 2. Add this state inside the component:
//
// 3. Replace the <button style={s.checkoutBtn}> line with:
//    <button style={s.checkoutBtn} onClick={() => cart.length > 0 && setShowCheckout(true)}>
//      Proceed to Checkout →
//    </button>
//    {showCheckout && (
//      <CheckoutModal
//        cart={cart}
//        shopInfo={shopInfo}
//        onClose={() => setShowCheckout(false)}
//        onSuccess={() => { setCart([]); }}
//      />
//    )}