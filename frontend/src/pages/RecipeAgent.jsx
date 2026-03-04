import { useState } from "react";

const QUICK = [
  { label: "🍕 Pizza for 4",         query: "Make Pizza for 4 people"           },
  { label: "🍛 Dal Rice for 2",       query: "Make Dal Rice for 2 people"        },
  { label: "🥗 Salad for 3",          query: "Make healthy salad for 3 people"   },
  { label: "🍜 Maggi for 1",          query: "Make Maggi noodles for 1 person"   },
  { label: "🎂 Birthday Cake for 10", query: "Bake birthday cake for 10 people"  },
  { label: "🫖 Masala Chai for 5",    query: "Make masala chai for 5 people"     },
];

export default function RecipeAgent({ onAddToCart, onClose }) {
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");
  const [added,   setAdded]   = useState(false);

  async function handleSearch(q) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true); setResult(null); setError(""); setAdded(false);
    try {
      const res  = await fetch("http://localhost:5000/api/recipe/suggest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
      else setError(data.message || "Something went wrong.");
    } catch {
      setError("Cannot reach server. Is backend running?");
    }
    setLoading(false);
  }

  function handleAddAll() {
    if (!result) return;
    const itemsToAdd = result.matched
      .filter(m => m.product)
      .map(m => ({ ...m.product, qty: 1 }));
    onAddToCart(itemsToAdd);
    setAdded(true);
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>🤖 Recipe Agent</div>
            <div style={s.sub}>Tell me what you want to cook — I'll find all the ingredients</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search bar */}
        <div style={s.searchWrap}>
          <input
            style={s.searchInput}
            placeholder='e.g. "Make Pizza for 4 people" or "Dal rice for 2"'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <button style={s.searchBtn} onClick={() => handleSearch()} disabled={loading}>
            {loading ? "..." : "🔍"}
          </button>
        </div>

        {/* Quick suggestions */}
        {!result && !loading && (
          <div style={s.quickSection}>
            <div style={s.quickTitle}>✨ Quick Recipes</div>
            <div style={s.quickGrid}>
              {QUICK.map((q, i) => (
                <button key={i} style={s.quickBtn}
                  onClick={() => { setQuery(q.query); handleSearch(q.query); }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={s.loadingBox}>
            <div style={s.loadingSpinner}/>
            <div style={s.loadingText}>🤖 AI is finding ingredients...</div>
            <div style={s.loadingSub}>Analysing your recipe and matching to nearby inventory</div>
          </div>
        )}

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Result */}
        {result && !loading && (
          <div style={s.resultWrap}>

            {/* Recipe header */}
            <div style={s.recipeHeader}>
              <div style={s.recipeTitleRow}>
                <span style={s.recipeEmoji}>🍽️</span>
                <div>
                  <div style={s.recipeName}>{result.dish}</div>
                  <div style={s.recipeServings}>for {result.servings} {result.servings === 1 ? "person" : "people"}</div>
                </div>
              </div>
              <div style={s.recipeStats}>
                <span style={s.statPill}>🧾 {result.matched.length} ingredients</span>
                <span style={s.statPill}>
                  ✅ {result.matched.filter(m => m.product).length} matched
                </span>
                {result.matched.filter(m => !m.product).length > 0 && (
                  <span style={{ ...s.statPill, ...s.statMissing }}>
                    ❌ {result.matched.filter(m => !m.product).length} unavailable
                  </span>
                )}
              </div>
            </div>

            {/* Ingredient list */}
            <div style={s.ingredientList}>
              {result.matched.map((item, i) => (
                <div key={i} style={{ ...s.ingredientRow, ...(item.product ? {} : s.ingredientMissing) }}>
                  <div style={s.ingLeft}>
                    <div style={s.ingDot(!!item.product)}/>
                    <div>
                      <div style={s.ingName}>{item.ingredient}</div>
                      <div style={s.ingQty}>Needed: {item.quantity}</div>
                    </div>
                  </div>
                  <div style={s.ingRight}>
                    {item.product ? (
                      <div style={s.productMatch}>
                        <span style={s.productName}>{item.product.name}</span>
                        <span style={s.productPrice}>₹{item.product.price}</span>
                      </div>
                    ) : (
                      <span style={s.notAvailable}>Not in stock</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={s.totalRow}>
              <span style={s.totalLabel}>Estimated Total</span>
              <span style={s.totalAmt}>
                ₹{result.matched.filter(m => m.product).reduce((s, m) => s + m.product.price, 0)}
              </span>
            </div>

            {/* Add to cart button */}
            {!added ? (
              <button style={s.addAllBtn} onClick={handleAddAll}>
                🛒 Add All {result.matched.filter(m => m.product).length} Items to Cart
              </button>
            ) : (
              <div style={s.addedBox}>
                <div style={s.addedTitle}>✅ All ingredients added to cart!</div>
                <div style={s.addedBtns}>
                  <button style={s.tryAnotherBtn} onClick={() => { setResult(null); setQuery(""); setAdded(false); }}>
                    🔄 Try Another Recipe
                  </button>
                  <button style={s.goCartBtn} onClick={onClose}>
                    🛒 Go to Cart
                  </button>
                </div>
              </div>
            )}

            {/* Try another */}
            {!added && (
              <button style={s.tryAnotherBtn2} onClick={() => { setResult(null); setQuery(""); }}>
                ← Try another recipe
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:          { position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16 },
  modal:            { background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px #0005" },
  header:           { display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"24px 24px 0" },
  title:            { fontSize:20,fontWeight:800,color:"#1a1a1a" },
  sub:              { fontSize:13,color:"#888",marginTop:4 },
  closeBtn:         { background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa",flexShrink:0 },
  searchWrap:       { display:"flex",gap:8,padding:"16px 24px 0" },
  searchInput:      { flex:1,padding:"12px 16px",borderRadius:12,border:"2px solid #f6a623",fontSize:14,outline:"none",background:"#fffdf7" },
  searchBtn:        { padding:"12px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontSize:18,cursor:"pointer",fontWeight:700 },
  quickSection:     { padding:"16px 24px" },
  quickTitle:       { fontSize:13,fontWeight:700,color:"#888",marginBottom:10 },
  quickGrid:        { display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8 },
  quickBtn:         { padding:"10px 14px",borderRadius:10,border:"1px solid #eee",background:"#fafafa",cursor:"pointer",fontSize:13,fontWeight:600,color:"#333",textAlign:"left" },
  loadingBox:       { display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 24px",textAlign:"center" },
  loadingSpinner:   { width:48,height:48,border:"4px solid #eee",borderTopColor:"#f6a623",borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:16 },
  loadingText:      { fontSize:16,fontWeight:700,color:"#1a1a1a",marginBottom:6 },
  loadingSub:       { fontSize:13,color:"#888" },
  errorBox:         { margin:"16px 24px",background:"#fff5f5",border:"1px solid #fecaca",color:"#dc2626",borderRadius:10,padding:"12px 16px",fontSize:13 },
  resultWrap:       { padding:"16px 24px 24px" },
  recipeHeader:     { background:"linear-gradient(135deg,#fff8ee,#fff3dc)",border:"1px solid #f6a62333",borderRadius:14,padding:"16px",marginBottom:16 },
  recipeTitleRow:   { display:"flex",alignItems:"center",gap:12,marginBottom:10 },
  recipeEmoji:      { fontSize:36 },
  recipeName:       { fontSize:20,fontWeight:800,color:"#1a1a1a" },
  recipeServings:   { fontSize:13,color:"#888",marginTop:2 },
  recipeStats:      { display:"flex",gap:8,flexWrap:"wrap" },
  statPill:         { padding:"4px 12px",borderRadius:20,background:"#fff",border:"1px solid #f6a62333",fontSize:12,fontWeight:600,color:"#f6a623" },
  statMissing:      { background:"#fff5f5",border:"1px solid #fecaca",color:"#dc2626" },
  ingredientList:   { display:"flex",flexDirection:"column",gap:8,marginBottom:16 },
  ingredientRow:    { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"#f9fafb",borderRadius:10,border:"1px solid #eee" },
  ingredientMissing:{ background:"#fff9f9",border:"1px solid #fecaca" },
  ingLeft:          { display:"flex",alignItems:"center",gap:10 },
  ingDot:           (ok) => ({ width:10,height:10,borderRadius:"50%",background:ok?"#16a34a":"#e5e7eb",flexShrink:0 }),
  ingName:          { fontSize:14,fontWeight:600,color:"#1a1a1a" },
  ingQty:           { fontSize:12,color:"#888",marginTop:2 },
  ingRight:         { textAlign:"right" },
  productMatch:     { display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 },
  productName:      { fontSize:12,color:"#555" },
  productPrice:     { fontSize:14,fontWeight:700,color:"#f6a623" },
  notAvailable:     { fontSize:12,color:"#dc2626",fontStyle:"italic" },
  totalRow:         { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"#1a1a1a",borderRadius:10,marginBottom:14 },
  totalLabel:       { fontSize:14,color:"#aaa",fontWeight:600 },
  totalAmt:         { fontSize:20,fontWeight:800,color:"#f6a623" },
  addAllBtn:        { width:"100%",padding:"15px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontSize:16,fontWeight:800,cursor:"pointer",marginBottom:10 },
  addedBox:         { background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"16px",marginBottom:10,textAlign:"center" },
  addedTitle:       { fontSize:16,fontWeight:700,color:"#15803d",marginBottom:12 },
  addedBtns:        { display:"flex",gap:10 },
  tryAnotherBtn:    { flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #16a34a",background:"#fff",color:"#16a34a",fontSize:13,fontWeight:700,cursor:"pointer" },
  goCartBtn:        { flex:1,padding:"10px 0",borderRadius:10,border:"none",background:"#1a1a1a",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" },
  tryAnotherBtn2:   { width:"100%",padding:"10px 0",borderRadius:10,border:"1px solid #eee",background:"#fafafa",color:"#888",fontSize:13,cursor:"pointer",marginTop:4 },
};