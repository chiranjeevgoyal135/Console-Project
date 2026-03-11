// backend/routes/analytics.js  (MongoDB version)
// Historical data comes from MongoDB.
// Live simulation still uses an in-memory buffer (last 50 live sales)
// so the Owner dashboard gets real-time feel without hammering the DB.
const express = require("express");
const router  = express.Router();
const Sale    = require("../models/Sale");

// ── In-memory buffer for LIVE sales only ──
const liveBuffer = [];

const SHOPS = [
  { id:"shop_1", name:"QuickMart Delhi",           city:"Delhi"     },
  { id:"shop_2", name:"Blinkit Hub Mumbai",         city:"Mumbai"    },
  { id:"shop_3", name:"Zepto Express Bangalore",    city:"Bangalore" },
  { id:"shop_4", name:"Swiggy Instamart Jaipur",    city:"Jaipur"    },
  { id:"shop_5", name:"BigBasket Now Hyderabad",    city:"Hyderabad" },
  { id:"shop_6", name:"DMart Ready Chennai",        city:"Chennai"   },
];
const SALE_PRODUCTS = [
  { name:"Amul Milk 500ml",       category:"Dairy",     price:28,  emoji:"🥛" },
  { name:"Parle-G Biscuits 250g", category:"Biscuits",  price:20,  emoji:"🍪" },
  { name:"Maggi Noodles 70g",     category:"Snacks",    price:14,  emoji:"🍜" },
  { name:"Tata Tea Gold 250g",    category:"Beverages", price:140, emoji:"🍵" },
  { name:"Lay's Classic 26g",     category:"Snacks",    price:20,  emoji:"🍿" },
  { name:"Basmati Rice 1kg",      category:"Grains",    price:120, emoji:"🌾" },
  { name:"Amul Butter 100g",      category:"Dairy",     price:55,  emoji:"🧈" },
  { name:"Sunflower Oil 1L",      category:"Oils",      price:150, emoji:"🫙" },
  { name:"Nescafe Classic 50g",   category:"Beverages", price:175, emoji:"☕" },
  { name:"Brown Bread 400g",      category:"Bakery",    price:45,  emoji:"🍞" },
];
const BUYERS = ["Rahul S","Priya M","Amit K","Neha G","Ravi T","Sunita R"];

// Simulate live sale every 6 seconds — write to DB AND buffer
setInterval(async () => {
  const shop    = SHOPS[Math.floor(Math.random() * SHOPS.length)];
  const product = SALE_PRODUCTS[Math.floor(Math.random() * SALE_PRODUCTS.length)];
  const sale = {
    shopId: shop.id, shopName: shop.name, city: shop.city,
    productName: product.name, category: product.category,
    price: product.price, emoji: product.emoji,
    qty:   Math.floor(Math.random() * 3) + 1,
    buyer: BUYERS[Math.floor(Math.random() * BUYERS.length)],
    isLive: true,
    timestamp: new Date(),
  };
  // Write to MongoDB
  try { await Sale.create(sale); } catch {}
  // Push to live buffer
  liveBuffer.push(sale);
  if (liveBuffer.length > 50) liveBuffer.shift();
}, 6000);

// ── GET /api/analytics/dashboard ──
router.get("/dashboard", async (req, res) => {
  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // last 2 hours

    // Fetch recent sales from MongoDB
    const sales = await Sale.find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    // Merge with live buffer (may have sales not yet flushed)
    const allSales = [...sales, ...liveBuffer];

    // Top products by units sold
    const prodMap = {};
    allSales.forEach(s => {
      if (!prodMap[s.productName]) prodMap[s.productName] = { name:s.productName, emoji:s.emoji, category:s.category, units:0, revenue:0 };
      prodMap[s.productName].units   += s.qty;
      prodMap[s.productName].revenue += s.price * s.qty;
    });
    const topProducts = Object.values(prodMap).sort((a,b) => b.units - a.units).slice(0, 8);

    // Top shops by order count
    const shopMap = {};
    allSales.forEach(s => {
      if (!shopMap[s.shopId]) shopMap[s.shopId] = { shopId:s.shopId, shopName:s.shopName, city:s.city, orders:0, revenue:0 };
      shopMap[s.shopId].orders++;
      shopMap[s.shopId].revenue += s.price * s.qty;
    });
    const topShops = Object.values(shopMap).sort((a,b) => b.orders - a.orders);

    // 15-minute trend buckets (last 2 hours = 8 buckets)
    const buckets = {};
    for (let i = 7; i >= 0; i--) {
      const t = new Date(Date.now() - i * 15 * 60000);
      const label = t.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
      buckets[label] = { time: label, orders:0, revenue:0 };
    }
    allSales.forEach(s => {
      const d      = new Date(s.timestamp);
      const bucket = Math.floor((Date.now() - d.getTime()) / (15*60000));
      if (bucket < 8) {
        const label = new Date(Date.now() - bucket * 15 * 60000)
          .toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
        if (buckets[label]) { buckets[label].orders++; buckets[label].revenue += s.price * s.qty; }
      }
    });

    // Category breakdown
    const catMap = {};
    allSales.forEach(s => { catMap[s.category] = (catMap[s.category]||0) + 1; });
    const categoryBreakdown = Object.entries(catMap)
      .map(([cat,count]) => ({ category:cat, count }))
      .sort((a,b) => b.count - a.count);

    // Live feed (last 15)
    const liveFeed = [...liveBuffer].reverse().slice(0, 15);

    res.json({
      success: true,
      totalOrders:  allSales.length,
      totalRevenue: allSales.reduce((s,x) => s + x.price * x.qty, 0),
      topProducts,
      topShops,
      trend: Object.values(buckets),
      categoryBreakdown,
      liveFeed,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ success:false, message:"DB error" });
  }
});

// ── POST /api/analytics/sale — record a real purchase ──
router.post("/sale", async (req, res) => {
  try {
    const sale = await Sale.create({ ...req.body, timestamp: new Date(), isLive: true });
    liveBuffer.push(sale.toObject());
    if (liveBuffer.length > 50) liveBuffer.shift();
    res.json({ success:true });
  } catch (err) {
    res.status(500).json({ success:false, message:"DB error" });
  }
});

// ── POST /api/analytics/rating ──
router.post("/rating", async (req, res) => {
  // Ratings stored in-memory (can extend to a Rating model later)
  res.json({ success:true });
});

module.exports = router;