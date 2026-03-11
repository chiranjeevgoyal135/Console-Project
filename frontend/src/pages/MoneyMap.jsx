import { useState, useEffect, useRef } from "react";

const CAT_COLOR = {
  Dairy:"#60a5fa", Snacks:"#f97316", Beverages:"#a78bfa", Grains:"#84cc16",
  Biscuits:"#fb923c", Health:"#34d399", Oils:"#fbbf24", Bakery:"#f472b6",
  Personal:"#38bdf8", Veggies:"#4ade80", General:"#94a3b8",
};

// ── Accurate India SVG outline ──
// viewBox "0 0 400 480". Traced from real geographic coordinates.
// Coordinate formula used: x = 20 + (lng-67)/32*360,  y = 15 + (37-lat)/30*450
const INDIA_PATH = `
  M 99,30
  C 105,22 115,18 130,20
  L 155,44 L 165,62 L 172,82
  C 185,92 195,100 210,102
  L 230,105 L 255,115 L 275,130 L 290,145
  C 310,140 330,138 357,150
  L 360,162 L 345,178 L 335,192
  C 338,205 336,218 330,232
  L 315,248 L 295,252 L 270,250
  C 258,245 248,243 240,245
  L 228,252 L 220,265 L 205,278
  C 198,286 190,290 185,298
  L 178,312 L 170,328 L 168,345
  C 168,358 170,368 170,382
  L 168,395 L 155,412 L 145,428
  C 141,436 138,443 136,450
  L 132,442 L 122,432 L 115,420
  C 110,410 108,400 103,388
  L 95,372 L 84,355 L 76,342
  C 72,334 68,325 65,316
  L 59,300 L 55,284 L 57,270
  C 58,262 60,256 58,248
  L 52,238 L 40,232 L 36,220
  C 34,212 36,205 40,198
  L 46,190 L 52,180 L 54,168
  C 55,158 54,148 56,138
  L 62,128 L 72,118 L 82,108
  C 88,102 92,96 94,88
  L 96,75 L 97,60 L 99,45 Z

  M 135,452 L 140,462 L 145,470 L 140,476 L 133,470 L 130,460 Z
`;

// Convert real lat/lng → SVG coords (viewBox 0 0 400 480)
function geo2svg(lat, lng) {
  const x = 20 + ((lng - 67) / 32) * 360;
  const y = 15 + ((37 - lat) / 30) * 450;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function hex2rgba(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

const CITY_COLORS = {
  Delhi:"#f97316", Mumbai:"#a78bfa", Bangalore:"#34d399",
  Hyderabad:"#60a5fa", Chennai:"#4ade80", Kolkata:"#fbbf24",
  Pune:"#f472b6", Jaipur:"#fb923c",
};

export default function MoneyMap({ onBack }) {
  const [view,         setView]         = useState("india");
  const [cities,       setCities]       = useState([]);
  const [cityData,     setCityData]     = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedN,    setSelectedN]    = useState(null);
  const [mode,         setMode]         = useState("heat");
  const [search,       setSearch]       = useState("");
  const [suggestions,  setSuggestions]  = useState([]);
  const [tooltip,      setTooltip]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [hoveredCity,  setHoveredCity]  = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => { loadCities(); }, []);
  useEffect(() => { if (cityData) drawCityMap(); }, [cityData, mode, selectedN]);

  async function loadCities() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/money-map/cities");
      const d   = await res.json();
      if (d.success) setCities(d.cities);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function loadCity(name) {
    setLoading(true); setSelectedN(null);
    try {
      const res = await fetch(`http://localhost:5000/api/money-map?city=${name}`);
      const d   = await res.json();
      if (d.success) { setCityData(d); setSelectedCity(name); setView("city"); }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function handleSearch(val) {
    setSearch(val);
    if (!val.trim()) { setSuggestions([]); return; }
    setSuggestions(cities.filter(c => c.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5));
  }

  // ── Canvas city neighborhood map ──
  function drawCityMap() {
    const canvas = canvasRef.current;
    if (!canvas || !cityData) return;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#080e1c";
    ctx.fillRect(0, 0, W, H);

    // Dot grid
    ctx.fillStyle = "#141f35";
    for (let gx = 24; gx < W; gx += 32) for (let gy = 24; gy < H; gy += 32) {
      ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill();
    }

    const ns = cityData.neighborhoods;
    const lats = ns.map(n => n.lat), lngs = ns.map(n => n.lng);
    const latMid = (Math.max(...lats) + Math.min(...lats)) / 2;
    const lngMid = (Math.max(...lngs) + Math.min(...lngs)) / 2;
    const latSpan = Math.max(0.18, Math.max(...lats) - Math.min(...lats));
    const lngSpan = Math.max(0.18, Math.max(...lngs) - Math.min(...lngs));
    const scale   = Math.min((W - 120) / (lngSpan * 110), (H - 100) / (latSpan * 110));

    function proj(lat, lng) {
      return { x: W/2 + (lng - lngMid) * scale * 110, y: H/2 - (lat - latMid) * scale * 110 };
    }

    const pts = ns.map(n => proj(n.lat, n.lng));

    // Draw thin connection lines between close nodes
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i+1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < 180) {
        ctx.strokeStyle = `rgba(59,130,246,${0.12 - d/2000})`;
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }

    // Glow halos
    ns.forEach((n, i) => {
      const { x, y } = pts[i];
      const r = 22 + n.intensity * 65;
      const color = mode === "category" ? (CAT_COLOR[n.topCategories[0]] || "#f6a623") : "#f6a623";
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hex2rgba(color, 0.18 * n.intensity + 0.05));
      g.addColorStop(1, hex2rgba(color, 0));
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
    });

    // Nodes + labels
    ns.forEach((n, i) => {
      const { x, y } = pts[i];
      const r    = 8 + n.intensity * 22;
      const isSel = selectedN?.id === n.id;
      const color = mode === "category" ? (CAT_COLOR[n.topCategories[0]] || "#f6a623") : "#f6a623";

      // Opportunity ring
      if (!n.hasShop && mode === "opportunity") {
        ctx.beginPath(); ctx.arc(x, y, r + 10, 0, Math.PI*2);
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
      }

      // Circle fill
      const fill = ctx.createRadialGradient(x - r*.3, y - r*.3, 0, x, y, r);
      fill.addColorStop(0, hex2rgba(color, 1));
      fill.addColorStop(1, hex2rgba(color, 0.65));
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = fill; ctx.fill();

      // Selected ring
      if (isSel) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.stroke(); }

      // Shop icon
      if (n.hasShop) {
        ctx.font = `${Math.max(11, r * .65)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🏪", x, y);
      }

      // Label — dark pill background for contrast
      const label = n.name;
      ctx.font = isSel ? "bold 11px 'Segoe UI', sans-serif" : "10px 'Segoe UI', sans-serif";
      const tw = ctx.measureText(label).width;
      // Pill bg
      ctx.fillStyle = "rgba(6,10,22,0.88)";
      ctx.beginPath();
      ctx.roundRect(x - tw/2 - 5, y + r + 5, tw + 10, 16, 4);
      ctx.fill();
      // Pill border
      ctx.strokeStyle = isSel ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5; ctx.stroke();
      // Text — always white
      ctx.fillStyle = isSel ? "#ffffff" : "#cbd5e1";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(label, x, y + r + 7);

      // Order badge for prominent nodes
      if (isSel || n.intensity > 0.65) {
        const badge = `${n.orders} orders`;
        ctx.font = "bold 9px 'Segoe UI', sans-serif";
        const bw = ctx.measureText(badge).width;
        ctx.fillStyle = "rgba(6,10,22,0.92)";
        ctx.beginPath(); ctx.roundRect(x - bw/2 - 5, y - r - 22, bw + 10, 15, 4); ctx.fill();
        ctx.strokeStyle = hex2rgba(color, 0.7); ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(badge, x, y - r - 14);
      }
    });
  }

  function getHitNeighbor(e) {
    if (!cityData || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const W = canvas.width, H = canvas.height;
    const ns = cityData.neighborhoods;
    const lats = ns.map(n => n.lat), lngs = ns.map(n => n.lng);
    const latMid = (Math.max(...lats)+Math.min(...lats))/2;
    const lngMid = (Math.max(...lngs)+Math.min(...lngs))/2;
    const latSpan = Math.max(0.18, Math.max(...lats)-Math.min(...lats));
    const lngSpan = Math.max(0.18, Math.max(...lngs)-Math.min(...lngs));
    const scale   = Math.min((W-120)/(lngSpan*110), (H-100)/(latSpan*110));
    const proj = (lat, lng) => ({ x: W/2+(lng-lngMid)*scale*110, y: H/2-(lat-latMid)*scale*110 });
    let hit = null;
    ns.forEach(n => {
      const {x, y} = proj(n.lat, n.lng);
      if (Math.hypot(mx-x, my-y) < (8 + n.intensity*22) + 14) hit = n;
    });
    return hit;
  }

  function handleCanvasClick(e) { setSelectedN(getHitNeighbor(e)); }
  function handleCanvasMove(e) {
    const hit  = getHitNeighbor(e);
    const rect = canvasRef.current?.getBoundingClientRect();
    setTooltip(hit && rect ? { n: hit, x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 14 } : null);
  }

  const filteredCities = search
    ? cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : cities;

  // ═══════════════════════════════════════
  // INDIA OVERVIEW
  // ═══════════════════════════════════════
  if (view === "india") return (
    <div style={s.page} className="moneymap-root">
    <style>{`
      .moneymap-scroll::-webkit-scrollbar { width: 4px; }
      .moneymap-scroll::-webkit-scrollbar-track { background: #070d1c; }
      .moneymap-scroll::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
      .moneymap-scroll::-webkit-scrollbar-thumb:hover { background: #2563eb; }
    `}</style>

      {/* Header */}
      <div style={s.hdr}>
        {onBack && <button style={s.backBtn} onClick={onBack}>← Back</button>}
        <div style={s.hdrLeft}>
          <span style={s.hdrEmoji}>💰</span>
          <div>
            <div style={s.hdrTitle}>Money Map</div>
            <div style={s.hdrSub}>Neighborhood Purchase Intelligence</div>
          </div>
        </div>
        {/* Search */}
        <div style={s.searchBox}>
          <span style={s.searchIco}>🔍</span>
          <input style={s.searchIn} placeholder="Search any city..." value={search}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && suggestions.length) { loadCity(suggestions[0].name); setSearch(""); setSuggestions([]); }}}/>
          {search && <button style={s.clearX} onClick={() => { setSearch(""); setSuggestions([]); }}>✕</button>}
          {suggestions.length > 0 && (
            <div style={s.dropbox}>
              {suggestions.map(c => (
                <div key={c.name} style={s.dropItem}
                  onClick={() => { loadCity(c.name); setSearch(""); setSuggestions([]); }}>
                  <span style={s.dropCity}>{c.name}</span>
                  <span style={s.dropState}>{c.state}</span>
                  <span style={{...s.dropOrders, color: CITY_COLORS[c.name]||"#f6a623"}}>{c.totalOrders.toLocaleString()} orders</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={s.loadScreen}><div style={s.spinner}/><p style={{color:"#475569",marginTop:14,fontSize:13}}>Loading city data...</p></div>
      ) : (
        <div style={s.indiaLayout}>
          {/* ── India SVG Map ── */}
          <div style={s.mapPanel} className="moneymap-scroll">
            <div style={s.mapPanelTitle}>🇮🇳 INDIA — {cities.length} CITIES</div>
            <div style={s.svgWrap}>
              <svg viewBox="0 0 400 490" style={s.svg}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3.5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <linearGradient id="mapFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0d2244"/>
                    <stop offset="100%" stopColor="#091830"/>
                  </linearGradient>
                </defs>
                {/* India fill */}
                <path d={INDIA_PATH} fill="url(#mapFill)" stroke="#2563eb" strokeWidth="1.2"/>
                <path d={INDIA_PATH} fill="none" stroke="#3b82f6" strokeWidth="0.4" opacity="0.5"/>

                {/* City dots */}
                {cities.map(c => {
                  const { x, y } = geo2svg(c.lat, c.lng);
                  const r     = 4 + c.intensity * 13;
                  const isHov = hoveredCity === c.name;
                  const color = CITY_COLORS[c.name] || "#f6a623";
                  return (
                    <g key={c.name} style={{ cursor: "pointer" }}
                      onClick={() => loadCity(c.name)}
                      onMouseEnter={() => setHoveredCity(c.name)}
                      onMouseLeave={() => setHoveredCity(null)}>
                      {/* Pulse ring */}
                      <circle cx={x} cy={y} r={r + 8} fill={hex2rgba(color, 0.1)}
                        stroke={hex2rgba(color, 0.35)} strokeWidth="1" strokeDasharray="3 2"/>
                      {/* Core */}
                      <circle cx={x} cy={y} r={r} fill={color}
                        filter={isHov ? "url(#glow)" : "none"} opacity={isHov ? 1 : 0.85}/>
                      {/* Label background pill */}
                      <rect x={x - 24} y={y + r + 4} width={48} height={12} rx={3}
                        fill="rgba(4,8,20,0.92)" stroke={isHov ? hex2rgba(color,0.5) : "rgba(255,255,255,0.08)"} strokeWidth="0.5"/>
                      {/* Label text */}
                      <text x={x} y={y + r + 12} textAnchor="middle"
                        fill={isHov ? "#ffffff" : "#94a3b8"}
                        fontSize={isHov ? "7.5" : "7"} fontFamily="Segoe UI, sans-serif"
                        fontWeight={isHov ? "700" : "400"}>{c.name}</text>
                      {/* Hover badge */}
                      {isHov && <>
                        <rect x={x - 34} y={y - r - 22} width={68} height={16} rx={4}
                          fill="rgba(4,8,20,0.95)" stroke={color} strokeWidth="0.8"/>
                        <text x={x} y={y - r - 12} textAnchor="middle" fill={color}
                          fontSize="7.5" fontFamily="Segoe UI, sans-serif" fontWeight="700">
                          {c.totalOrders.toLocaleString()} orders
                        </text>
                      </>}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={s.mapHint}>↑ Click any city dot to explore neighborhoods</div>
          </div>

          {/* ── City Cards ── */}
          <div style={s.cardsPanel} className="moneymap-scroll">
            <div style={s.cardsPanelHdr}>
              <span style={s.cardsPanelTitle}>ALL CITIES</span>
              <span style={s.cardsPanelSub}>{filteredCities.length} tracked · click to drill down</span>
            </div>
            <div style={s.cardGrid}>
              {[...filteredCities].sort((a, b) => b.totalOrders - a.totalOrders).map((c, i) => {
                const max   = Math.max(...cities.map(x => x.totalOrders));
                const pct   = Math.round((c.totalOrders / max) * 100);
                const color = CITY_COLORS[c.name] || "#3b82f6";
                const medal = i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <div key={c.name} style={{ ...s.cityCard, borderColor: i < 3 ? color + "55" : "#1e2d45" }}
                    onClick={() => loadCity(c.name)}>
                    <div style={s.ccTop}>
                      <div>
                        <div style={s.ccName}>{c.name}</div>
                        <div style={s.ccState}>{c.state}</div>
                      </div>
                      <div style={s.ccMedal}>
                        {medal || <span style={{ fontSize: 12, color: "#334155" }}>#{i+1}</span>}
                      </div>
                    </div>
                    {/* Revenue bar */}
                    <div style={s.ccBarTrack}>
                      <div style={{ ...s.ccBarFill, width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}/>
                    </div>
                    {/* Stats */}
                    <div style={s.ccStats}>
                      <div style={s.ccStat}>
                        <span style={s.ccStatV}>{c.totalOrders.toLocaleString()}</span>
                        <span style={s.ccStatL}>orders</span>
                      </div>
                      <div style={s.ccStatDivider}/>
                      <div style={s.ccStat}>
                        <span style={s.ccStatV}>₹{c.avgOrderVal}</span>
                        <span style={s.ccStatL}>avg</span>
                      </div>
                      <div style={s.ccStatDivider}/>
                      <div style={s.ccStat}>
                        <span style={{ ...s.ccStatV, color: c.opportunities > 2 ? "#22c55e" : "#f1f5f9" }}>{c.opportunities}</span>
                        <span style={s.ccStatL}>openings</span>
                      </div>
                    </div>
                    <div style={{ ...s.ccExplore, color }}>Explore neighborhoods →</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════
  // CITY DRILL-DOWN VIEW
  // ═══════════════════════════════════════
  const cityColor = CITY_COLORS[selectedCity] || "#f6a623";

  return (
    <div style={s.page} className="moneymap-root">
    <style>{`
      .moneymap-scroll::-webkit-scrollbar { width: 4px; }
      .moneymap-scroll::-webkit-scrollbar-track { background: #070d1c; }
      .moneymap-scroll::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
      .moneymap-scroll::-webkit-scrollbar-thumb:hover { background: #2563eb; }
    `}</style>

      {/* Header */}
      <div style={s.hdr}>
        <button style={s.backBtn} onClick={() => { setView("india"); setCityData(null); setSelectedN(null); }}>
          ← India Map
        </button>
        <div style={s.hdrLeft}>
          <span style={{ ...s.cityDot, background: cityColor }}/>
          <div>
            <div style={s.hdrTitle}>{selectedCity}</div>
            <div style={s.hdrSub}>{cityData?.state} · {cityData?.neighborhoods?.length} neighborhoods</div>
          </div>
        </div>
        <div style={s.modePills}>
          {[{k:"heat",l:"🌡️ Demand"},{k:"opportunity",l:"📍 Openings"},{k:"category",l:"🎨 Category"}].map(m => (
            <button key={m.k}
              style={{ ...s.modePill, ...(mode===m.k ? { background: cityColor+"22", borderColor: cityColor+"88", color: "#f1f5f9" } : {}) }}
              onClick={() => setMode(m.k)}>{m.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={s.loadScreen}><div style={s.spinner}/></div>
      ) : cityData && (
        <>
          {/* ── Stat strip ── */}
          <div style={s.statStrip}>
            {[
              { i:"📦", l:"Total Orders",   v: cityData.summary.totalOrders.toLocaleString(), c:"#f6a623" },
              { i:"💰", l:"Revenue / Month",v: `₹${(cityData.summary.totalRevenue/100000).toFixed(1)}L`, c:"#22c55e" },
              { i:"🛵", l:"Avg Order",      v: `₹${cityData.summary.avgOrderValue}`, c:"#60a5fa" },
              { i:"🏆", l:"Top Area",       v: cityData.summary.topNeighborhood, c:"#a855f7" },
              { i:"📍", l:"Shop Openings",  v: cityData.opportunities.length, c:"#f472b6" },
            ].map((c, i) => (
              <div key={i} style={{ ...s.statCell, borderRight: i < 4 ? "1px solid #1e2d45" : "none" }}>
                <span style={s.statCellIcon}>{c.i}</span>
                <div>
                  <div style={{ ...s.statCellV, color: c.c }}>{c.v}</div>
                  <div style={s.statCellL}>{c.l}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Main content ── */}
          <div style={s.cityMain}>
            {/* Canvas map */}
            <div style={s.mapArea}>
              <div style={{ position: "relative" }}>
                <canvas ref={canvasRef} width={560} height={390} style={s.canvas}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMove}
                  onMouseLeave={() => setTooltip(null)}/>
                {/* Tooltip */}
                {tooltip && (
                  <div style={{ ...s.tooltip, left: tooltip.x, top: tooltip.y }}>
                    <div style={s.ttName}>{tooltip.n.name}</div>
                    <div style={s.ttLine}>📦 {tooltip.n.orders} orders / month</div>
                    <div style={s.ttLine}>💰 ₹{tooltip.n.avgOrderVal} avg order</div>
                    <div style={s.ttLine}>🏷️ Top: {tooltip.n.topCategories[0]}</div>
                    <div style={s.ttLine}>{tooltip.n.hasShop ? "🏪 Shop exists" : "📍 No shop — opportunity!"}</div>
                  </div>
                )}
                {/* Legend */}
                <div style={s.mapLegend}>
                  {mode === "opportunity" && <div style={s.legLine}><span style={{ color:"#22c55e" }}>⬡</span> = no shop yet</div>}
                  <div style={s.legLine}><span>🏪</span> existing shop</div>
                  <div style={s.legLine}><span style={s.legDot}/> demand level</div>
                </div>
              </div>
              <div style={s.modeDesc}>
                {mode==="heat"       && "💡 Bubble size = order volume. Hover to preview, click to inspect."}
                {mode==="opportunity"&& "💡 Dashed rings = high demand with no shop nearby. Best spots to expand."}
                {mode==="category"   && "💡 Color = top-selling category per neighborhood. Click for full breakdown."}
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div style={s.sidebar} className="moneymap-scroll">

              {/* Neighborhood detail card */}
              {selectedN ? (
                <div style={s.detCard}>
                  <div style={s.detHead}>
                    <div>
                      <div style={s.detName}>{selectedN.name}</div>
                      <div style={s.detSub}>Population: {selectedN.population.toLocaleString()}</div>
                    </div>
                    <span style={selectedN.hasShop ? s.tagGreen : s.tagPurple}>
                      {selectedN.hasShop ? "🏪 Has Shop" : "📍 Opportunity"}
                    </span>
                  </div>
                  {/* 3 stat boxes */}
                  <div style={s.detStats}>
                    <div style={s.detStatBox}>
                      <div style={s.detStatV}>{selectedN.orders}</div>
                      <div style={s.detStatL}>orders / mo</div>
                    </div>
                    <div style={s.detStatBox}>
                      <div style={s.detStatV}>₹{selectedN.avgOrderVal}</div>
                      <div style={s.detStatL}>avg order</div>
                    </div>
                    <div style={s.detStatBox}>
                      <div style={s.detStatV}>₹{(selectedN.orders * selectedN.avgOrderVal / 100000).toFixed(1)}L</div>
                      <div style={s.detStatL}>rev / mo</div>
                    </div>
                  </div>
                  {/* Categories */}
                  <div style={s.detSection}>WHAT PEOPLE BUY HERE</div>
                  {selectedN.topCategories.map((cat, i) => (
                    <div key={i} style={s.catRow}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:CAT_COLOR[cat]||"#888", flexShrink:0 }}/>
                      <span style={s.catLabel}>{cat}</span>
                      <span style={{ ...s.catRank, color:["#f6a623","#94a3b8","#22c55e"][i] }}>#{i+1}</span>
                    </div>
                  ))}
                  {/* AI Prediction */}
                  {!selectedN.hasShop && (
                    <div style={s.predBox}>
                      <div style={s.predTitle}>🤖 AI PREDICTION</div>
                      <div style={s.predLine}>Monthly revenue est: <strong style={{color:"#4ade80"}}>₹{(selectedN.orders * selectedN.avgOrderVal * 0.3 / 1000).toFixed(0)}K</strong></div>
                      <div style={s.predLine}>Demand: <strong style={{color:selectedN.orders>1500?"#f97316":selectedN.orders>1000?"#22c55e":"#60a5fa"}}>{selectedN.orders>1500?"🔥 Very High":selectedN.orders>1000?"📈 High":"📊 Medium"}</strong></div>
                      <div style={s.predLine}>Break-even: <strong style={{color:"#a78bfa"}}>~3–4 months</strong></div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={s.emptyCard}>
                  <div style={{fontSize:30,marginBottom:10}}>🗺️</div>
                  <div style={s.emptyCardText}>Click a bubble on the map to inspect that neighborhood</div>
                </div>
              )}

              {/* Top opportunities */}
              <div style={s.sideSection}>
                <div style={s.sideSectionTitle}>📍 TOP SHOP OPPORTUNITIES</div>
                {cityData.opportunities.slice(0, 4).map((o, i) => (
                  <div key={i} style={s.oppRow} onClick={() => setSelectedN(o)}>
                    <span style={s.oppMedal}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                    <div style={{ flex:1 }}>
                      <div style={s.oppName}>{o.name}</div>
                      <div style={s.oppDemand}>{o.demand}</div>
                    </div>
                    <div style={s.oppRevenue}>₹{(o.monthlyPotential/1000).toFixed(0)}K</div>
                  </div>
                ))}
              </div>

              {/* Category ranking */}
              <div style={s.sideSection}>
                <div style={s.sideSectionTitle}>📊 CATEGORY RANKING</div>
                {cityData.categoryRanking.slice(0, 6).map((c, i) => {
                  const max = cityData.categoryRanking[0].score;
                  return (
                    <div key={i} style={s.crRow}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:c.color, display:"inline-block", flexShrink:0 }}/>
                      <span style={s.crName}>{c.category}</span>
                      <div style={s.crTrack}>
                        <div style={{ height:"100%", borderRadius:3, background:c.color, width:`${(c.score/max)*100}%`, transition:"width .6s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
const s = {
  // Layout
  page:         { height:"100vh", overflow:"hidden", background:"#060c1a", fontFamily:"'Segoe UI', system-ui, sans-serif", color:"#e2e8f0", display:"flex", flexDirection:"column" },
  hdr:          { background:"#070d1c", borderBottom:"1px solid #1a2540", padding:"0 20px", height:56, display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:30, boxShadow:"0 2px 16px rgba(0,0,0,0.5)" },
  backBtn:      { padding:"6px 12px", borderRadius:8, border:"1px solid #1a2540", background:"#0e1a2e", cursor:"pointer", fontSize:12, color:"#94a3b8", flexShrink:0, fontFamily:"inherit" },
  hdrLeft:      { display:"flex", alignItems:"center", gap:10, flex:1 },
  hdrEmoji:     { fontSize:20 },
  cityDot:      { width:12, height:12, borderRadius:"50%", flexShrink:0 },
  hdrTitle:     { fontSize:16, fontWeight:700, color:"#f8fafc", lineHeight:1.2 },
  hdrSub:       { fontSize:11, color:"#475569", marginTop:2 },
  modePills:    { display:"flex", gap:6 },
  modePill:     { padding:"6px 12px", borderRadius:20, border:"1px solid #1a2540", background:"transparent", cursor:"pointer", fontSize:12, color:"#64748b", fontFamily:"inherit" },
  loadScreen:   { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh" },
  spinner:      { width:40, height:40, border:"3px solid #1a2540", borderTopColor:"#f6a623", borderRadius:"50%", animation:"spin 0.8s linear infinite" },

  // Search
  searchBox:    { position:"relative", display:"flex", alignItems:"center", background:"#0e1a2e", border:"1px solid #1a2540", borderRadius:10, padding:"0 10px", width:240 },
  searchIco:    { position:"absolute", left:10, color:"#475569", fontSize:13, pointerEvents:"none" },
  searchIn:     { background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:13, fontFamily:"inherit", width:"100%", padding:"9px 24px 9px 22px" },
  clearX:       { position:"absolute", right:8, background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:12 },
  dropbox:      { position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#0e1a2e", border:"1px solid #1a2540", borderRadius:10, zIndex:50, overflow:"hidden", boxShadow:"0 8px 28px rgba(0,0,0,0.7)" },
  dropItem:     { display:"flex", alignItems:"center", gap:8, padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #1a2540" },
  dropCity:     { fontSize:13, fontWeight:600, color:"#f1f5f9", flex:1 },
  dropState:    { fontSize:11, color:"#475569" },
  dropOrders:   { fontSize:11, fontWeight:600 },

  // India overview
  indiaLayout:  { display:"grid", gridTemplateColumns:"340px 1fr", flex:1, minHeight:0, overflow:"hidden" },
  mapPanel:     { background:"#070d1c", borderRight:"1px solid #1a2540", padding:"20px 16px", display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1e3a5f #070d1c" },
  mapPanelTitle:{ fontSize:10, letterSpacing:3, color:"#334155", marginBottom:14, fontWeight:700 },
  svgWrap:      { width:"100%", maxWidth:310 },
  svg:          { width:"100%", filter:"drop-shadow(0 0 18px rgba(10,40,90,0.8))" },
  mapHint:      { fontSize:11, color:"#334155", marginTop:12, textAlign:"center" },
  cardsPanel:   { padding:"20px", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"#1e3a5f #070d1c" },
  cardsPanelHdr:{ marginBottom:16, display:"flex", alignItems:"baseline", gap:10 },
  cardsPanelTitle:{ fontSize:12, fontWeight:700, color:"#64748b", letterSpacing:2 },
  cardsPanelSub:{ fontSize:11, color:"#334155" },
  cardGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12 },
  cityCard:     { background:"#070d1c", border:"1px solid #1a2540", borderRadius:14, padding:16, cursor:"pointer", transition:"transform .15s, box-shadow .15s" },
  ccTop:        { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  ccName:       { fontSize:15, fontWeight:700, color:"#f1f5f9" },
  ccState:      { fontSize:11, color:"#475569", marginTop:3 },
  ccMedal:      { fontSize:18 },
  ccBarTrack:   { height:3, background:"#1a2540", borderRadius:2, overflow:"hidden", marginBottom:14 },
  ccBarFill:    { height:"100%", borderRadius:2 },
  ccStats:      { display:"flex", alignItems:"center", marginBottom:12 },
  ccStat:       { flex:1, textAlign:"center" },
  ccStatV:      { display:"block", fontSize:15, fontWeight:700, color:"#f1f5f9" },
  ccStatL:      { display:"block", fontSize:9, color:"#475569", marginTop:1, letterSpacing:1 },
  ccStatDivider:{ width:1, height:28, background:"#1a2540", flexShrink:0 },
  ccExplore:    { fontSize:11, textAlign:"right", fontWeight:600 },

  // City view stat strip
  statStrip:    { display:"flex", background:"#070d1c", borderBottom:"1px solid #1a2540", overflowX:"auto", flexShrink:0 },
  statCell:     { display:"flex", alignItems:"center", gap:10, flex:"0 0 auto", padding:"10px 16px", minWidth:140 },
  statCellIcon: { fontSize:18, flexShrink:0 },
  statCellV:    { fontSize:15, fontWeight:700, display:"block", whiteSpace:"nowrap" },
  statCellL:    { fontSize:9, color:"#475569", letterSpacing:1, marginTop:2, display:"block", whiteSpace:"nowrap" },

  // City map + sidebar
  cityMain:     { display:"grid", gridTemplateColumns:"1fr 320px", flex:1, minHeight:0 },
  mapArea:      { padding:16, borderRight:"1px solid #1a2540", overflowY:"auto", minHeight:0 },
  canvas:       { width:"100%", borderRadius:12, border:"1px solid #1a2540", cursor:"crosshair", display:"block" },
  tooltip:      { position:"absolute", background:"#07101e", border:"1px solid #1a2540", borderRadius:10, padding:"11px 15px", pointerEvents:"none", zIndex:10, minWidth:175, boxShadow:"0 8px 24px rgba(0,0,0,0.7)" },
  ttName:       { fontSize:13, fontWeight:700, color:"#f6a623", marginBottom:8 },
  ttLine:       { fontSize:12, color:"#94a3b8", marginBottom:4 },
  mapLegend:    { position:"absolute", bottom:14, left:14, background:"rgba(7,13,28,0.9)", border:"1px solid #1a2540", borderRadius:8, padding:"8px 12px" },
  legLine:      { display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b", marginBottom:3 },
  legDot:       { width:8, height:8, borderRadius:"50%", background:"#f6a623", opacity:.7, display:"inline-block" },
  modeDesc:     { marginTop:10, padding:"8px 14px", background:"#070d1c", border:"1px solid #1a2540", borderRadius:8, fontSize:12, color:"#475569" },

  // Sidebar
  sidebar:      { background:"#070d1c", padding:12, display:"flex", flexDirection:"column", gap:10, overflowY:"scroll", overflowX:"hidden", boxSizing:"border-box", width:"100%", minHeight:0, scrollbarWidth:"thin", scrollbarColor:"#1e3a5f #070d1c" },

  // Detail card
  detCard:      { background:"#0d1828", border:"1px solid #1a2540", borderRadius:12, padding:14, boxSizing:"border-box", minWidth:0 },
  detHead:      { display:"flex", flexDirection:"column", gap:8, marginBottom:14 },
  detName:      { fontSize:14, fontWeight:700, color:"#f1f5f9", wordBreak:"break-word" },
  detSub:       { fontSize:11, color:"#475569", marginTop:3 },
  tagGreen:     { fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, background:"#052e16", color:"#4ade80", border:"1px solid #166534", alignSelf:"flex-start", flexShrink:0 },
  tagPurple:    { fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, background:"#1a0533", color:"#a78bfa", border:"1px solid #6d28d9", alignSelf:"flex-start", flexShrink:0 },
  detStats:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"#1a2540", borderRadius:10, overflow:"hidden", marginBottom:14, minWidth:0 },
  detStatBox:   { background:"#0d1828", padding:"10px 4px", textAlign:"center", minWidth:0, overflow:"hidden" },
  detStatV:     { fontSize:13, fontWeight:700, color:"#f6a623", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  detStatL:     { fontSize:9, color:"#475569", marginTop:3, display:"block", letterSpacing:1 },
  detSection:   { fontSize:9, letterSpacing:2, color:"#475569", fontWeight:700, marginBottom:8 },
  catRow:       { display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #1a2540", minWidth:0 },
  catLabel:     { flex:1, fontSize:12, color:"#cbd5e1", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  catRank:      { fontSize:11, fontWeight:700 },
  predBox:      { background:"#081508", border:"1px solid #166534", borderRadius:8, padding:"11px 13px", marginTop:10, boxSizing:"border-box" },
  predTitle:    { fontSize:9, letterSpacing:2, color:"#22c55e", fontWeight:700, marginBottom:8 },
  predLine:     { fontSize:11, color:"#86efac", marginBottom:5 },
  emptyCard:    { background:"#0d1828", border:"1px dashed #1a2540", borderRadius:12, padding:"24px 16px", textAlign:"center", boxSizing:"border-box" },
  emptyCardText:{ fontSize:12, color:"#334155", lineHeight:1.5 },

  // Side sections
  sideSection:  { background:"#0d1828", border:"1px solid #1a2540", borderRadius:12, padding:14, boxSizing:"border-box", minWidth:0 },
  sideSectionTitle:{ fontSize:9, letterSpacing:2, color:"#475569", fontWeight:700, marginBottom:12 },
  oppRow:       { display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #1a2540", cursor:"pointer", minWidth:0 },
  oppMedal:     { fontSize:15, width:22, textAlign:"center", flexShrink:0 },
  oppName:      { fontSize:12, fontWeight:600, color:"#e2e8f0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  oppDemand:    { fontSize:10, color:"#64748b", marginTop:2 },
  oppRevenue:   { fontSize:14, fontWeight:700, color:"#22c55e", flexShrink:0 },
  crRow:        { display:"flex", alignItems:"center", gap:8, marginBottom:9, minWidth:0 },
  crName:       { fontSize:11, color:"#94a3b8", width:65, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  crTrack:      { flex:1, height:5, background:"#1a2540", borderRadius:3, overflow:"hidden" },
};