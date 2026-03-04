import { useState, useEffect, useRef } from "react";
import CheckoutModal from "./CheckoutModal.jsx";
import RecipeAgent   from "./RecipeAgent.jsx";
import ProductModal  from "./ProductModal.jsx";
import CartPage      from "./CartPage.jsx";

async function fetchNearestShops(lat, lng) {
  const res = await fetch(`http://localhost:5000/api/shops/nearest?lat=${lat}&lng=${lng}`);
  return res.json();
}

async function getSuggestions(query) {
  const res  = await fetch("http://localhost:5000/api/suggestions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export default function BuyerDashboard({ user, onLogout }) {
  const [query,          setQuery]          = useState("");
  const [suggestions,    setSuggestions]    = useState([]);
  const [cart,           setCart]           = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [shopInfo,       setShopInfo]       = useState(null);
  const [allShops,       setAllShops]       = useState([]);
  const [locStatus,      setLocStatus]      = useState("detecting");
  const [showShops,      setShowShops]      = useState(false);
  const [showCheckout,   setShowCheckout]   = useState(false);
  const [showRecipe,     setShowRecipe]     = useState(false);
  const [selectedProduct,setSelectedProduct]= useState(null);
  const [showCart,       setShowCart]       = useState(false);
  const debounceRef = useRef(null);

  // Location detection
  useEffect(() => {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const data = await fetchNearestShops(pos.coords.latitude, pos.coords.longitude);
          if (data.success && data.nearest) {
            setShopInfo(data.nearest);
            setAllShops(data.all || []);
            setLocStatus("found");
          }
        } catch { setLocStatus("denied"); }
      },
      () => setLocStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  // AI search with debounce
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getSuggestions(query);
        setSuggestions(data.matched ? data.suggestions : []);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 600);
  }, [query]);

  function addToCart(item) {
    setCart(prev => {
      const exists = prev.find(c => c.name === item.name);
      if (exists) return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function addToCartFromRecipe(items) {
    items.forEach(item => addToCart(item));
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Show CartPage as a full screen
  if (showCart) {
    return (
      <>
        <CartPage
          cart={cart}
          setCart={setCart}
          shopInfo={shopInfo}
          onBack={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
        />
        {showCheckout && (
          <CheckoutModal
            cart={cart}
            shopInfo={shopInfo}
            onClose={() => setShowCheckout(false)}
            onSuccess={() => setCart([])}
          />
        )}
      </>
    );
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <span style={s.logo}>⚡ SmarterBlinkit</span>

        {/* Location pill */}
        <div style={s.locPill} onClick={() => setShowShops(!showShops)}>
          {locStatus === "found" && shopInfo
            ? <>📍 Delivering in <strong style={{color:"#f6a623"}}>&nbsp;{shopInfo.deliveryMins} mins</strong>&nbsp;· {shopInfo.city} ▾</>
            : locStatus === "detecting" ? "📍 Detecting location..." : "📍 Location unavailable"}
        </div>

        {showShops && allShops.length > 0 && (
          <div style={s.shopDropdown}>
            {allShops.slice(0,5).map((shop,i) => (
              <div key={i} style={{ ...s.shopOption, ...(i===0?s.shopOptionFirst:{}) }}
                onClick={() => { setShopInfo(shop); setShowShops(false); }}>
                <span>{shop.name}</span>
                <span style={s.shopMeta}>{shop.distanceKm}km · {shop.deliveryMins}m · ₹{shop.deliveryFee}</span>
              </div>
            ))}
          </div>
        )}

        <div style={s.headerRight}>
          <span style={s.userName}>👤 {user.name}</span>

          {/* Cart button */}
          <button style={s.cartBtn} onClick={() => setShowCart(true)}>
            🛒 Cart
            {cartCount > 0 && <span style={s.cartBadge}>{cartCount}</span>}
          </button>

          <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* BODY */}
      <div style={s.body}>

        {/* Search */}
        <div style={s.searchWrap}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={s.searchInput}
              placeholder='Search "biscuits", "milk", "fever", "movie night"...'
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && <button style={s.clearBtn} onClick={() => { setQuery(""); setSuggestions([]); }}>✕</button>}
          </div>
        </div>

        {/* Recipe Agent button */}
        <button style={s.recipeBtn} onClick={() => setShowRecipe(true)}>
          🤖 Recipe Agent — type a dish, get all ingredients added to cart instantly
        </button>

        {/* Loading */}
        {loading && (
          <div style={s.loadingRow}>
            <div style={s.spinner}/> AI is finding products...
          </div>
        )}

        {/* No results */}
        {!loading && query && suggestions.length === 0 && (
          <div style={s.noResults}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <div style={s.noResultsTitle}>No grocery items found for "{query}"</div>
            <div style={s.noResultsSub}>Try something like "milk", "chips", or "dal rice"</div>
          </div>
        )}

        {/* Empty state */}
        {!query && (
          <div style={s.emptyState}>
            <div style={s.emptyEmoji}>🛒</div>
            <div style={s.emptyTitle}>What are you looking for?</div>
            <div style={s.emptySub}>Search any product, brand, category, or occasion</div>
            <div style={s.quickSearches}>
              {["🍪 Biscuits","🥛 Milk","🍜 Noodles","🍫 Chocolate","🫖 Tea","🧴 Handwash"].map(q => (
                <button key={q} style={s.quickBtn} onClick={() => setQuery(q.split(" ").slice(1).join(" "))}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product grid */}
        {suggestions.length > 0 && (
          <div style={s.resultsWrap}>
            <div style={s.resultsHeader}>
              <span style={s.resultsTitle}>
                🤖 AI found <strong>{suggestions.length} products</strong> for "{query}"
              </span>
              <span style={s.aiBadge}>Powered by Groq AI</span>
            </div>
            <div style={s.grid}>
              {suggestions.map((item, i) => (
                <div key={i} style={s.card} onClick={() => setSelectedProduct(item)}>
                  <div style={s.cardEmoji}>{item.emoji || "🛍️"}</div>
                  <div style={s.cardName}>{item.name}</div>
                  {item.brand && <div style={s.cardBrand}>{item.brand}</div>}
                  <div style={s.cardReason}>{item.reason}</div>
                  <div style={s.cardBottom}>
                    <span style={s.cardPrice}>₹{item.price}</span>
                    {(() => {
                      const cartItem = cart.find(c => c.name === item.name);
                      return cartItem ? (
                        <div style={s.qtyRow} onClick={e => e.stopPropagation()}>
                          <button style={s.qtyBtn} onClick={e => { e.stopPropagation(); setCart(prev => prev.map(c => c.name === item.name ? {...c, qty: c.qty - 1} : c).filter(c => c.qty > 0)); }}>−</button>
                          <span style={s.qtyNum}>{cartItem.qty}</span>
                          <button style={s.qtyBtn} onClick={e => { e.stopPropagation(); addToCart(item); }}>+</button>
                        </div>
                      ) : (
                        <button style={s.addBtn} onClick={e => { e.stopPropagation(); addToCart(item); }}>+ Add</button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={item => {
            setCart(prev => {
              const exists = prev.find(c => c.name === item.name);
              if (exists) return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
              return [...prev, { ...item, qty: 1 }];
            });
          }}
        />
      )}
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
          onSuccess={() => setCart([])}
        />
      )}
    </div>
  );
}

const s = {
  page:           { minHeight:"100vh", background:"#f5f5f5", fontFamily:"'Segoe UI',sans-serif" },
  header:         { background:"#1a1a1a", padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:16, position:"relative", zIndex:100 },
  logo:           { fontWeight:800, fontSize:18, color:"#fff", marginRight:8 },
  locPill:        { padding:"5px 14px", borderRadius:20, background:"#ffffff11", border:"1px solid #ffffff22", color:"#fff", fontSize:13, cursor:"pointer", whiteSpace:"nowrap" },
  shopDropdown:   { position:"absolute", top:60, left:160, background:"#fff", borderRadius:12, boxShadow:"0 8px 30px #0003", minWidth:300, zIndex:200, overflow:"hidden" },
  shopOption:     { padding:"12px 16px", cursor:"pointer", fontSize:13, display:"flex", justifyContent:"space-between", borderBottom:"1px solid #f5f5f5" },
  shopOptionFirst:{ background:"#fff8ee" },
  shopMeta:       { color:"#aaa", fontSize:12 },
  headerRight:    { display:"flex", alignItems:"center", gap:12, marginLeft:"auto" },
  userName:       { fontSize:13, color:"#aaa", whiteSpace:"nowrap" },
  cartBtn:        { position:"relative", padding:"7px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:14, fontWeight:700, cursor:"pointer" },
  cartBadge:      { position:"absolute", top:-6, right:-6, background:"#dc2626", color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:11, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" },
  logoutBtn:      { padding:"6px 14px", borderRadius:8, border:"1px solid #444", background:"transparent", cursor:"pointer", fontSize:13, color:"#ccc" },
  body:           { maxWidth:1000, margin:"0 auto", padding:24 },
  searchWrap:     { marginBottom:14 },
  searchBox:      { display:"flex", alignItems:"center", background:"#fff", borderRadius:14, padding:"4px 16px", boxShadow:"0 2px 12px #0001", border:"2px solid #f6a62333" },
  searchIcon:     { fontSize:20, marginRight:10 },
  searchInput:    { flex:1, border:"none", outline:"none", fontSize:16, padding:"10px 0", background:"transparent" },
  clearBtn:       { background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa", padding:4 },
  recipeBtn:      { width:"100%", padding:"12px 16px", borderRadius:12, border:"2px dashed #f6a62366", background:"linear-gradient(135deg,#fff8ee,#fffdf7)", color:"#f6a623", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:20, textAlign:"center" },
  loadingRow:     { display:"flex", alignItems:"center", gap:10, color:"#888", fontSize:14, padding:"20px 0" },
  spinner:        { width:20, height:20, border:"3px solid #eee", borderTopColor:"#f6a623", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  noResults:      { textAlign:"center", padding:"60px 20px" },
  noResultsTitle: { fontSize:18, fontWeight:700, color:"#1a1a1a", marginBottom:8 },
  noResultsSub:   { fontSize:14, color:"#aaa" },
  emptyState:     { textAlign:"center", padding:"60px 20px" },
  emptyEmoji:     { fontSize:64, marginBottom:16 },
  emptyTitle:     { fontSize:22, fontWeight:800, color:"#1a1a1a", marginBottom:8 },
  emptySub:       { fontSize:14, color:"#aaa", marginBottom:24 },
  quickSearches:  { display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" },
  quickBtn:       { padding:"10px 20px", borderRadius:20, border:"1px solid #eee", background:"#fff", cursor:"pointer", fontSize:14, fontWeight:600, color:"#555" },
  resultsWrap:    { },
  resultsHeader:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 },
  resultsTitle:   { fontSize:15, color:"#555" },
  aiBadge:        { background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20 },
  grid:           { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 },
  card:           { background:"#fff", borderRadius:14, padding:16, cursor:"pointer", boxShadow:"0 2px 8px #0001", border:"1px solid #eee", transition:"box-shadow 0.2s" },
  cardEmoji:      { fontSize:40, marginBottom:10 },
  cardName:       { fontSize:14, fontWeight:700, color:"#1a1a1a", marginBottom:3 },
  cardBrand:      { fontSize:11, color:"#f6a623", fontWeight:600, marginBottom:4 },
  cardReason:     { fontSize:12, color:"#aaa", marginBottom:10, fontStyle:"italic" },
  cardBottom:     { display:"flex", justifyContent:"space-between", alignItems:"center" },
  cardPrice:      { fontSize:16, fontWeight:800, color:"#1a1a1a" },
  qtyRow:         { display:"flex", alignItems:"center", gap:6 },
  qtyBtn:         { width:28, height:28, borderRadius:8, border:"1px solid #f6a623", background:"#fff8ee", color:"#f6a623", fontSize:16, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  qtyNum:         { fontSize:15, fontWeight:800, color:"#1a1a1a", minWidth:22, textAlign:"center" },
  addBtn:         { padding:"7px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:13, fontWeight:700, cursor:"pointer" },
};