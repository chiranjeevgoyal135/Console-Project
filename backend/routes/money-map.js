const express = require("express");
const router  = express.Router();

const CAT_COLOR = {
  Dairy:"#60a5fa", Snacks:"#f97316", Beverages:"#a78bfa", Grains:"#84cc16",
  Biscuits:"#fb923c", Health:"#34d399", Oils:"#fbbf24", Bakery:"#f472b6",
  Personal:"#38bdf8", Veggies:"#4ade80", General:"#94a3b8",
};

const ALL_CITIES = {
  Delhi:     { lat:28.66, lng:77.22, state:"Delhi",          neighborhoods:[
    { id:"d1", name:"Connaught Place",  lat:28.6315,lng:77.2167,population:45000,  orders:892, avgOrderVal:285,topCategories:["Snacks","Beverages","Biscuits"], hasShop:true  },
    { id:"d2", name:"Lajpat Nagar",     lat:28.5665,lng:77.2433,population:120000, orders:1240,avgOrderVal:320,topCategories:["Dairy","Grains","Oils"],         hasShop:true  },
    { id:"d3", name:"Dwarka",           lat:28.5921,lng:77.0460,population:350000, orders:2100,avgOrderVal:410,topCategories:["Grains","Dairy","Personal"],      hasShop:false },
    { id:"d4", name:"Rohini",           lat:28.7495,lng:77.0656,population:420000, orders:1890,avgOrderVal:380,topCategories:["Dairy","Snacks","Beverages"],     hasShop:false },
    { id:"d5", name:"Saket",            lat:28.5244,lng:77.2090,population:85000,  orders:760, avgOrderVal:520,topCategories:["Health","Beverages","Bakery"],    hasShop:true  },
    { id:"d6", name:"Karol Bagh",       lat:28.6519,lng:77.1909,population:200000, orders:1560,avgOrderVal:290,topCategories:["Biscuits","Snacks","Grains"],     hasShop:true  },
    { id:"d7", name:"Noida Sec 18",     lat:28.5672,lng:77.3210,population:180000, orders:980, avgOrderVal:460,topCategories:["Beverages","Health","Personal"],  hasShop:false },
    { id:"d8", name:"Janakpuri",        lat:28.6215,lng:77.0820,population:260000, orders:1720,avgOrderVal:350,topCategories:["Dairy","Grains","Biscuits"],      hasShop:false },
  ]},
  Mumbai:    { lat:19.07, lng:72.88, state:"Maharashtra",    neighborhoods:[
    { id:"m1", name:"Andheri West",     lat:19.1136,lng:72.8697,population:380000, orders:2450,avgOrderVal:390,topCategories:["Snacks","Beverages","Dairy"],     hasShop:true  },
    { id:"m2", name:"Bandra",           lat:19.0596,lng:72.8295,population:120000, orders:1850,avgOrderVal:620,topCategories:["Health","Bakery","Beverages"],    hasShop:true  },
    { id:"m3", name:"Borivali",         lat:19.2307,lng:72.8567,population:450000, orders:2100,avgOrderVal:310,topCategories:["Grains","Dairy","Oils"],          hasShop:false },
    { id:"m4", name:"Thane",            lat:19.2183,lng:72.9781,population:520000, orders:1680,avgOrderVal:285,topCategories:["Grains","Snacks","Biscuits"],     hasShop:false },
    { id:"m5", name:"Powai",            lat:19.1176,lng:72.9060,population:95000,  orders:890, avgOrderVal:510,topCategories:["Health","Beverages","Personal"],  hasShop:false },
    { id:"m6", name:"Dadar",            lat:19.0178,lng:72.8478,population:210000, orders:1420,avgOrderVal:260,topCategories:["Grains","Oils","Dairy"],          hasShop:true  },
  ]},
  Bangalore: { lat:12.97, lng:77.59, state:"Karnataka",      neighborhoods:[
    { id:"b1", name:"Koramangala",      lat:12.9279,lng:77.6271,population:180000, orders:2890,avgOrderVal:480,topCategories:["Beverages","Health","Snacks"],    hasShop:true  },
    { id:"b2", name:"Indiranagar",      lat:12.9784,lng:77.6408,population:140000, orders:2240,avgOrderVal:520,topCategories:["Health","Bakery","Dairy"],        hasShop:true  },
    { id:"b3", name:"Whitefield",       lat:12.9698,lng:77.7500,population:320000, orders:1980,avgOrderVal:440,topCategories:["Grains","Dairy","Personal"],      hasShop:false },
    { id:"b4", name:"Electronic City",  lat:12.8399,lng:77.6770,population:280000, orders:1540,avgOrderVal:390,topCategories:["Snacks","Beverages","Biscuits"], hasShop:false },
    { id:"b5", name:"Jayanagar",        lat:12.9308,lng:77.5830,population:200000, orders:1120,avgOrderVal:310,topCategories:["Grains","Oils","Dairy"],          hasShop:true  },
    { id:"b6", name:"HSR Layout",       lat:12.9116,lng:77.6389,population:160000, orders:1680,avgOrderVal:460,topCategories:["Health","Beverages","Personal"],  hasShop:false },
  ]},
  Jaipur:    { lat:26.91, lng:75.79, state:"Rajasthan",      neighborhoods:[
    { id:"j1", name:"Malviya Nagar",    lat:26.8523,lng:75.8016,population:140000, orders:980, avgOrderVal:290,topCategories:["Grains","Dairy","Oils"],          hasShop:true  },
    { id:"j2", name:"Vaishali Nagar",   lat:26.9000,lng:75.7400,population:210000, orders:1240,avgOrderVal:320,topCategories:["Snacks","Biscuits","Beverages"],  hasShop:false },
    { id:"j3", name:"Civil Lines",      lat:26.9260,lng:75.8235,population:80000,  orders:620, avgOrderVal:480,topCategories:["Health","Bakery","Dairy"],        hasShop:false },
    { id:"j4", name:"Mansarovar",       lat:26.8521,lng:75.7476,population:280000, orders:1560,avgOrderVal:275,topCategories:["Grains","Oils","Dairy"],          hasShop:false },
  ]},
  Hyderabad: { lat:17.38, lng:78.49, state:"Telangana",      neighborhoods:[
    { id:"h1", name:"Hitech City",      lat:17.4435,lng:78.3772,population:220000, orders:2340,avgOrderVal:510,topCategories:["Beverages","Health","Snacks"],    hasShop:true  },
    { id:"h2", name:"Banjara Hills",    lat:17.4156,lng:78.4347,population:95000,  orders:1120,avgOrderVal:640,topCategories:["Health","Bakery","Beverages"],    hasShop:true  },
    { id:"h3", name:"Kukatpally",       lat:17.4849,lng:78.3995,population:380000, orders:1890,avgOrderVal:310,topCategories:["Grains","Dairy","Oils"],          hasShop:false },
    { id:"h4", name:"Secunderabad",     lat:17.4399,lng:78.4983,population:310000, orders:1340,avgOrderVal:285,topCategories:["Grains","Snacks","Biscuits"],     hasShop:false },
  ]},
  Chennai:   { lat:13.08, lng:80.27, state:"Tamil Nadu",     neighborhoods:[
    { id:"c1", name:"Anna Nagar",       lat:13.0850,lng:80.2101,population:200000, orders:1650,avgOrderVal:360,topCategories:["Dairy","Grains","Beverages"],     hasShop:true  },
    { id:"c2", name:"T Nagar",          lat:13.0418,lng:80.2341,population:180000, orders:1420,avgOrderVal:320,topCategories:["Grains","Oils","Snacks"],         hasShop:true  },
    { id:"c3", name:"Velachery",        lat:12.9754,lng:80.2183,population:280000, orders:1780,avgOrderVal:290,topCategories:["Grains","Dairy","Biscuits"],      hasShop:false },
    { id:"c4", name:"OMR",              lat:12.9010,lng:80.2279,population:320000, orders:2100,avgOrderVal:440,topCategories:["Beverages","Health","Snacks"],    hasShop:false },
  ]},
  Pune:      { lat:18.52, lng:73.85, state:"Maharashtra",    neighborhoods:[
    { id:"p1", name:"Koregaon Park",    lat:18.5362,lng:73.8936,population:85000,  orders:980, avgOrderVal:580,topCategories:["Health","Bakery","Beverages"],    hasShop:true  },
    { id:"p2", name:"Hinjawadi",        lat:18.5912,lng:73.7392,population:240000, orders:1540,avgOrderVal:420,topCategories:["Snacks","Beverages","Grains"],    hasShop:false },
    { id:"p3", name:"Kothrud",          lat:18.5074,lng:73.8076,population:310000, orders:1890,avgOrderVal:310,topCategories:["Grains","Dairy","Oils"],          hasShop:false },
    { id:"p4", name:"Wakad",            lat:18.5985,lng:73.7614,population:180000, orders:1120,avgOrderVal:360,topCategories:["Dairy","Snacks","Biscuits"],      hasShop:false },
  ]},
  Kolkata:   { lat:22.57, lng:88.36, state:"West Bengal",    neighborhoods:[
    { id:"k1", name:"Salt Lake",        lat:22.5726,lng:88.4120,population:180000, orders:1240,avgOrderVal:340,topCategories:["Dairy","Grains","Oils"],          hasShop:true  },
    { id:"k2", name:"New Town",         lat:22.5958,lng:88.4729,population:220000, orders:1560,avgOrderVal:380,topCategories:["Beverages","Health","Snacks"],    hasShop:false },
    { id:"k3", name:"Park Street",      lat:22.5521,lng:88.3512,population:65000,  orders:720, avgOrderVal:520,topCategories:["Bakery","Beverages","Health"],    hasShop:true  },
    { id:"k4", name:"Howrah",           lat:22.5958,lng:88.2636,population:400000, orders:1340,avgOrderVal:240,topCategories:["Grains","Oils","Dairy"],          hasShop:false },
  ]},
};

router.get("/cities", (req, res) => {
  const cities = Object.entries(ALL_CITIES).map(([name, d]) => {
    const totalOrders   = d.neighborhoods.reduce((s,n)=>s+n.orders,0);
    const totalRevenue  = d.neighborhoods.reduce((s,n)=>s+n.orders*n.avgOrderVal,0);
    const opportunities = d.neighborhoods.filter(n=>!n.hasShop).length;
    return { name, lat:d.lat, lng:d.lng, state:d.state, totalOrders, totalRevenue,
      avgOrderVal: Math.round(totalRevenue/totalOrders), opportunities,
      intensity: Math.min(1, totalOrders/12000) };
  });
  res.json({ success:true, cities });
});

router.get("/", (req, res) => {
  const city = req.query.city;
  const data = ALL_CITIES[city];
  if (!data) return res.status(404).json({ success:false, message:"City not found" });

  const neighborhoods = data.neighborhoods;
  const maxOrders     = Math.max(...neighborhoods.map(n=>n.orders));

  const opportunities = neighborhoods.filter(n=>!n.hasShop).map(n=>({
    ...n,
    score:          Math.round((n.orders*n.avgOrderVal)/1000),
    demand:         n.orders>1500?"🔥 Very High":n.orders>1000?"📈 High":n.orders>600?"📊 Medium":"📉 Low",
    monthlyPotential: Math.round(n.orders*n.avgOrderVal*30),
  })).sort((a,b)=>b.score-a.score);

  const catMap = {};
  neighborhoods.forEach(n=>n.topCategories.forEach((cat,i)=>{
    catMap[cat]=(catMap[cat]||0)+n.orders*(3-i)/3;
  }));
  const categoryRanking = Object.entries(catMap)
    .map(([cat,score])=>({category:cat,score:Math.round(score),color:CAT_COLOR[cat]||"#94a3b8"}))
    .sort((a,b)=>b.score-a.score);

  const totalOrders  = neighborhoods.reduce((s,n)=>s+n.orders,0);
  const totalRevenue = neighborhoods.reduce((s,n)=>s+n.orders*n.avgOrderVal,0);
  const topNeighborhood = [...neighborhoods].sort((a,b)=>b.orders-a.orders)[0];

  res.json({
    success:true, city, state:data.state,
    neighborhoods: neighborhoods.map(n=>({...n,intensity:n.orders/maxOrders,color:CAT_COLOR[n.topCategories[0]]||"#f6a623"})),
    opportunities, categoryRanking,
    summary:{ totalOrders, totalRevenue, topNeighborhood:topNeighborhood.name, avgOrderValue:Math.round(totalRevenue/totalOrders) },
    availableCities: Object.keys(ALL_CITIES),
  });
});

module.exports = router;