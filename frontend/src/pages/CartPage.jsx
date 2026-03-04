// CartPage.jsx — Dedicated cart screen with AI "You may also like" suggestions
import { useState, useEffect, useRef } from "react";

export default function CartPage({ cart, setCart, shopInfo, onBack, onCheckout }) {
  const [suggestions, setSuggestions] = useState([]);
  const [bundles,     setBundles]     = useState([]);
  const [loadingSug,  setLoadingSug]  = useState(false);
  const [added,       setAdded]       = useState({});
  const fetchedRef = useRef(false);

  // Fetch AI suggestions based on cart contents
  useEffect(() => {
    if (!cart.length || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoadingSug(true);
    fetch("http://localhost:5000/api/cart-suggestions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ cartItems: cart }),
    })
      .then(r => r.json())
      .then(data => { setSuggestions(data.suggestions || []); setBundles(data.bundles || []); })
      .catch(console.error)
      .finally(() => setLoadingSug(false));
  }, []);

  function updateQty(name, delta) {
    setCart(prev => prev
      .map(i => i.name === name ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  }

  function removeItem(name) {
    setCart(prev => prev.filter(i => i.name !== name));
  }

  function addSuggestion(item) {
    setCart(prev => {
      const exists = prev.find(i => i.name === item.name);
      if (exists) return prev.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    setAdded(prev => ({ ...prev, [item.name]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [item.name]: false })), 1500);
  }

  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = shopInfo?.deliveryFee || 0;
  const total       = subtotal + deliveryFee;
  const savings     = Math.floor(total * 0.05); // 5% mock savings

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <span style={s.headerTitle}>🛒 Your Cart</span>
        <span style={s.itemCount}>{cart.reduce((s,i)=>s+i.qty,0)} items</span>
      </div>

      <div style={s.body}>
        {/* LEFT — Cart items */}
        <div style={s.left}>

          {cart.length === 0 ? (
            <div style={s.emptyCart}>
              <div style={{fontSize:72,marginBottom:16}}>🛒</div>
              <div style={s.emptyTitle}>Your cart is empty</div>
              <div style={s.emptySub}>Go back and add some items!</div>
              <button style={s.goBackBtn} onClick={onBack}>Browse Products</button>
            </div>
          ) : (
            <>
              {/* Delivery info bar */}
              {shopInfo && (
                <div style={s.delivBar}>
                  <span style={s.delivIcon}>🛵</span>
                  <div>
                    <span style={s.delivText}>Delivering from <strong>{shopInfo.name}</strong></span>
                    <span style={s.delivTime}> · ~{shopInfo.deliveryMins} mins · ₹{shopInfo.deliveryFee} fee</span>
                  </div>
                </div>
              )}

              {/* Cart items */}
              <div style={s.cartSection}>
                <div style={s.sectionTitle}>Items in your cart</div>
                {cart.map(item => (
                  <div key={item.name} style={s.cartItem}>
                    <div style={s.cartEmoji}>{item.emoji || "🛍️"}</div>
                    <div style={s.cartInfo}>
                      <div style={s.cartName}>{item.name}</div>
                      <div style={s.cartMeta}>₹{item.price} per {item.unit || "item"}</div>
                    </div>
                    <div style={s.qtyControls}>
                      <button style={s.qtyBtn} onClick={() => updateQty(item.name, -1)}>−</button>
                      <span style={s.qtyNum}>{item.qty}</span>
                      <button style={s.qtyBtn} onClick={() => updateQty(item.name, +1)}>+</button>
                    </div>
                    <div style={s.cartItemTotal}>₹{item.price * item.qty}</div>
                    <button style={s.removeBtn} onClick={() => removeItem(item.name)}>🗑</button>
                  </div>
                ))}
              </div>

              {/* AI Suggestions */}
              <div style={s.sugSection}>
                <div style={s.sugHeader}>
                  <span style={s.sugTitle}>🤖 You might also need</span>
                  <span style={s.sugBadge}>AI Powered</span>
                </div>
                <div style={s.sugSub}>Based on what's in your cart</div>

                {loadingSug && (
                  <div style={s.sugLoading}>
                    <div style={s.spinner}/> AI is thinking of suggestions...
                  </div>
                )}

                {!loadingSug && suggestions.length > 0 && (
                  <div style={s.sugGrid}>
                    {suggestions.map((item, i) => (
                      <div key={i} style={s.sugCard}>
                        <div style={s.sugEmoji}>{item.emoji || "🛍️"}</div>
                        <div style={s.sugName}>{item.name}</div>
                        <div style={s.sugReason}>{item.reason}</div>
                        <div style={s.sugBottom}>
                          <span style={s.sugPrice}>₹{item.price}</span>
                          <button
                            style={{ ...s.sugAddBtn, ...(added[item.name] ? s.sugAddedBtn : {}) }}
                            onClick={() => addSuggestion(item)}>
                            {added[item.name] ? "✅ Added" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* People Also Buy Together */}
                {!loadingSug && bundles.length > 0 && (
                  <div style={s.bundleSection}>
                    <div style={s.sugHeader}>
                      <span style={s.sugTitle}>🛍️ People Also Buy Together</span>
                      <span style={s.sugBadge}>AI Powered</span>
                    </div>
                    <div style={s.bundleSub}>Classic combos customers love</div>
                    <div style={s.bundleGrid}>
                      {bundles.map((bundle, bi) => (
                        <div key={bi} style={s.bundleCard}>
                          <div style={s.bundleTop}>
                            <span style={s.bundleEmoji}>{bundle.emoji}</span>
                            <span style={s.bundleTitle}>{bundle.title}</span>
                          </div>
                          <div style={s.bundleItems}>
                            {bundle.items.map((item, ii) => (
                              <div key={ii} style={s.bundleItem}>
                                <span style={s.bundleItemEmoji}>{item.emoji}</span>
                                <div style={s.bundleItemInfo}>
                                  <div style={s.bundleItemName}>{item.name}</div>
                                  <div style={s.bundleItemPrice}>₹{item.price}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={s.bundleFooter}>
                            <span style={s.bundleTotal}>
                              Total: ₹{bundle.items.reduce((sum,i)=>sum+i.price,0)}
                            </span>
                            <button style={s.bundleAddBtn} onClick={() => {
                              bundle.items.forEach(item => addSuggestion(item));
                            }}>
                              + Add All
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT — Order summary */}
        {cart.length > 0 && (
          <div style={s.right}>
            <div style={s.summaryBox}>
              <div style={s.summaryTitle}>Order Summary</div>

              <div style={s.summaryRow}>
                <span>Subtotal ({cart.reduce((s,i)=>s+i.qty,0)} items)</span>
                <span>₹{subtotal}</span>
              </div>
              <div style={s.summaryRow}>
                <span>Delivery fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div style={{ ...s.summaryRow, color:"#16a34a" }}>
                <span>🎉 You save</span>
                <span>-₹{savings}</span>
              </div>
              <div style={s.summaryDivider}/>
              <div style={s.summaryTotal}>
                <span>Total</span>
                <span style={s.totalAmt}>₹{total - savings}</span>
              </div>

              {shopInfo && (
                <div style={s.etaBox}>
                  📍 Estimated delivery: <strong>{shopInfo.deliveryMins} mins</strong>
                </div>
              )}

              <button style={s.checkoutBtn} onClick={onCheckout}>
                Proceed to Pay ₹{total - savings} →
              </button>

              <button style={s.continueBtn} onClick={onBack}>
                + Continue Shopping
              </button>

              {/* Safety badges */}
              <div style={s.badges}>
                <span style={s.badge}>🔒 Secure Checkout</span>
                <span style={s.badge}>✅ 100% Authentic</span>
                <span style={s.badge}>🔄 Easy Returns</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:          { minHeight:"100vh", background:"#f5f5f5", fontFamily:"'Segoe UI',sans-serif" },
  header:        { background:"#1a1a1a", padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:16 },
  backBtn:       { background:"none", border:"none", color:"#f6a623", fontSize:15, cursor:"pointer", fontWeight:700 },
  headerTitle:   { flex:1, color:"#fff", fontSize:18, fontWeight:800 },
  itemCount:     { background:"#f6a62322", border:"1px solid #f6a62344", color:"#f6a623", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600 },
  body:          { display:"flex", gap:20, padding:20, maxWidth:1100, margin:"0 auto", alignItems:"flex-start" },
  left:          { flex:1 },
  emptyCart:     { background:"#fff", borderRadius:16, padding:"60px 20px", textAlign:"center" },
  emptyTitle:    { fontSize:22, fontWeight:800, color:"#1a1a1a", marginBottom:8 },
  emptySub:      { fontSize:15, color:"#888", marginBottom:24 },
  goBackBtn:     { padding:"12px 28px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:15, fontWeight:700, cursor:"pointer" },
  delivBar:      { background:"#fff8ee", border:"1px solid #f6a62333", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  delivIcon:     { fontSize:22 },
  delivText:     { fontSize:14, color:"#1a1a1a" },
  delivTime:     { fontSize:13, color:"#888" },
  cartSection:   { background:"#fff", borderRadius:16, padding:"16px 20px", marginBottom:16 },
  sectionTitle:  { fontSize:15, fontWeight:700, color:"#1a1a1a", marginBottom:14, paddingBottom:10, borderBottom:"1px solid #f0f0f0" },
  cartItem:      { display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #f9f9f9" },
  cartEmoji:     { fontSize:32, flexShrink:0 },
  cartInfo:      { flex:1 },
  cartName:      { fontSize:14, fontWeight:600, color:"#1a1a1a" },
  cartMeta:      { fontSize:12, color:"#aaa", marginTop:2 },
  qtyControls:   { display:"flex", alignItems:"center", gap:8 },
  qtyBtn:        { width:30, height:30, borderRadius:8, border:"1px solid #eee", background:"#fafafa", cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" },
  qtyNum:        { fontSize:15, fontWeight:700, width:24, textAlign:"center" },
  cartItemTotal: { fontSize:15, fontWeight:700, color:"#1a1a1a", minWidth:50, textAlign:"right" },
  removeBtn:     { background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#ddd" },
  sugSection:    { background:"#fff", borderRadius:16, padding:"16px 20px" },
  sugHeader:     { display:"flex", alignItems:"center", gap:10, marginBottom:4 },
  sugTitle:      { fontSize:15, fontWeight:700, color:"#1a1a1a" },
  sugBadge:      { background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20 },
  sugSub:        { fontSize:12, color:"#aaa", marginBottom:14 },
  sugLoading:    { display:"flex", alignItems:"center", gap:10, color:"#888", fontSize:13, padding:"16px 0" },
  spinner:       { width:18, height:18, border:"3px solid #eee", borderTopColor:"#f6a623", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  sugGrid:       { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 },
  sugCard:       { background:"#fafafa", border:"1px solid #eee", borderRadius:12, padding:14 },
  sugEmoji:      { fontSize:28, marginBottom:6 },
  sugName:       { fontSize:13, fontWeight:700, color:"#1a1a1a", marginBottom:4 },
  sugReason:     { fontSize:11, color:"#888", marginBottom:8, fontStyle:"italic" },
  sugBottom:     { display:"flex", justifyContent:"space-between", alignItems:"center" },
  sugPrice:      { fontSize:14, fontWeight:800, color:"#f6a623" },
  sugAddBtn:     { padding:"5px 12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:12, fontWeight:700, cursor:"pointer" },
  sugAddedBtn:   { background:"#dcfce7", color:"#16a34a" },
  right:         { width:300, flexShrink:0, position:"sticky", top:20 },
  summaryBox:    { background:"#fff", borderRadius:16, padding:20, boxShadow:"0 4px 20px #0001" },
  summaryTitle:  { fontSize:16, fontWeight:800, color:"#1a1a1a", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #f0f0f0" },
  summaryRow:    { display:"flex", justifyContent:"space-between", fontSize:14, color:"#555", marginBottom:10 },
  summaryDivider:{ borderTop:"1px solid #eee", margin:"10px 0" },
  summaryTotal:  { display:"flex", justifyContent:"space-between", fontSize:17, fontWeight:800, color:"#1a1a1a", marginBottom:14 },
  totalAmt:      { color:"#f6a623", fontSize:20 },
  etaBox:        { background:"#fff8ee", border:"1px solid #f6a62333", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#555", marginBottom:14 },
  checkoutBtn:   { width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:16, fontWeight:800, cursor:"pointer", marginBottom:10 },
  continueBtn:   { width:"100%", padding:"11px 0", borderRadius:12, border:"1.5px solid #eee", background:"#fff", color:"#555", fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:14 },
  badges:        { display:"flex", flexDirection:"column", gap:6 },
  badge:         { fontSize:12, color:"#888", textAlign:"center" },
  bundleSection: { background:"#fff", borderRadius:16, padding:"16px 20px", marginTop:16 },
  bundleSub:     { fontSize:12, color:"#aaa", marginBottom:14 },
  bundleGrid:    { display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 },
  bundleCard:    { background:"#fafafa", border:"1px solid #eee", borderRadius:14, padding:14 },
  bundleTop:     { display:"flex", alignItems:"center", gap:8, marginBottom:12 },
  bundleEmoji:   { fontSize:24 },
  bundleTitle:   { fontSize:14, fontWeight:700, color:"#1a1a1a" },
  bundleItems:   { display:"flex", flexDirection:"column", gap:8, marginBottom:12 },
  bundleItem:    { display:"flex", alignItems:"center", gap:8, padding:"8px", background:"#fff", borderRadius:8, border:"1px solid #f0f0f0" },
  bundleItemEmoji:{ fontSize:20 },
  bundleItemInfo:{ flex:1 },
  bundleItemName:{ fontSize:12, fontWeight:600, color:"#1a1a1a" },
  bundleItemPrice:{ fontSize:12, color:"#f6a623", fontWeight:700 },
  bundleFooter:  { display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:"1px solid #f0f0f0" },
  bundleTotal:   { fontSize:13, fontWeight:700, color:"#1a1a1a" },
  bundleAddBtn:  { padding:"7px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#f6a623,#f97316)", color:"#000", fontSize:12, fontWeight:700, cursor:"pointer" },
};