import { useState, useEffect } from "react";

const EMOJI_MAP = {
  Dairy:"🥛", Grains:"🌾", Snacks:"🍿", Beverages:"☕",
  Personal:"🧴", Oils:"🫙", Veggies:"🥬", Health:"🍯",
  Drinks:"🥥", Bakery:"🍞",
};

export default function ProductModal({ product, onClose, onAddToCart }) {
  const [similar,    setSimilar]    = useState([]);
  const [boughtWith, setBoughtWith] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [source,     setSource]     = useState("");
  const [added,      setAdded]      = useState({});

  const emoji = EMOJI_MAP[product.category] || "🛍️";
  // Products from Groq/recipe won't have a barcode — use category fallback directly
  const hasBarcode = !!product.barcode;

  useEffect(() => {
    if (!hasBarcode) {
      // No barcode — build fallback suggestions client-side
      setSource("catalog");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`http://localhost:5000/api/similar/${product.barcode}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSimilar(data.similar    || []);
          setBoughtWith(data.boughtWith || []);
          setSource(data.source);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [product.barcode]);

  function handleAdd(e, item) {
    e.stopPropagation();
    onAddToCart(item);
    setAdded(prev => ({ ...prev, [item.barcode || item.name]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [item.barcode || item.name]: false })), 1500);
  }

  const stockNum = typeof product.stock === "number" ? product.stock : undefined;

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        <div style={s.header}>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroEmoji}>{emoji}</div>
          <div style={s.heroInfo}>
            <div style={s.heroName}>{product.name}</div>
            <div style={s.heroMeta}>
              {product.category && `${product.category} · `}₹{product.price}{product.unit ? `/${product.unit}` : ""}
            </div>
            {stockNum !== undefined && (
              <div style={{...s.stockBadge,...(stockNum===0?s.stockOut:stockNum<=10?s.stockLow:s.stockOk)}}>
                {stockNum===0 ? "❌ Out of Stock" : stockNum<=10 ? `⚠️ Only ${stockNum} left` : `✅ ${stockNum} in stock`}
              </div>
            )}
          </div>
          <button
            style={{...s.addBtn,...(stockNum===0?s.addBtnDisabled:{})}}
            onClick={e => stockNum!==0 && handleAdd(e, product)}
            disabled={stockNum===0}>
            {added[product.barcode||product.name] ? "✅ Added!" : stockNum===0 ? "Out of Stock" : "+ Add to Cart"}
          </button>
        </div>

        {/* Source badge — only show if connected to Neo4j */}
        {source === "neo4j" && (
          <div style={s.sourceBadge}>🔗 Powered by Neo4j Graph Database</div>
        )}

        {loading && (
          <div style={s.loadingRow}><div style={s.spinner}/> Loading suggestions...</div>
        )}

        {!loading && (similar.length > 0 || boughtWith.length > 0) && (
          <>
            {similar.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionIcon}>🔁</span>
                  <div>
                    <div style={s.sectionTitle}>Similar Products</div>
                    <div style={s.sectionSub}>
                      {stockNum===0 ? "This item is out of stock — try these instead" : "Other options in this category"}
                    </div>
                  </div>
                </div>
                <div style={s.grid}>
                  {similar.map(item => (
                    <Card key={item.barcode||item.name} item={item} added={added[item.barcode||item.name]} onAdd={e=>handleAdd(e,item)}/>
                  ))}
                </div>
              </div>
            )}
            {boughtWith.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionIcon}>🛒</span>
                  <div>
                    <div style={s.sectionTitle}>Frequently Bought Together</div>
                    <div style={s.sectionSub}>Customers who bought this also bought</div>
                  </div>
                </div>
                <div style={s.grid}>
                  {boughtWith.map(item => (
                    <Card key={item.barcode||item.name} item={item} added={added[item.barcode||item.name]} onAdd={e=>handleAdd(e,item)}/>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && similar.length===0 && boughtWith.length===0 && hasBarcode && (
          <div style={s.empty}>No suggestions available for this product yet.</div>
        )}

        {!hasBarcode && (
          <div style={s.empty}>This is an AI-suggested item. Search for it to see related products.</div>
        )}
      </div>
    </div>
  );
}

function Card({ item, added, onAdd }) {
  const emoji = EMOJI_MAP[item.category] || "🛍️";
  const out   = item.stock === 0;
  return (
    <div style={c.card}>
      <div style={c.emoji}>{emoji}</div>
      <div style={c.name}>{item.name}</div>
      <div style={c.cat}>{item.category}</div>
      <div style={c.bottom}>
        <span style={c.price}>₹{item.price}</span>
        <button
          style={{...c.btn,...(out?c.btnOut:added?c.btnDone:{})}}
          onClick={onAdd} disabled={out}>
          {out ? "Out" : added ? "✅" : "+ Add"}
        </button>
      </div>
    </div>
  );
}

const s = {
  overlay:    {position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  modal:      {background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px #0005"},
  header:     {display:"flex",justifyContent:"flex-end",padding:"14px 14px 0"},
  closeBtn:   {background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa"},
  hero:       {display:"flex",alignItems:"center",gap:14,padding:"0 20px 16px",borderBottom:"1px solid #f0f0f0"},
  heroEmoji:  {fontSize:52,lineHeight:1,flexShrink:0},
  heroInfo:   {flex:1},
  heroName:   {fontSize:17,fontWeight:800,color:"#1a1a1a",marginBottom:4},
  heroMeta:   {fontSize:13,color:"#888",marginBottom:8},
  stockBadge: {display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600},
  stockOk:    {background:"#dcfce7",color:"#16a34a"},
  stockLow:   {background:"#fef9c3",color:"#ca8a04"},
  stockOut:   {background:"#fee2e2",color:"#dc2626"},
  addBtn:     {padding:"10px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},
  addBtnDisabled:{background:"#eee",color:"#aaa",cursor:"not-allowed"},
  sourceBadge:{margin:"12px 20px 0",padding:"7px 14px",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,fontSize:12,color:"#0369a1",fontWeight:600},
  loadingRow: {display:"flex",alignItems:"center",gap:10,padding:"24px 20px",color:"#888",fontSize:14},
  spinner:    {width:20,height:20,border:"3px solid #eee",borderTopColor:"#f6a623",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  section:    {padding:"16px 20px 0"},
  sectionHead:{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12},
  sectionIcon:{fontSize:22},
  sectionTitle:{fontSize:15,fontWeight:700,color:"#1a1a1a"},
  sectionSub: {fontSize:12,color:"#888",marginTop:2},
  grid:       {display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,paddingBottom:16},
  empty:      {padding:"30px 20px",textAlign:"center",color:"#aaa",fontSize:14},
};
const c = {
  card:   {background:"#fafafa",border:"1px solid #eee",borderRadius:12,padding:14},
  emoji:  {fontSize:28,marginBottom:8},
  name:   {fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:2},
  cat:    {fontSize:11,color:"#aaa",marginBottom:8},
  bottom: {display:"flex",justifyContent:"space-between",alignItems:"center"},
  price:  {fontSize:15,fontWeight:800,color:"#f6a623"},
  btn:    {padding:"5px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"},
  btnOut: {background:"#eee",color:"#aaa",cursor:"not-allowed"},
  btnDone:{background:"#dcfce7",color:"#16a34a"},
};