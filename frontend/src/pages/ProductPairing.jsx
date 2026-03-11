import { useState, useEffect, useRef } from "react";

const CAT_COLOR = {
  Dairy:"#60a5fa", Bakery:"#f472b6", Snacks:"#f97316", Beverages:"#a78bfa",
  Biscuits:"#fb923c", Grains:"#84cc16", Oils:"#fbbf24", Veggies:"#4ade80",
  Health:"#34d399", Personal:"#38bdf8", Baby:"#e879f9", Household:"#94a3b8",
};

const LIFT_LABEL = (l) =>
  l >= 3 ? { text:"Very Strong", color:"#f97316", bg:"#1a0a00" } :
  l >= 2 ? { text:"Strong",      color:"#22c55e", bg:"#0d1f0d" } :
           { text:"Moderate",    color:"#60a5fa", bg:"#0a1020" };

export default function ProductPairing({ onBack }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("insights");   // insights | rules | semantic | cart
  const [selected,   setSelected]   = useState(null);         // selected rule for detail
  const [searchQ,    setSearchQ]    = useState("");
  const [semQuery,   setSemQuery]   = useState("");
  const [semResult,  setSemResult]  = useState(null);
  const [semLoading, setSemLoading] = useState(false);
  const [cartItems,  setCartItems]  = useState(["p21","p07"]); // beer + chips
  const [cartSuggs,  setCartSuggs]  = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => { loadInsights(); }, []);
  useEffect(() => { if (data && activeTab === "rules") drawForceGraph(); }, [data, activeTab, selected]);

  async function loadInsights() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/product-pairing/insights");
      const d   = await res.json();
      if (d.success) setData(d);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function runSemantic() {
    if (!semQuery.trim()) return;
    setSemLoading(true); setSemResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/product-pairing/semantic", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: semQuery }),
      });
      const d = await res.json();
      if (d.success) setSemResult(d);
    } catch(e) { console.error(e); }
    setSemLoading(false);
  }

  async function loadCartSuggestions() {
    if (!cartItems.length) return;
    try {
      const res = await fetch(`http://localhost:5000/api/product-pairing/cart?items=${cartItems.join(",")}`);
      const d   = await res.json();
      if (d.success) setCartSuggs(d.suggestions);
    } catch(e) { console.error(e); }
  }

  useEffect(() => { if (activeTab === "cart") loadCartSuggestions(); }, [activeTab, cartItems]);

  // ── Force-directed graph on canvas ──
  function drawForceGraph() {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#080e1c"; ctx.fillRect(0, 0, W, H);

    const rules   = data.allRules.slice(0, 25);
    const nodeMap = {};
    rules.forEach(r => {
      [r.product_a, r.product_b].forEach(p => {
        if (!nodeMap[p.id]) nodeMap[p.id] = { ...p, x: W/2 + (Math.random()-.5)*300, y: H/2 + (Math.random()-.5)*200, vx:0, vy:0 };
      });
    });
    const nodes = Object.values(nodeMap);
    const edges = rules.map(r => ({ a: nodeMap[r.product_a.id], b: nodeMap[r.product_b.id], lift: r.lift, color: r.color }));

    // Simple force simulation
    for (let iter = 0; iter < 80; iter++) {
      // Repulsion
      nodes.forEach(n1 => nodes.forEach(n2 => {
        if (n1 === n2) return;
        const dx = n1.x - n2.x, dy = n1.y - n2.y;
        const d  = Math.max(1, Math.hypot(dx, dy));
        const f  = 1800 / (d*d);
        n1.vx += dx/d * f; n1.vy += dy/d * f;
      }));
      // Attraction along edges
      edges.forEach(e => {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d  = Math.max(1, Math.hypot(dx, dy));
        const f  = (d - 100) * 0.015;
        e.a.vx += dx/d * f; e.a.vy += dy/d * f;
        e.b.vx -= dx/d * f; e.b.vy -= dy/d * f;
      });
      // Centre pull
      nodes.forEach(n => { n.vx += (W/2 - n.x)*0.008; n.vy += (H/2 - n.y)*0.008; });
      // Integrate + dampen
      nodes.forEach(n => {
        n.x = Math.max(50, Math.min(W-50, n.x + n.vx));
        n.y = Math.max(40, Math.min(H-40, n.y + n.vy));
        n.vx *= 0.7; n.vy *= 0.7;
      });
    }

    // Draw edges
    edges.forEach(e => {
      const isSel = selected && (selected.product_a.id===e.a.id&&selected.product_b.id===e.b.id||selected.product_a.id===e.b.id&&selected.product_b.id===e.a.id);
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y);
      ctx.strokeStyle = isSel ? "#fff" : e.color + "88";
      ctx.lineWidth   = isSel ? 2.5 : Math.max(1, (e.lift-1)*1.5);
      ctx.stroke();
      // Lift label on edge midpoint
      if (isSel) {
        const mx = (e.a.x+e.b.x)/2, my = (e.a.y+e.b.y)/2;
        ctx.fillStyle="#fff"; ctx.font="bold 10px Segoe UI"; ctx.textAlign="center";
        ctx.fillText(`lift ${e.lift}`, mx, my-4);
      }
    });

    // Draw nodes
    nodes.forEach(n => {
      const isSel = selected && (selected.product_a.id===n.id || selected.product_b.id===n.id);
      const r     = isSel ? 18 : 12;
      const color = CAT_COLOR[n.category] || "#94a3b8";
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
      ctx.fillStyle = color + (isSel ? "ff" : "bb"); ctx.fill();
      if (isSel) { ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke(); }
      ctx.font = `${isSel?11:9}px Segoe UI`; ctx.textAlign="center";
      ctx.fillStyle="#0a0e1c"; ctx.fillText(n.emoji, n.x, n.y+4);
      // Label with dark bg
      const label = n.name.split(" ")[0];
      ctx.font = "9px Segoe UI"; const tw = ctx.measureText(label).width;
      ctx.fillStyle="rgba(5,8,18,0.85)"; ctx.fillRect(n.x-tw/2-2, n.y+r+2, tw+4, 12);
      ctx.fillStyle= isSel ? "#fff" : "#94a3b8"; ctx.textAlign="center"; ctx.textBaseline="top";
      ctx.fillText(label, n.x, n.y+r+3);
    });
  }

  function handleCanvasClick(e) {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(canvas.width/rect.width);
    const my = (e.clientY-rect.top)*(canvas.height/rect.height);
    // find nearest edge midpoint
    let best = null, bestD = 999;
    data.allRules.slice(0,25).forEach(r => {
      const a = { x:0,y:0 }; // can't get node positions easily; just use rule click on list
    });
    // For now, canvas is display-only; rule selection via list
  }

  const filteredRules = data?.allRules?.filter(r =>
    !searchQ || r.product_a.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    r.product_b.name.toLowerCase().includes(searchQ.toLowerCase())
  ) || [];

  const TABS = [
    { id:"insights",  icon:"💡", label:"Insights"       },
    { id:"rules",     icon:"🕸️", label:"Pair Graph"     },
    { id:"semantic",  icon:"🤖", label:"AI Semantic"    },
    { id:"cart",      icon:"🛒", label:"Cart Pairing"   },
  ];

  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.hdr}>
        {onBack && <button style={s.backBtn} onClick={onBack}>← Back</button>}
        <div style={s.hdrBrand}>
          <span style={s.hdrIcon}>🧠</span>
          <div>
            <div style={s.hdrTitle}>Smart Product Pairing</div>
            <div style={s.hdrSub}>Beer & Diaper analysis · {data?.totalTransactions || "—"} transactions · {data?.totalRules || "—"} rules mined</div>
          </div>
        </div>
        <div style={s.tabs}>
          {TABS.map(t => (
            <button key={t.id} style={{ ...s.tab, ...(activeTab===t.id?s.tabActive:{}) }} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={s.loader}><div style={s.spin}/><p style={{color:"#475569",marginTop:14}}>Mining association rules...</p></div>
      ) : (
        <div style={s.body}>

          {/* ═══ INSIGHTS TAB ═══ */}
          {activeTab === "insights" && data && (
            <div style={s.insightsLayout}>
              {/* Left: Stats + Theory */}
              <div style={s.insightsLeft}>
                {/* KPI row */}
                <div style={s.kpiRow}>
                  {[
                    { l:"Transactions",   v:data.totalTransactions, i:"🛒", c:"#f6a623" },
                    { l:"Rules Mined",    v:data.totalRules,        i:"📋", c:"#22c55e" },
                    { l:"Avg Lift Score", v:data.avgLift,           i:"📈", c:"#60a5fa" },
                    { l:"Top Lift",       v:data.topLift,           i:"🔥", c:"#f97316" },
                  ].map((k,i) => (
                    <div key={i} style={s.kpi}>
                      <span style={{fontSize:22}}>{k.i}</span>
                      <div><div style={{...s.kpiV,color:k.c}}>{k.v}</div><div style={s.kpiL}>{k.l}</div></div>
                    </div>
                  ))}
                </div>

                {/* Beer & Diaper explainer */}
                <div style={s.theoryCard}>
                  <div style={s.theoryTitle}>🍺🧷 The Beer & Diaper Discovery</div>
                  <div style={s.theoryText}>
                    In 1992, Walmart's data scientists discovered that <strong style={{color:"#f6a623"}}>beer and diapers</strong> were frequently bought together on Friday evenings. Young fathers, sent to buy diapers, also bought beer. This seemingly impossible pairing had a <strong style={{color:"#22c55e"}}>Lift score of 3.5×</strong> — 3.5x more likely to be bought together than by chance.
                  </div>
                  <div style={s.theoryText}>
                    Walmart acted on this: they placed beer near the baby aisle on Fridays and saw a measurable revenue increase. This is the power of <strong style={{color:"#a78bfa"}}>association rule mining</strong> — finding non-obvious, high-value product relationships hidden in transaction data.
                  </div>
                  <div style={s.metricsRow}>
                    {[
                      { term:"Support",    formula:"P(A∩B)",          desc:"How often both bought together" },
                      { term:"Confidence", formula:"P(B|A)",          desc:"If A, how likely is B?" },
                      { term:"Lift",       formula:"P(A∩B)/P(A)·P(B)",desc:">1 means genuinely correlated" },
                    ].map((m,i) => (
                      <div key={i} style={s.metricBox}>
                        <div style={s.metricTerm}>{m.term}</div>
                        <div style={s.metricFormula}>{m.formula}</div>
                        <div style={s.metricDesc}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Surprising (cross-category) pairs */}
                <div style={s.pairsCard}>
                  <div style={s.pairsTitle}>🤯 Surprising Cross-Category Pairings</div>
                  <div style={s.pairsSub}>These pairs span different categories — the Beer & Diaper equivalents in Indian grocery</div>
                  {data.surprising.map((r, i) => {
                    const liftInfo = LIFT_LABEL(r.lift);
                    return (
                      <div key={i} style={{...s.pairRow, cursor:"pointer", borderColor: selected?.product_a.id===r.product_a.id?r.color+"88":"transparent"}}
                        onClick={() => setSelected(selected?.product_a.id===r.product_a.id && selected?.product_b.id===r.product_b.id ? null : r)}>
                        <div style={s.pairEmojis}>
                          <span style={{fontSize:28}}>{r.product_a.emoji}</span>
                          <div style={s.pairArrow}>↔</div>
                          <span style={{fontSize:28}}>{r.product_b.emoji}</span>
                        </div>
                        <div style={s.pairInfo}>
                          <div style={s.pairNames}>{r.product_a.name} <span style={{color:"#334155"}}>+</span> {r.product_b.name}</div>
                          <div style={s.pairCats}>
                            <span style={{...s.catTag, background:CAT_COLOR[r.product_a.category]+"22", color:CAT_COLOR[r.product_a.category]}}>{r.product_a.category}</span>
                            <span style={{color:"#334155",fontSize:11}}>×</span>
                            <span style={{...s.catTag, background:CAT_COLOR[r.product_b.category]+"22", color:CAT_COLOR[r.product_b.category]}}>{r.product_b.category}</span>
                          </div>
                        </div>
                        <div style={s.pairMetrics}>
                          <div style={{...s.liftBadge, background:liftInfo.bg, color:liftInfo.color}}>Lift {r.lift}</div>
                          <div style={s.pairConf}>Conf. {r.confidence}%</div>
                          <div style={s.pairSupport}>{r.support}% of baskets</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: selected rule detail + expected pairs */}
              <div style={s.insightsRight}>
                {selected ? (
                  <div style={s.detailCard}>
                    <div style={s.detailHeader}>
                      <span style={{fontSize:36}}>{selected.product_a.emoji}</span>
                      <span style={{fontSize:22,color:"#334155"}}>+</span>
                      <span style={{fontSize:36}}>{selected.product_b.emoji}</span>
                      <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
                    </div>
                    <div style={s.detailNames}>{selected.product_a.name} & {selected.product_b.name}</div>
                    <div style={s.detailGrid}>
                      {[
                        { l:"Lift",           v:selected.lift,           desc:"Times more likely than chance",  c:"#f97316" },
                        { l:"Confidence",     v:`${selected.confidence}%`, desc:"Buy A → also buy B probability", c:"#22c55e" },
                        { l:"Support",        v:`${selected.support}%`,   desc:"% of all baskets contain both",  c:"#60a5fa" },
                        { l:"Transactions",   v:selected.transactions,   desc:"Times seen together",            c:"#a78bfa" },
                      ].map((m,i) => (
                        <div key={i} style={s.dMetric}>
                          <div style={{...s.dMetricV, color:m.c}}>{m.v}</div>
                          <div style={s.dMetricL}>{m.l}</div>
                          <div style={s.dMetricD}>{m.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div style={s.insightBox}>
                      <div style={s.insightTitle}>💡 Retail Action</div>
                      <div style={s.insightText}>
                        Place <strong style={{color:"#f6a623"}}>{selected.product_a.name}</strong> near <strong style={{color:"#f6a623"}}>{selected.product_b.name}</strong> in the store. Customers buying one are <strong style={{color:"#22c55e"}}>{selected.lift}× more likely</strong> to also buy the other. Consider a bundle discount or shelf adjacency.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={s.hintBox}>
                    <div style={{fontSize:36,marginBottom:10}}>👆</div>
                    <div style={s.hintText}>Click any pair on the left to see detailed metrics and retail action recommendations</div>
                  </div>
                )}

                {/* Expected pairs */}
                <div style={s.expCard}>
                  <div style={s.expTitle}>✅ Expected Same-Category Pairs</div>
                  <div style={s.expSub}>High confidence but less surprising</div>
                  {data.expected.map((r, i) => (
                    <div key={i} style={s.expRow}>
                      <span style={{fontSize:20}}>{r.product_a.emoji}</span>
                      <span style={{fontSize:14,color:"#475569"}}>+</span>
                      <span style={{fontSize:20}}>{r.product_b.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={s.expNames}>{r.product_a.name.split(" ")[0]} & {r.product_b.name.split(" ")[0]}</div>
                        <div style={{...s.catTag, background:CAT_COLOR[r.product_a.category]+"22", color:CAT_COLOR[r.product_a.category], display:"inline-block", marginTop:2}}>{r.product_a.category}</div>
                      </div>
                      <div style={s.expLift}>Lift {r.lift}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ GRAPH TAB ═══ */}
          {activeTab === "rules" && (
            <div style={s.graphLayout}>
              <div style={s.graphLeft}>
                <div style={s.graphHdr}>
                  <div style={s.graphTitle}>🕸️ Product Association Network</div>
                  <div style={s.graphSub}>Node size = order frequency · Edge thickness = lift score · Click a rule to highlight</div>
                </div>
                <canvas ref={canvasRef} width={700} height={440} style={s.canvas}
                  onClick={handleCanvasClick}/>
                <div style={s.graphLegend}>
                  {Object.entries(CAT_COLOR).slice(0,6).map(([cat,col]) => (
                    <span key={cat} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b"}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block"}}/>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <div style={s.rulesList}>
                <div style={s.rlSearch}>
                  <input style={s.rlInput} placeholder="Search product..." value={searchQ}
                    onChange={e=>setSearchQ(e.target.value)}/>
                </div>
                <div style={{overflowY:"auto",flex:1,scrollbarWidth:"thin",scrollbarColor:"#1a2d45 #070d1c"}}>
                  {filteredRules.slice(0,30).map((r,i)=>{
                    const liftInfo = LIFT_LABEL(r.lift);
                    const isSel    = selected?.product_a.id===r.product_a.id&&selected?.product_b.id===r.product_b.id;
                    return (
                      <div key={i} style={{...s.rlRow,...(isSel?{background:"#0f1f35",borderColor:"#3b82f6"}:{})}}
                        onClick={()=>{setSelected(isSel?null:r); setTimeout(drawForceGraph,50);}}>
                        <span style={{fontSize:18}}>{r.product_a.emoji}</span>
                        <span style={{fontSize:11,color:"#334155"}}>+</span>
                        <span style={{fontSize:18}}>{r.product_b.emoji}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={s.rlNames}>{r.product_a.name.split(" ")[0]} + {r.product_b.name.split(" ")[0]}</div>
                          <div style={s.rlMeta}>sup {r.support}% · conf {r.confidence}%</div>
                        </div>
                        <div style={{...s.rlLift, background:liftInfo.bg, color:liftInfo.color}}>↑{r.lift}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SEMANTIC TAB ═══ */}
          {activeTab === "semantic" && (
            <div style={s.semLayout}>
              <div style={s.semLeft}>
                <div style={s.modelCard}>
                  <div style={s.modelLogo}>🤗</div>
                  <div>
                    <div style={s.modelName}>sentence-transformers/all-MiniLM-L6-v2</div>
                    <div style={s.modelSub}>Hugging Face Inference API · 384-dim embeddings · Cosine similarity</div>
                  </div>
                </div>
                <div style={s.semExplain}>
                  <div style={s.semExplainTitle}>How It Works</div>
                  <div style={s.semExplainStep}><span style={s.stepNum}>1</span> Product names are converted to 384-dimensional embedding vectors by the MiniLM model</div>
                  <div style={s.semExplainStep}><span style={s.stepNum}>2</span> Cosine similarity is computed between the query product and all other products</div>
                  <div style={s.semExplainStep}><span style={s.stepNum}>3</span> Products with high semantic similarity are surfaced as pairing candidates</div>
                  <div style={s.semNote}>Note: Semantic similarity finds products with similar names/descriptions. Combine with association rules (Tab 1) for best results — semantic catches what transaction data misses.</div>
                </div>
                <div style={s.semSearch}>
                  <input style={s.semInput} placeholder="Type exact product name, e.g. Maggi Noodles 70g"
                    value={semQuery} onChange={e=>setSemQuery(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&runSemantic()}/>
                  <button style={s.semBtn} onClick={runSemantic} disabled={semLoading}>
                    {semLoading ? "⏳ Calling HuggingFace..." : "🔍 Find Semantic Pairs"}
                  </button>
                </div>
                {/* Product quick-pick */}
                <div style={s.quickPick}>
                  <div style={s.qpTitle}>Quick pick:</div>
                  <div style={s.qpGrid}>
                    {["Amul Gold Milk 1L","Kingfisher Beer 650ml","Maggi Noodles 70g","Pampers Diapers M 30pc","Britannia Brown Bread"].map(n=>(
                      <button key={n} style={s.qpBtn} onClick={()=>{setSemQuery(n);}}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={s.semRight}>
                {semLoading && <div style={s.semLoading}><div style={s.spin}/><p style={{color:"#475569",marginTop:14}}>Calling HuggingFace API...</p></div>}
                {semResult && (
                  <div style={s.semResults}>
                    <div style={s.semResultHdr}>
                      Results for "<strong style={{color:"#f6a623"}}>{semResult.query}</strong>"
                      <span style={s.srcBadge}>{semResult.source==="huggingface_semantic"?"🤗 HuggingFace":"📊 Rule Fallback"}</span>
                    </div>
                    {semResult.pairs.map((p,i)=>(
                      <div key={i} style={s.semRow}>
                        <span style={{fontSize:28}}>{p.product?.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={s.semProdName}>{p.product?.name}</div>
                          <div style={s.semProdCat}>
                            <span style={{...s.catTag, background:CAT_COLOR[p.product?.category]+"22", color:CAT_COLOR[p.product?.category]||"#888"}}>{p.product?.category}</span>
                            <span style={s.semReason}>{p.reason || p.lift && `Lift ${p.lift}`}</span>
                          </div>
                        </div>
                        <div style={s.semScore}>
                          <div style={s.semScoreV}>{p.similarity || (p.confidence+"% conf")}</div>
                          <div style={s.semScoreL}>{p.similarity ? "similarity" : "confidence"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!semResult && !semLoading && (
                  <div style={s.semEmpty}>
                    <div style={{fontSize:40,marginBottom:12}}>🤗</div>
                    <div style={s.semEmptyText}>Select a product or type a name to find semantically similar pairings using the MiniLM model</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ CART TAB ═══ */}
          {activeTab === "cart" && data && (
            <div style={s.cartLayout}>
              <div style={s.cartLeft}>
                <div style={s.cartTitle}>🛒 Simulate a Cart</div>
                <div style={s.cartSub}>Toggle products to build a cart and see AI-powered pairing suggestions</div>
                <div style={s.cartGrid}>
                  {data.products.map(p=>{
                    const inCart = cartItems.includes(p.id);
                    return (
                      <div key={p.id} style={{...s.cartProd,...(inCart?s.cartProdActive:{})}}
                        onClick={()=>setCartItems(prev=>inCart?prev.filter(x=>x!==p.id):[...prev,p.id])}>
                        <span style={{fontSize:22}}>{p.emoji}</span>
                        <div>
                          <div style={s.cpName}>{p.name.split(" ").slice(0,2).join(" ")}</div>
                          <span style={{...s.catTag,background:CAT_COLOR[p.category]+"22",color:CAT_COLOR[p.category]||"#888",fontSize:9}}>{p.category}</span>
                        </div>
                        {inCart && <span style={s.cartCheck}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={s.cartRight}>
                <div style={s.cartRightTitle}>🎯 Smart Add-On Suggestions</div>
                <div style={s.cartRightSub}>{cartItems.length} items in cart · association rules active</div>
                {cartItems.length === 0 && <div style={s.noCart}>Add items to your cart to see suggestions</div>}
                {cartSuggs?.length === 0 && cartItems.length > 0 && <div style={s.noCart}>No strong pairings found for this combination</div>}
                {cartSuggs?.map((s2,i)=>(
                  <div key={i} style={s.suggCard}>
                    <span style={{fontSize:32}}>{s2.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={s.suggName}>{s2.name}</div>
                      <div style={s.suggReason}>{s2.reason}</div>
                      <div style={s.suggTriggered}>
                        {s2.triggeredBy?.slice(0,2).map((t,j)=>(
                          <span key={j} style={s.trigTag}>↑{Math.round(t.lift*10)/10}× with {t.with?.split(" ")[0]}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={s.suggPrice}>₹{s2.price}</div>
                      <button style={s.addBtn} onClick={()=>setCartItems(prev=>[...prev,s2.id])}>+ Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  page:       { height:"100vh", overflow:"hidden", background:"#060c1a", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e2e8f0", display:"flex", flexDirection:"column" },
  hdr:        { background:"#070d1c", borderBottom:"1px solid #1a2540", padding:"0 20px", height:58, display:"flex", alignItems:"center", gap:14, flexShrink:0, boxShadow:"0 2px 16px #00000066" },
  backBtn:    { padding:"5px 12px", borderRadius:8, border:"1px solid #1a2540", background:"#0e1a2e", cursor:"pointer", fontSize:12, color:"#94a3b8", fontFamily:"inherit", flexShrink:0 },
  hdrBrand:   { display:"flex", alignItems:"center", gap:10, flex:1 },
  hdrIcon:    { fontSize:22 },
  hdrTitle:   { fontSize:16, fontWeight:700, color:"#f8fafc" },
  hdrSub:     { fontSize:11, color:"#475569", marginTop:2 },
  tabs:       { display:"flex", gap:4 },
  tab:        { padding:"6px 12px", borderRadius:20, border:"1px solid #1a2540", background:"transparent", cursor:"pointer", fontSize:12, color:"#64748b", fontFamily:"inherit" },
  tabActive:  { background:"#1e3a5f", border:"1px solid #3b82f6", color:"#f1f5f9" },
  loader:     { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
  spin:       { width:40, height:40, border:"3px solid #1a2540", borderTopColor:"#f6a623", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  body:       { flex:1, overflow:"hidden", display:"flex", flexDirection:"column" },

  // Insights tab
  insightsLayout:{ display:"grid", gridTemplateColumns:"1fr 340px", flex:1, overflow:"hidden" },
  insightsLeft:  { padding:16, overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1a2540 #060c1a" },
  insightsRight: { background:"#070d1c", borderLeft:"1px solid #1a2540", padding:14, overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1a2540 #060c1a" },
  kpiRow:     { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 },
  kpi:        { background:"#070d1c", border:"1px solid #1a2540", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 },
  kpiV:       { fontSize:20, fontWeight:800, display:"block" },
  kpiL:       { fontSize:10, color:"#475569", marginTop:2 },
  theoryCard: { background:"#070d1c", border:"1px solid #1a2540", borderRadius:14, padding:18, marginBottom:14 },
  theoryTitle:{ fontSize:15, fontWeight:700, color:"#f6a623", marginBottom:10 },
  theoryText: { fontSize:13, color:"#94a3b8", lineHeight:1.7, marginBottom:10 },
  metricsRow: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:14 },
  metricBox:  { background:"#0d1828", borderRadius:10, padding:"10px 12px", border:"1px solid #1a2540" },
  metricTerm: { fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:3 },
  metricFormula:{ fontSize:11, color:"#a78bfa", fontFamily:"monospace", marginBottom:4 },
  metricDesc: { fontSize:10, color:"#475569" },
  pairsCard:  { background:"#070d1c", border:"1px solid #1a2540", borderRadius:14, padding:16 },
  pairsTitle: { fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:4 },
  pairsSub:   { fontSize:11, color:"#475569", marginBottom:14 },
  pairRow:    { display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #1a2540", border:"1px solid transparent", borderRadius:10, paddingLeft:8, transition:"all .15s" },
  pairEmojis: { display:"flex", alignItems:"center", gap:4, flexShrink:0 },
  pairArrow:  { fontSize:14, color:"#334155" },
  pairInfo:   { flex:1, minWidth:0 },
  pairNames:  { fontSize:12, fontWeight:600, color:"#e2e8f0", marginBottom:5 },
  pairCats:   { display:"flex", alignItems:"center", gap:6 },
  catTag:     { fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10, display:"inline-block" },
  pairMetrics:{ textAlign:"right", flexShrink:0 },
  liftBadge:  { fontSize:12, fontWeight:800, padding:"3px 8px", borderRadius:8, marginBottom:3, display:"inline-block" },
  pairConf:   { fontSize:10, color:"#64748b" },
  pairSupport:{ fontSize:10, color:"#334155" },
  detailCard: { background:"#0d1828", border:"1px solid #1a2540", borderRadius:12, padding:16, marginBottom:12 },
  detailHeader:{ display:"flex", alignItems:"center", gap:8, marginBottom:12, position:"relative" },
  detailNames:{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:14 },
  closeBtn:   { position:"absolute", right:0, top:0, background:"#1a2540", border:"none", cursor:"pointer", color:"#94a3b8", borderRadius:6, padding:"2px 7px", fontSize:12, fontFamily:"inherit" },
  detailGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 },
  dMetric:    { background:"#060c1a", borderRadius:8, padding:"10px 12px" },
  dMetricV:   { fontSize:18, fontWeight:800 },
  dMetricL:   { fontSize:10, color:"#64748b", marginTop:2 },
  dMetricD:   { fontSize:9, color:"#334155", marginTop:3 },
  insightBox: { background:"#0d2020", border:"1px solid #166534", borderRadius:8, padding:"11px 13px" },
  insightTitle:{ fontSize:10, letterSpacing:2, color:"#22c55e", fontWeight:700, marginBottom:6 },
  insightText:{ fontSize:12, color:"#86efac", lineHeight:1.6 },
  hintBox:    { background:"#070d1c", border:"1px dashed #1a2540", borderRadius:12, padding:24, textAlign:"center", marginBottom:12 },
  hintText:   { fontSize:12, color:"#334155" },
  expCard:    { background:"#070d1c", border:"1px solid #1a2540", borderRadius:12, padding:14 },
  expTitle:   { fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:3 },
  expSub:     { fontSize:11, color:"#475569", marginBottom:12 },
  expRow:     { display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #1a2540" },
  expNames:   { fontSize:12, fontWeight:600, color:"#e2e8f0" },
  expLift:    { fontSize:13, fontWeight:700, color:"#22c55e", flexShrink:0 },

  // Graph tab
  graphLayout:{ display:"grid", gridTemplateColumns:"1fr 280px", flex:1, overflow:"hidden" },
  graphLeft:  { padding:14, display:"flex", flexDirection:"column", gap:10 },
  graphHdr:   {},
  graphTitle: { fontSize:14, fontWeight:700, color:"#f1f5f9" },
  graphSub:   { fontSize:11, color:"#475569", marginTop:3 },
  canvas:     { width:"100%", borderRadius:12, border:"1px solid #1a2540", cursor:"pointer", display:"block" },
  graphLegend:{ display:"flex", flexWrap:"wrap", gap:10 },
  rulesList:  { background:"#070d1c", borderLeft:"1px solid #1a2540", padding:12, display:"flex", flexDirection:"column", overflow:"hidden" },
  rlSearch:   { marginBottom:10 },
  rlInput:    { width:"100%", background:"#0d1828", border:"1px solid #1a2540", borderRadius:8, padding:"7px 12px", color:"#e2e8f0", fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box" },
  rlRow:      { display:"flex", alignItems:"center", gap:6, padding:"8px 8px", borderRadius:8, border:"1px solid transparent", marginBottom:3, cursor:"pointer" },
  rlNames:    { fontSize:11, fontWeight:600, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  rlMeta:     { fontSize:9, color:"#475569", marginTop:1 },
  rlLift:     { fontSize:11, fontWeight:700, padding:"2px 6px", borderRadius:6, flexShrink:0 },

  // Semantic tab
  semLayout:  { display:"grid", gridTemplateColumns:"400px 1fr", flex:1, overflow:"hidden" },
  semLeft:    { padding:16, borderRight:"1px solid #1a2540", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1a2540 #060c1a" },
  semRight:   { padding:16, overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1a2540 #060c1a" },
  modelCard:  { background:"#0d1828", border:"1px solid #f59e0b44", borderRadius:12, padding:14, display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  modelLogo:  { fontSize:30, flexShrink:0 },
  modelName:  { fontSize:12, fontWeight:700, color:"#f59e0b", fontFamily:"monospace" },
  modelSub:   { fontSize:11, color:"#475569", marginTop:2 },
  semExplain: { background:"#070d1c", border:"1px solid #1a2540", borderRadius:12, padding:14, marginBottom:14 },
  semExplainTitle:{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:10 },
  semExplainStep: { display:"flex", gap:10, fontSize:12, color:"#94a3b8", marginBottom:8, lineHeight:1.5 },
  stepNum:    { background:"#1e3a5f", color:"#60a5fa", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 },
  semNote:    { fontSize:11, color:"#334155", borderTop:"1px solid #1a2540", paddingTop:10, marginTop:6, lineHeight:1.5 },
  semSearch:  { display:"flex", gap:8, marginBottom:14 },
  semInput:   { flex:1, background:"#0d1828", border:"1px solid #1a2540", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:12, outline:"none", fontFamily:"inherit" },
  semBtn:     { padding:"9px 14px", background:"#1e3a5f", border:"1px solid #3b82f6", borderRadius:8, color:"#f1f5f9", fontSize:12, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  quickPick:  { background:"#070d1c", border:"1px solid #1a2540", borderRadius:10, padding:12 },
  qpTitle:    { fontSize:10, color:"#475569", letterSpacing:1, marginBottom:8 },
  qpGrid:     { display:"flex", flexDirection:"column", gap:6 },
  qpBtn:      { padding:"6px 10px", background:"transparent", border:"1px solid #1a2540", borderRadius:6, color:"#94a3b8", fontSize:11, cursor:"pointer", textAlign:"left", fontFamily:"inherit" },
  semLoading: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60%" },
  semResults: { background:"#070d1c", border:"1px solid #1a2540", borderRadius:12, padding:14 },
  semResultHdr:{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:14, display:"flex", alignItems:"center", gap:10 },
  srcBadge:   { fontSize:10, background:"#0d1f35", border:"1px solid #1e3a5f", padding:"2px 8px", borderRadius:20, color:"#60a5fa" },
  semRow:     { display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:"1px solid #1a2540" },
  semProdName:{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:4 },
  semProdCat: { display:"flex", alignItems:"center", gap:8 },
  semReason:  { fontSize:10, color:"#475569" },
  semScore:   { textAlign:"right", flexShrink:0 },
  semScoreV:  { fontSize:16, fontWeight:700, color:"#22c55e" },
  semScoreL:  { fontSize:9, color:"#334155" },
  semEmpty:   { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"70%", textAlign:"center" },
  semEmptyText:{ fontSize:12, color:"#334155", maxWidth:280, lineHeight:1.6 },

  // Cart tab
  cartLayout: { display:"grid", gridTemplateColumns:"1fr 380px", flex:1, overflow:"hidden" },
  cartLeft:   { padding:16, borderRight:"1px solid #1a2540", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1a2540 #060c1a" },
  cartTitle:  { fontSize:15, fontWeight:700, color:"#f1f5f9", marginBottom:4 },
  cartSub:    { fontSize:12, color:"#475569", marginBottom:14 },
  cartGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:8 },
  cartProd:   { background:"#070d1c", border:"1px solid #1a2540", borderRadius:10, padding:"10px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, position:"relative" },
  cartProdActive:{ background:"#0d1f35", border:"1px solid #3b82f6" },
  cpName:     { fontSize:11, fontWeight:600, color:"#e2e8f0" },
  cartCheck:  { position:"absolute", top:6, right:8, fontSize:12, color:"#3b82f6", fontWeight:700 },
  cartRight:  { padding:16, background:"#070d1c", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1a2540 #060c1a" },
  cartRightTitle:{ fontSize:15, fontWeight:700, color:"#f1f5f9", marginBottom:4 },
  cartRightSub:{ fontSize:12, color:"#475569", marginBottom:16 },
  noCart:     { color:"#334155", fontSize:13, padding:"30px 0", textAlign:"center" },
  suggCard:   { background:"#0d1828", border:"1px solid #1a2540", borderRadius:12, padding:14, marginBottom:10, display:"flex", gap:12 },
  suggName:   { fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:4 },
  suggReason: { fontSize:11, color:"#94a3b8", marginBottom:6 },
  suggTriggered:{ display:"flex", flexWrap:"wrap", gap:4 },
  trigTag:    { fontSize:9, background:"#1e3a5f", color:"#60a5fa", padding:"2px 6px", borderRadius:10 },
  suggPrice:  { fontSize:16, fontWeight:700, color:"#f6a623", marginBottom:6 },
  addBtn:     { padding:"5px 12px", background:"#1e3a5f", border:"1px solid #3b82f6", borderRadius:8, color:"#f1f5f9", fontSize:11, cursor:"pointer", fontFamily:"inherit" },
};