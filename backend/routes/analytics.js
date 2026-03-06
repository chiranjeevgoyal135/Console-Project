const express = require("express");
const router  = express.Router();

const salesLog    = [];
const shopRatings = {};
const shopOrders  = {};

const SHOPS = [
  { id:"shop_1", name:"QuickMart Delhi",           city:"Delhi"     },
  { id:"shop_2", name:"Blinkit Hub Mumbai",         city:"Mumbai"    },
  { id:"shop_3", name:"Zepto Express Bangalore",    city:"Bangalore" },
  { id:"shop_4", name:"Swiggy Instamart Jaipur",    city:"Jaipur"    },
  { id:"shop_5", name:"BigBasket Now Hyderabad",    city:"Hyderabad" },
  { id:"shop_6", name:"DMart Ready Chennai",        city:"Chennai"   },
];

const PRODUCTS = [
  { name:"Amul Gold Milk 1L",           category:"Dairy",     price:68,  emoji:"🥛" },
  { name:"Parle-G Biscuits 500g",       category:"Biscuits",  price:40,  emoji:"🍪" },
  { name:"Maggi Noodles 70g",           category:"Snacks",    price:14,  emoji:"🍜" },
  { name:"Tata Tea Gold 250g",          category:"Beverages", price:140, emoji:"🍵" },
  { name:"Britannia Good Day 200g",     category:"Biscuits",  price:35,  emoji:"🍪" },
  { name:"Lay's Classic 26g",           category:"Snacks",    price:20,  emoji:"🍿" },
  { name:"Basmati Rice 1kg",            category:"Grains",    price:120, emoji:"🌾" },
  { name:"Amul Butter 100g",            category:"Dairy",     price:55,  emoji:"🧈" },
  { name:"Kurkure Masala 40g",          category:"Snacks",    price:20,  emoji:"🍿" },
  { name:"Fortune Sunflower Oil 1L",    category:"Oils",      price:150, emoji:"🫙" },
  { name:"Oreo Original 300g",          category:"Biscuits",  price:85,  emoji:"🍪" },
  { name:"Nescafe Classic 50g",         category:"Beverages", price:175, emoji:"☕" },
  { name:"Dabur Honey 250g",            category:"Health",    price:175, emoji:"🍯" },
  { name:"Mother Dairy Curd 400g",      category:"Dairy",     price:45,  emoji:"🥣" },
  { name:"Britannia Brown Bread 400g",  category:"Bakery",    price:45,  emoji:"🍞" },
];

// Seed 300 historical sales over last 2 hours
function seed() {
  const now = Date.now();
  for (let i = 0; i < 300; i++) {
    const shop    = SHOPS[Math.floor(Math.random() * SHOPS.length)];
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const minsAgo = Math.floor(Math.random() * 120);
    salesLog.push({
      shopId: shop.id, shopName: shop.name, city: shop.city,
      productName: product.name, category: product.category,
      price: product.price, emoji: product.emoji,
      qty: Math.floor(Math.random() * 3) + 1,
      timestamp: now - minsAgo * 60000,
      buyer: ["Rahul S","Priya M","Amit K","Neha G","Ravi T","Sunita R"][Math.floor(Math.random()*6)],
    });
    shopOrders[shop.id] = (shopOrders[shop.id]||0) + 1;
  }
  SHOPS.forEach(shop => {
    const count = Math.floor(Math.random()*800)+200;
    shopRatings[shop.id] = {
      shopName: shop.name, city: shop.city,
      totalRating: (4.1 + Math.random()*0.8) * count, count,
    };
  });
  console.log("📊 Analytics seeded");
}
seed();

// Simulate a new live sale every 6 seconds
setInterval(() => {
  const shop    = SHOPS[Math.floor(Math.random() * SHOPS.length)];
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  salesLog.push({
    shopId: shop.id, shopName: shop.name, city: shop.city,
    productName: product.name, category: product.category,
    price: product.price, emoji: product.emoji,
    qty: Math.floor(Math.random()*3)+1,
    timestamp: Date.now(),
    buyer: ["Rahul S","Priya M","Amit K","Neha G","Ravi T","Sunita R"][Math.floor(Math.random()*6)],
    isLive: true,
  });
  shopOrders[shop.id] = (shopOrders[shop.id]||0) + 1;
  // Keep log from growing forever
  if (salesLog.length > 2000) salesLog.splice(0, 100);
}, 6000);

// POST /api/analytics/sale — record a real order
router.post("/sale", (req, res) => {
  const { shopId, shopName, city, items, buyer } = req.body;
  const now = Date.now();
  (items||[]).forEach(item => {
    salesLog.push({
      shopId, shopName: shopName||"Unknown Shop", city: city||"India",
      productName: item.name, category: item.category||"General",
      price: Number(item.price)||0, emoji: item.emoji||"🛍️",
      qty: Number(item.qty)||1, timestamp: now,
      buyer: buyer||"Customer", isLive: true,
    });
  });
  shopOrders[shopId] = (shopOrders[shopId]||0) + 1;
  res.json({ success:true });
});

// POST /api/analytics/rating
router.post("/rating", (req, res) => {
  const { shopId, shopName, city, rating } = req.body;
  if (!shopRatings[shopId]) shopRatings[shopId] = { shopName, city, totalRating:0, count:0 };
  shopRatings[shopId].totalRating += Number(rating);
  shopRatings[shopId].count       += 1;
  res.json({ success:true });
});

// GET /api/analytics/dashboard
router.get("/dashboard", (req, res) => {
  const now     = Date.now();
  const last1h  = now - 60*60*1000;
  const last24h = now - 24*60*60*1000;
  const recent  = salesLog.filter(s => s.timestamp >= last1h);

  // Fastest selling products
  const pv = {};
  recent.forEach(s => {
    if (!pv[s.productName]) pv[s.productName] = { name:s.productName, category:s.category, price:s.price, emoji:s.emoji||"🛍️", unitsSold:0, revenue:0, orders:0 };
    pv[s.productName].unitsSold += s.qty;
    pv[s.productName].revenue   += s.price * s.qty;
    pv[s.productName].orders    += 1;
  });
  const topProducts = Object.values(pv).sort((a,b)=>b.unitsSold-a.unitsSold).slice(0,8);

  // Top rated shops
  const topShops = Object.entries(shopRatings).map(([shopId, d]) => ({
    shopId, shopName:d.shopName, city:d.city,
    avgRating: (d.totalRating/d.count).toFixed(1),
    totalRatings: d.count, orders: shopOrders[shopId]||0,
  })).sort((a,b)=>b.avgRating-a.avgRating);

  // Category breakdown
  const cm = {};
  recent.forEach(s => { cm[s.category] = (cm[s.category]||0) + s.qty; });
  const categoryBreakdown = Object.entries(cm).map(([cat,units])=>({category:cat,units})).sort((a,b)=>b.units-a.units);

  // 15-min trend buckets (last 2h = 8 buckets)
  const trend = Array.from({length:8},(_,i)=>{
    const bucketStart = now - (8-i)*15*60*1000;
    const bucketEnd   = now - (7-i)*15*60*1000;
    const bucket      = salesLog.filter(s=>s.timestamp>=bucketStart && s.timestamp<bucketEnd);
    return {
      label: i===7?"Now":`${(7-i)*15}m`,
      orders:  bucket.length,
      revenue: bucket.reduce((s,x)=>s+x.price*x.qty,0),
    };
  });

  // Live feed — last 12 sales
  const liveFeed = [...salesLog].reverse().slice(0,12).map(s=>({
    shopName:s.shopName, city:s.city,
    productName:s.productName, emoji:s.emoji||"🛍️",
    price:s.price, qty:s.qty,
    buyer:s.buyer||"Customer",
    secsAgo: Math.round((now-s.timestamp)/1000),
  }));

  res.json({
    success:true,
    summary:{
      totalRevenue1h:  recent.reduce((s,x)=>s+x.price*x.qty,0),
      totalOrders1h:   recent.length,
      allRevenue24h:   salesLog.filter(s=>s.timestamp>=last24h).reduce((s,x)=>s+x.price*x.qty,0),
      activeShops:     new Set(recent.map(s=>s.shopId)).size,
      totalShops:      SHOPS.length,
    },
    topProducts, topShops, categoryBreakdown, trend, liveFeed,
    lastUpdated: new Date().toISOString(),
  });
});

module.exports = router;