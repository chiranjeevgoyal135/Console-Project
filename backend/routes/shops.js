// routes/shops.js
// AI generates realistic local shops based on detected city
// Shops are cached per city so they don't regenerate every request

const express = require("express");
const router  = express.Router();

// In-memory cache: city -> { shops, generatedAt }
const shopCache    = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Haversine distance formula
function haversine(lat1, lng1, lat2, lng2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Reverse geocode lat/lng → city name using free API
async function getCity(lat, lng) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { "User-Agent": "SmarterBlinkit/1.0" }
    });
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.state_district || "Delhi";
  } catch {
    return "Delhi";
  }
}

// Ask AI to generate realistic shops for a city
async function generateShopsForCity(city, lat, lng) {
  const prompt = `You are generating realistic data for an Indian grocery delivery app like Blinkit/Zepto.

Generate 8 realistic local grocery shops/dark stores near ${city}, India (near coordinates ${lat}, ${lng}).

Use real Indian shop name patterns: "QuickMart ${city}", "Blinkit Dark Store", "Zepto Hub", "Dunzo Express", "JioMart", "BigBasket Now", "Swiggy Instamart", "DMart Ready", plus some local names.

Spread them realistically within 1-8km of the coordinates. Each shop should have slightly different lat/lng offsets.

ONLY return valid JSON array, no markdown:
[
  {
    "id": "shop_1",
    "name": "QuickMart Koramangala",
    "type": "Dark Store",
    "city": "${city}",
    "area": "Koramangala",
    "lat": ${lat + 0.01},
    "lng": ${lng + 0.01},
    "address": "123 Main Road, Koramangala, ${city}",
    "baseDeliveryMins": 12,
    "deliveryFee": 20,
    "rating": 4.3,
    "totalOrders": 1250,
    "isOpen": true,
    "speciality": "Fastest delivery in area"
  }
]`;

  const groqRes  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant", max_tokens: 2000, temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const groqData = await groqRes.json();
  const rawText  = groqData.choices?.[0]?.message?.content || "[]";
  try {
    let cleaned = rawText.replace(/```json|```/gi,"").trim();
    cleaned = cleaned.replace(/}\s*{/g,"},{");
    // Try direct parse
    try { 
      const result = JSON.parse(cleaned);
      if (Array.isArray(result) && result.length > 0) return result;
    } catch(_) {}
    // Try extracting JSON array
    const arrM = cleaned.match(/\[[\s\S]*\]/);
    if (arrM) {
      try {
        const result = JSON.parse(arrM[0]);
        if (Array.isArray(result) && result.length > 0) return result;
      } catch(_) {}
    }
    console.log("Shop parse failed, using fallback. Raw:", rawText.slice(0,200));
    return getFallbackShops(city, lat, lng);
  } catch(e) {
    console.log("Shop generation error:", e.message);
    return getFallbackShops(city, lat, lng);
  }
}

// Fallback shops if AI fails
function getFallbackShops(city, lat, lng) {
  const names = ["QuickMart","Blinkit Hub","Zepto Express","BigBasket Now","Swiggy Instamart","DMart Ready","JioMart","Dunzo Express"];
  return names.map((name, i) => ({
    id:               `shop_${i+1}`,
    name:             `${name} ${city}`,
    type:             "Dark Store",
    city,
    area:             city,
    lat:              lat + (Math.random()-0.5)*0.05,
    lng:              lng + (Math.random()-0.5)*0.05,
    address:          `Store ${i+1}, ${city}`,
    baseDeliveryMins: 10 + i*2,
    deliveryFee:      15 + i*5,
    rating:           (4.0 + Math.random()*0.8).toFixed(1),
    totalOrders:      Math.floor(Math.random()*2000)+500,
    isOpen:           true,
    speciality:       "Fresh groceries delivered fast",
  }));
}

// GET /api/shops/nearest?lat=XX&lng=YY
router.get("/nearest", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ success:false, message:"lat and lng required" });

  try {
    // Get city name
    const city = await getCity(lat, lng);
    console.log(`📍 Detected city: ${city}`);

    // Check cache
    const cached = shopCache[city];
    let shops;
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
      console.log(`📦 Using cached shops for ${city}`);
      shops = cached.shops;
    } else {
      console.log(`🤖 Generating shops for ${city}...`);
      shops = await generateShopsForCity(city, lat, lng);
      shopCache[city] = { shops, generatedAt: Date.now() };
      console.log(`✅ Generated ${shops.length} shops for ${city}`);
    }

    // Calculate distance + delivery time for each shop
    const withDistance = shops.map(shop => {
      const dist         = haversine(lat, lng, shop.lat, shop.lng);
      const deliveryMins = Math.round(shop.baseDeliveryMins + dist * 0.5);
      return { ...shop, distanceKm: dist.toFixed(1), deliveryMins };
    }).sort((a,b) => a.distanceKm - b.distanceKm);

    res.json({ success:true, city, nearest: withDistance[0], all: withDistance });
  } catch(e) {
    console.error("Shops route error:", e.message);
    res.status(500).json({ success:false, message: e.message });
  }
});

// GET /api/shops/all — return all cached shops (for seller login)
router.get("/all", (req, res) => {
  const allShops = Object.values(shopCache).flatMap(c => c.shops);
  res.json({ success:true, shops: allShops });
});

// GET /api/shops/:id — get single shop
router.get("/:id", (req, res) => {
  const allShops = Object.values(shopCache).flatMap(c => c.shops);
  const shop     = allShops.find(s => s.id === req.params.id);
  if (!shop) return res.status(404).json({ success:false, message:"Shop not found" });
  res.json({ success:true, shop });
});

// DELETE /api/shops/cache — clear shop cache (for debugging)
router.delete("/cache", (req, res) => {
  Object.keys(shopCache).forEach(k => delete shopCache[k]);
  res.json({ success:true, message:"Cache cleared" });
});

module.exports = router;