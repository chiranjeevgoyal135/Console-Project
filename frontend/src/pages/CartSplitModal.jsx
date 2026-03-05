// CartSplitModal.jsx
// Shows the smart cart split plan before checkout
// Buyer sees exactly which shop delivers which items, and when

import { useState, useEffect } from "react";

export default function CartSplitModal({ cart, shopInfo, allShops, onClose, onConfirm }) {
  const [loading,   setLoading]   = useState(true);
  const [splitPlan, setSplitPlan] = useState(null);
  const [error,     setError]     = useState("");
  const [step,      setStep]      = useState("loading"); // loading | plan | confirm

  useEffect(() => { computeSplit(); }, []);

  async function computeSplit() {
    setLoading(true);
    try {
      // Fetch inventories for all shops in parallel
      const invResults = await Promise.all(
        allShops.map(shop =>
          fetch(`http://localhost:5000/api/shop-inventory/${shop.id}?shopName=${encodeURIComponent(shop.name)}`)
            .then(r => r.json())
            .then(d => ({ shopId: shop.id, inventory: d.inventory || [] }))
            .catch(() => ({ shopId: shop.id, inventory: [] }))
        )
      );

      const shopInventories = {};
      invResults.forEach(({ shopId, inventory }) => { shopInventories[shopId] = inventory; });

      // Run split algorithm
      const res  = await fetch("http://localhost:5000/api/cart-split", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems:       cart,
          userLat:         shopInfo?.lat  || 28.6,
          userLng:         shopInfo?.lng  || 77.2,
          shops:           allShops,
          shopInventories,
        }),
      });
      const data = await res.json();
      if (data.success) { setSplitPlan(data); setStep("plan"); }
      else setError(data.message || "Split failed");
    } catch(e) {
      setError("Cannot reach server: " + e.message);
    }
    setLoading(false);
  }

  const subtotal  = cart.reduce((s,i) => s + i.price*i.qty, 0);
  const totalFees = splitPlan?.summary?.totalFee || 0;
  const total     = subtotal + totalFees;

  return (
    <div style={s.overlay} onClick={e => e.target===e.currentTarget && step!=="loading" && onClose()}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>🧠 Smart Order Routing</div>
            <div style={s.sub}>Finding the fastest way to deliver everything to you</div>
          </div>
          {step !== "loading" && <button style={s.closeBtn} onClick={onClose}>✕</button>}
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div style={s.centre}>
            <div style={s.bigSpinner}/>
            <div style={s.loadTitle}>Analysing {cart.length} items across {allShops.length} nearby shops...</div>
            <div style={s.loadSteps}>
              {["Fetching shop inventories","Matching items to shops","Running Set Cover algorithm","Optimising delivery routes"].map((t,i) => (
                <div key={i} style={s.loadStep}>
                  <div style={s.loadStepDot}/> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div style={s.errBox}>{error}</div>}

        {/* Split Plan */}
        {step === "plan" && splitPlan && (
          <>
            {/* Summary bar */}
            <div style={s.summaryBar}>
              <div style={s.summaryItem}>
                <span style={s.summaryVal}>{splitPlan.summary.totalShops}</span>
                <span style={s.summaryLbl}>{splitPlan.summary.totalShops===1 ? "Shop" : "Shops"}</span>
              </div>
              <div style={s.summaryDivider}/>
              <div style={s.summaryItem}>
                <span style={s.summaryVal}>{splitPlan.summary.totalItems}</span>
                <span style={s.summaryLbl}>Items Found</span>
              </div>
              <div style={s.summaryDivider}/>
              <div style={s.summaryItem}>
                <span style={s.summaryVal}>{splitPlan.summary.maxDeliveryMins}m</span>
                <span style={s.summaryLbl}>Max Wait</span>
              </div>
              <div style={s.summaryDivider}/>
              <div style={s.summaryItem}>
                <span style={s.summaryVal}>₹{totalFees}</span>
                <span style={s.summaryLbl}>Delivery Fees</span>
              </div>
            </div>

            {/* Algorithm badge */}
            <div style={s.algoBadge}>
              🔬 Algorithm: <strong>Greedy Set Cover + AI Shop Generation</strong> — all {splitPlan.summary.totalItems} items covered across {splitPlan.summary.totalShops} shop(s)
            </div>

            {/* Shop cards */}
            <div style={s.shopsWrap}>
              {splitPlan.splitPlan.map((shopSplit, si) => (
                <div key={si} style={s.shopCard}>
                  <div style={s.shopCardHeader}>
                    <div style={s.shopNum}>{si+1}</div>
                    <div style={s.shopInfo}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={s.shopName}>{shopSplit.shopName}</div>
                      {shopSplit.isAiGenerated && <span style={s.newShopBadge}>✨ New Shop Found!</span>}
                    </div>
                      <div style={s.shopMeta}>
                        📍 {shopSplit.distanceKm}km away · 🛵 ~{shopSplit.deliveryMins} mins · ₹{shopSplit.deliveryFee} fee
                      </div>
                    </div>
                    <div style={s.shopEta}>
                      <div style={s.etaTime}>{shopSplit.deliveryMins}m</div>
                      <div style={s.etaLbl}>ETA</div>
                    </div>
                  </div>

                  {/* Items from this shop */}
                  <div style={s.itemsList}>
                    {shopSplit.items.map((item, ii) => (
                      <div key={ii} style={s.itemRow}>
                        <span style={s.itemEmoji}>{item.cartItem?.emoji || "🛍️"}</span>
                        <div style={s.itemInfo}>
                          <div style={s.itemCartName}>{item.cartItemName}</div>
                          <div style={s.itemMatchName}>→ {item.product.name}</div>
                        </div>
                        <div style={s.itemRight}>
                          <span style={s.matchScore}>{Math.round(item.score*100)}% match</span>
                          <span style={s.itemPrice}>₹{item.product.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={s.shopSubtotal}>
                    Subtotal from {shopSplit.shopName.split(" ").slice(0,2).join(" ")}: ₹{shopSplit.items.reduce((s,i)=>s+i.product.price*(i.cartItem?.qty||1),0)} + ₹{shopSplit.deliveryFee} delivery
                  </div>
                </div>
              ))}
            </div>



            {/* Delivery timeline */}
            <div style={s.timeline}>
              <div style={s.timelineTitle}>📦 Delivery Timeline</div>
              {splitPlan.splitPlan.sort((a,b)=>a.deliveryMins-b.deliveryMins).map((sp,i)=>(
                <div key={i} style={s.timelineRow}>
                  <div style={s.timelineDot}/>
                  <div style={s.timelineContent}>
                    <span style={s.timelineTime}>~{sp.deliveryMins} mins</span>
                    <span style={s.timelineShop}>{sp.shopName} · {sp.items.length} item(s)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div style={s.priceBox}>
              <div style={s.priceRow}><span>Items subtotal</span><span>₹{subtotal}</span></div>
              <div style={s.priceRow}><span>Delivery ({splitPlan.summary.totalShops} shops)</span><span>₹{totalFees}</span></div>
              <div style={{...s.priceRow,...s.priceTotalRow}}>
                <span>Total</span><span style={{color:"#f6a623",fontSize:18}}>₹{total}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={s.actions}>
              <button style={s.cancelBtn} onClick={onClose}>← Change Cart</button>
              <button style={s.confirmBtn} onClick={() => onConfirm(splitPlan)}>
                Confirm & Pay ₹{total} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:       {position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  modal:         {background:"#fff",borderRadius:20,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 25px 60px #0006"},
  header:        {display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"20px 24px 0"},
  title:         {fontSize:19,fontWeight:800,color:"#1a1a1a"},
  sub:           {fontSize:13,color:"#888",marginTop:3},
  closeBtn:      {background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa",flexShrink:0},
  centre:        {display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 24px",textAlign:"center"},
  bigSpinner:    {width:56,height:56,border:"5px solid #eee",borderTopColor:"#f6a623",borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:20},
  loadTitle:     {fontSize:16,fontWeight:700,color:"#1a1a1a",marginBottom:20},
  loadSteps:     {display:"flex",flexDirection:"column",gap:10,textAlign:"left",width:"100%",maxWidth:320},
  loadStep:      {display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#555"},
  loadStepDot:   {width:8,height:8,background:"#f6a623",borderRadius:"50%",flexShrink:0,animation:"pulse 1s infinite"},
  errBox:        {margin:"16px 24px",background:"#fff5f5",border:"1px solid #fecaca",color:"#dc2626",borderRadius:10,padding:"12px 16px",fontSize:13},
  summaryBar:    {display:"flex",justifyContent:"space-around",background:"#1a1a1a",margin:"16px 24px 0",borderRadius:14,padding:"14px 0"},
  summaryItem:   {textAlign:"center"},
  summaryVal:    {display:"block",fontSize:22,fontWeight:800,color:"#f6a623"},
  summaryLbl:    {display:"block",fontSize:11,color:"#aaa",marginTop:2},
  summaryDivider:{width:1,background:"#333"},
  algoBadge:     {margin:"12px 24px 0",padding:"8px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,fontSize:12,color:"#15803d"},
  shopsWrap:     {padding:"14px 24px 0",display:"flex",flexDirection:"column",gap:12},
  shopCard:      {border:"1.5px solid #eee",borderRadius:14,overflow:"hidden"},
  shopCardHeader:{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"#f9fafb",borderBottom:"1px solid #eee"},
  shopNum:       {width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  shopInfo:      {flex:1},
  shopName:      {fontSize:14,fontWeight:700,color:"#1a1a1a"},
  shopMeta:      {fontSize:12,color:"#888",marginTop:2},
  shopEta:       {textAlign:"center"},
  etaTime:       {fontSize:20,fontWeight:800,color:"#f6a623"},
  etaLbl:        {fontSize:10,color:"#aaa"},
  itemsList:     {padding:"10px 16px",display:"flex",flexDirection:"column",gap:8},
  itemRow:       {display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#fafafa",borderRadius:8},
  itemEmoji:     {fontSize:22,flexShrink:0},
  itemInfo:      {flex:1},
  itemCartName:  {fontSize:13,fontWeight:600,color:"#1a1a1a"},
  itemMatchName: {fontSize:11,color:"#888",marginTop:1},
  itemRight:     {display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2},
  matchScore:    {fontSize:10,color:"#16a34a",background:"#dcfce7",padding:"1px 6px",borderRadius:10,fontWeight:600},
  itemPrice:     {fontSize:13,fontWeight:700,color:"#f6a623"},
  shopSubtotal:  {padding:"8px 16px",background:"#f9fafb",borderTop:"1px solid #eee",fontSize:12,color:"#888"},
  timeline:      {margin:"12px 24px 0",background:"#f9fafb",borderRadius:12,padding:"14px 16px"},
  timelineTitle: {fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:12},
  timelineRow:   {display:"flex",alignItems:"center",gap:10,marginBottom:10},
  timelineDot:   {width:10,height:10,background:"#f6a623",borderRadius:"50%",flexShrink:0},
  timelineContent:{display:"flex",gap:10,alignItems:"center"},
  timelineTime:  {fontSize:13,fontWeight:700,color:"#f6a623",minWidth:55},
  timelineShop:  {fontSize:13,color:"#555"},
  priceBox:      {margin:"12px 24px 0",background:"#f9fafb",borderRadius:12,padding:"14px 16px"},
  priceRow:      {display:"flex",justifyContent:"space-between",fontSize:14,color:"#555",marginBottom:8},
  priceTotalRow: {borderTop:"1px solid #eee",paddingTop:8,fontSize:16,fontWeight:700,color:"#1a1a1a"},
  actions:       {display:"flex",gap:12,padding:"16px 24px 24px"},
  cancelBtn:     {flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid #eee",background:"#fff",color:"#555",fontSize:14,fontWeight:600,cursor:"pointer"},
  newShopBadge: {background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,whiteSpace:"nowrap"},
  confirmBtn:    {flex:2,padding:"13px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f6a623,#f97316)",color:"#000",fontSize:15,fontWeight:800,cursor:"pointer"},
};