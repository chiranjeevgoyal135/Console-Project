import { useState, useEffect, useRef } from "react";

const CAT_EMOJI = { Dairy:"🥛",Biscuits:"🍪",Snacks:"🍿",Beverages:"☕",Grains:"🌾",Oils:"🫙",Health:"🍯",Personal:"🧴",Veggies:"🥬",Bakery:"🍞",General:"🛍️" };

export default function Storeboard({ user, onLogout }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulse,   setPulse]   = useState(false);
  const [secsSince, setSecsSince] = useState(0);
  const timerRef  = useRef(null);
  const pulseRef  = useRef(null);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, 7000);
    return () => { clearInterval(timerRef.current); clearInterval(pulseRef.current); };
  }, []);

  // Tick counter so user sees "updated X secs ago"
  useEffect(() => {
    pulseRef.current = setInterval(() => setSecsSince(s => s + 1), 1000);
    return () => clearInterval(pulseRef.current);
  }, []);

  async function fetchData() {
    try {
      const res  = await fetch("http://localhost:5000/api/analytics/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setSecsSince(0);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return (
    <div style={s.page}>
      <div style={s.hdr}><span style={s.logo}>⚡ SmarterBlinkit</span><div style={s.ownerBadge}>👑 Owner</div></div>
      <div style={s.centreLoad}><div style={s.spinner}/><p style={{color:"#888"}}>Loading live data...</p></div>
    </div>
  );

  const d = data;

  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.hdr}>
        <div style={s.hdrLeft}>
          <span style={s.logo}>⚡ SmarterBlinkit</span>
          <div style={s.ownerBadge}>👑 Owner Dashboard</div>
          <div style={s.livePill}>
            <span style={{...s.liveDot, boxShadow: pulse?"0 0 10px #22c55e":"0 0 4px #22c55e"}}/>
            LIVE · updated {secsSince}s ago
          </div>
        </div>
        <div style={s.hdrRight}>
          <span style={s.uname}>👤 {user.name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={s.body}>
        {/* ── STAT CARDS ── */}
        <div style={s.statsRow}>
          {[
            { icon:"💰", label:"Revenue (1h)",   val:`₹${(d.summary.totalRevenue1h||0).toLocaleString()}`,  color:"#f6a623" },
            { icon:"📦", label:"Orders (1h)",    val: d.summary.totalOrders1h,                              color:"#3b82f6" },
            { icon:"💵", label:"Revenue (24h)",  val:`₹${(d.summary.allRevenue24h||0).toLocaleString()}`,  color:"#22c55e" },
            { icon:"🏪", label:"Active Shops",   val:`${d.summary.activeShops} / ${d.summary.totalShops}`, color:"#a855f7" },
          ].map((c,i) => (
            <div key={i} style={{...s.statCard, borderTop:`3px solid ${c.color}`}}>
              <div style={{...s.statIcon, background:c.color+"22", color:c.color}}>{c.icon}</div>
              <div>
                <div style={{...s.statVal, color:c.color}}>{c.val}</div>
                <div style={s.statLbl}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={s.grid}>
          {/* LEFT */}
          <div style={s.col}>

            {/* ── FASTEST SELLING ── */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <div>
                  <div style={s.cardTitle}>🔥 Fastest Selling Right Now</div>
                  <div style={s.cardSub}>Last 1 hour · by units sold</div>
                </div>
                <span style={s.liveTag}>LIVE</span>
              </div>
              {(d.topProducts||[]).map((p,i) => {
                const pct = Math.round((p.unitsSold / (d.topProducts[0]?.unitsSold||1)) * 100);
                return (
                  <div key={i} style={s.prodRow}>
                    <div style={s.prodRank}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                    <span style={s.prodEmoji}>{p.emoji||CAT_EMOJI[p.category]||"🛍️"}</span>
                    <div style={s.prodInfo}>
                      <div style={s.prodName}>{p.name}</div>
                      <div style={s.prodMeta}>{p.category} · ₹{p.price}</div>
                      <div style={s.barBg}>
                        <div style={{...s.barFill, width:`${pct}%`, background:i<3?"linear-gradient(90deg,#f6a623,#f97316)":"#334155"}}/>
                      </div>
                    </div>
                    <div style={s.prodRight}>
                      <div style={s.prodUnits}>{p.unitsSold}</div>
                      <div style={s.prodUnitLbl}>sold</div>
                      <div style={s.prodRev}>₹{(p.revenue||0).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── TREND CHART ── */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <div>
                  <div style={s.cardTitle}>📈 Order Trend</div>
                  <div style={s.cardSub}>Last 2 hours in 15-min buckets</div>
                </div>
              </div>
              <div style={s.chart}>
                {(d.trend||[]).map((b,i) => {
                  const maxO = Math.max(...(d.trend||[]).map(x=>x.orders),1);
                  const h    = Math.max(6, Math.round((b.orders/maxO)*110));
                  const isNow = i===d.trend.length-1;
                  return (
                    <div key={i} style={s.chartCol}>
                      <div style={s.chartVal}>{b.orders}</div>
                      <div style={{...s.chartBar, height:h, background: isNow?"linear-gradient(180deg,#f6a623,#f97316)":"#1e293b", border: isNow?"1px solid #f6a62366":"1px solid #334155"}}/>
                      <div style={s.chartLbl}>{b.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div style={s.col}>

            {/* ── TOP RATED SHOPS ── */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <div>
                  <div style={s.cardTitle}>⭐ Top Rated Shops in India</div>
                  <div style={s.cardSub}>Ranked by average customer rating</div>
                </div>
              </div>
              {(d.topShops||[]).map((shop,i) => {
                const stars = Math.round(parseFloat(shop.avgRating));
                return (
                  <div key={i} style={s.shopRow}>
                    <div style={s.shopRankNum}>{i===0?"🏆":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                    <div style={s.shopInfo}>
                      <div style={s.shopName}>{shop.shopName}</div>
                      <div style={s.shopMeta}>
                        📍{shop.city} · {shop.totalRatings} ratings · {shop.orders} orders
                      </div>
                      <div style={s.shopStars}>
                        {"★".repeat(stars)}<span style={{color:"#334155"}}>{"★".repeat(5-stars)}</span>
                      </div>
                    </div>
                    <div style={s.shopRatingBubble}>
                      <div style={s.ratingNum}>{shop.avgRating}</div>
                      <div style={s.ratingLbl}>/ 5.0</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── LIVE FEED ── */}
            <div style={s.card}>
              <div style={s.cardHdr}>
                <div>
                  <div style={s.cardTitle}>⚡ Live Order Feed</div>
                  <div style={s.cardSub}>Orders happening right now</div>
                </div>
                <span style={s.liveTag}>LIVE</span>
              </div>
              <div style={s.feed}>
                {(d.liveFeed||[]).map((f,i) => (
                  <div key={i} style={{...s.feedRow, opacity: i===0?1: Math.max(0.4, 1-i*0.07)}}>
                    <span style={s.feedEmoji}>{f.emoji}</span>
                    <div style={s.feedInfo}>
                      <span style={s.feedProduct}>{f.productName}</span>
                      <span style={s.feedShop}> from {f.shopName}</span>
                    </div>
                    <div style={s.feedRight}>
                      <div style={s.feedPrice}>₹{f.price * f.qty}</div>
                      <div style={s.feedTime}>{f.secsAgo < 60 ? `${f.secsAgo}s ago` : `${Math.floor(f.secsAgo/60)}m ago`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── CATEGORY BREAKDOWN (full width) ── */}
        <div style={s.card}>
          <div style={s.cardHdr}>
            <div>
              <div style={s.cardTitle}>📊 Category Performance (Last 1 Hour)</div>
              <div style={s.cardSub}>Units sold across all shops</div>
            </div>
          </div>
          <div style={s.catGrid}>
            {(d.categoryBreakdown||[]).map((c,i) => {
              const maxU = d.categoryBreakdown[0]?.units||1;
              return (
                <div key={i} style={s.catCard}>
                  <div style={s.catEmoji}>{CAT_EMOJI[c.category]||"🛍️"}</div>
                  <div style={s.catName}>{c.category}</div>
                  <div style={s.catBarH}>
                    <div style={{...s.catBarFill, width:`${(c.units/maxU)*100}%`}}/>
                  </div>
                  <div style={s.catUnits}>{c.units} units</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

const s = {
  page:         { minHeight:"100vh", background:"#0a0f1e", fontFamily:"'Segoe UI',sans-serif", color:"#fff" },
  hdr:          { background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 },
  hdrLeft:      { display:"flex", alignItems:"center", gap:14 },
  logo:         { fontWeight:800, fontSize:18, color:"#fff" },
  ownerBadge:   { background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 },
  livePill:     { display:"flex", alignItems:"center", gap:6, background:"#0f2a1a", border:"1px solid #166534", borderRadius:20, padding:"3px 12px", fontSize:11, color:"#22c55e" },
  liveDot:      { width:7, height:7, background:"#22c55e", borderRadius:"50%", display:"inline-block", transition:"box-shadow 0.3s" },
  hdrRight:     { display:"flex", alignItems:"center", gap:12 },
  uname:        { fontSize:13, color:"#64748b" },
  logoutBtn:    { padding:"5px 14px", borderRadius:8, border:"1px solid #1e293b", background:"transparent", cursor:"pointer", fontSize:13, color:"#94a3b8" },
  centreLoad:   { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh" },
  spinner:      { width:48, height:48, border:"4px solid #1e293b", borderTopColor:"#f6a623", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  body:         { padding:20, maxWidth:1400, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 },
  statsRow:     { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 },
  statCard:     { background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 },
  statIcon:     { width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  statVal:      { fontSize:24, fontWeight:800 },
  statLbl:      { fontSize:12, color:"#64748b", marginTop:2 },
  grid:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  col:          { display:"flex", flexDirection:"column", gap:16 },
  card:         { background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20 },
  cardHdr:      { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  cardTitle:    { fontSize:15, fontWeight:700, color:"#f1f5f9" },
  cardSub:      { fontSize:12, color:"#475569", marginTop:3 },
  liveTag:      { background:"#052e16", border:"1px solid #166534", color:"#22c55e", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:6, letterSpacing:1 },
  prodRow:      { display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #1e293b" },
  prodRank:     { fontSize:18, width:28, textAlign:"center", flexShrink:0 },
  prodEmoji:    { fontSize:24, flexShrink:0 },
  prodInfo:     { flex:1 },
  prodName:     { fontSize:13, fontWeight:600, color:"#e2e8f0" },
  prodMeta:     { fontSize:11, color:"#475569", marginBottom:4 },
  barBg:        { height:4, background:"#1e293b", borderRadius:2, overflow:"hidden" },
  barFill:      { height:"100%", borderRadius:2, transition:"width 0.8s ease" },
  prodRight:    { textAlign:"right", flexShrink:0 },
  prodUnits:    { fontSize:20, fontWeight:800, color:"#f6a623" },
  prodUnitLbl:  { fontSize:10, color:"#475569" },
  prodRev:      { fontSize:11, color:"#64748b", marginTop:2 },
  chart:        { display:"flex", alignItems:"flex-end", gap:6, height:140, paddingTop:10 },
  chartCol:     { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 },
  chartVal:     { fontSize:10, color:"#475569" },
  chartBar:     { width:"100%", borderRadius:"3px 3px 0 0", transition:"height 0.6s ease" },
  chartLbl:     { fontSize:9, color:"#334155", textAlign:"center" },
  shopRow:      { display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #1e293b" },
  shopRankNum:  { fontSize:20, width:30, textAlign:"center", flexShrink:0 },
  shopInfo:     { flex:1 },
  shopName:     { fontSize:14, fontWeight:600, color:"#e2e8f0" },
  shopMeta:     { fontSize:11, color:"#475569", margin:"2px 0" },
  shopStars:    { fontSize:13, color:"#f6a623" },
  shopRatingBubble:{ background:"#1e293b", borderRadius:12, padding:"8px 14px", textAlign:"center", flexShrink:0 },
  ratingNum:    { fontSize:22, fontWeight:800, color:"#f6a623" },
  ratingLbl:    { fontSize:10, color:"#475569" },
  feed:         { display:"flex", flexDirection:"column", gap:0, maxHeight:280, overflowY:"auto" },
  feedRow:      { display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #1e293b", transition:"opacity 0.3s" },
  feedEmoji:    { fontSize:20, flexShrink:0 },
  feedInfo:     { flex:1, fontSize:12 },
  feedProduct:  { color:"#e2e8f0", fontWeight:600 },
  feedShop:     { color:"#475569" },
  feedRight:    { textAlign:"right", flexShrink:0 },
  feedPrice:    { fontSize:13, fontWeight:700, color:"#22c55e" },
  feedTime:     { fontSize:10, color:"#334155" },
  catGrid:      { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 },
  catCard:      { background:"#1e293b", borderRadius:12, padding:"14px 12px", textAlign:"center" },
  catEmoji:     { fontSize:26, marginBottom:6 },
  catName:      { fontSize:12, color:"#94a3b8", marginBottom:8, fontWeight:600 },
  catBarH:      { height:6, background:"#0f172a", borderRadius:3, overflow:"hidden", marginBottom:6 },
  catBarFill:   { height:"100%", background:"linear-gradient(90deg,#f6a623,#f97316)", borderRadius:3, transition:"width 0.8s ease" },
  catUnits:     { fontSize:13, fontWeight:700, color:"#f6a623" },
};