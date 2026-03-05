const express = require("express");
const router  = express.Router();

const shopInventories = {};

// Fallback inventory — always works even if Groq is down/rate-limited
function getFallbackInventory(shopName) {
  const seed = shopName.length; // slight variation per shop
  return [
    { barcode:"8901234560001", name:"Amul Gold Full Cream Milk 1L",     brand:"Amul",       category:"Dairy",     price:68,        stock:45+seed%10, unit:"packet", emoji:"🥛", lowStockThreshold:10 },
    { barcode:"8901234560002", name:"Amul Butter 100g",                  brand:"Amul",       category:"Dairy",     price:55,        stock:30,         unit:"pack",   emoji:"🧈", lowStockThreshold:5  },
    { barcode:"8901234560003", name:"Mother Dairy Curd 400g",            brand:"Mother Dairy",category:"Dairy",    price:45,        stock:25,         unit:"cup",    emoji:"🥣", lowStockThreshold:5  },
    { barcode:"8901234560004", name:"Parle-G Original Gluco Biscuits 500g",brand:"Parle",    category:"Biscuits",  price:40,        stock:80,         unit:"pack",   emoji:"🍪", lowStockThreshold:15 },
    { barcode:"8901234560005", name:"Britannia Good Day Butter 200g",    brand:"Britannia",  category:"Biscuits",  price:35,        stock:60,         unit:"pack",   emoji:"🍪", lowStockThreshold:10 },
    { barcode:"8901234560006", name:"Oreo Original Sandwich Biscuits 300g",brand:"Mondelez", category:"Biscuits",  price:85,        stock:40,         unit:"pack",   emoji:"🍪", lowStockThreshold:8  },
    { barcode:"8901234560007", name:"Maggi 2-Minute Noodles Masala 70g", brand:"Nestle",     category:"Snacks",    price:14,        stock:60,         unit:"packet", emoji:"🍜", lowStockThreshold:10 },
    { barcode:"8901234560008", name:"Lay's Classic Salted Chips 26g",    brand:"PepsiCo",    category:"Snacks",    price:20,        stock:50,         unit:"packet", emoji:"🍿", lowStockThreshold:10 },
    { barcode:"8901234560009", name:"Kurkure Masala Munch 40g",          brand:"PepsiCo",    category:"Snacks",    price:20,        stock:55,         unit:"packet", emoji:"🍿", lowStockThreshold:10 },
    { barcode:"8901234560010", name:"Basmati Rice 1kg",                  brand:"India Gate",  category:"Grains",   price:120,       stock:25,         unit:"bag",    emoji:"🌾", lowStockThreshold:5  },
    { barcode:"8901234560011", name:"Toor Dal 500g",                     brand:"Tata Sampann",category:"Grains",   price:80,        stock:18,         unit:"pack",   emoji:"🫘", lowStockThreshold:5  },
    { barcode:"8901234560012", name:"Tata Tea Gold 250g",                brand:"Tata",        category:"Beverages",price:140,       stock:30,         unit:"pack",   emoji:"🍵", lowStockThreshold:5  },
    { barcode:"8901234560013", name:"Nescafe Classic Instant Coffee 50g",brand:"Nestle",     category:"Beverages", price:175,       stock:20,         unit:"jar",    emoji:"☕", lowStockThreshold:5  },
    { barcode:"8901234560014", name:"Fortune Sunflower Refined Oil 1L",  brand:"Fortune",    category:"Oils",      price:150,       stock:12,         unit:"bottle", emoji:"🫙", lowStockThreshold:3  },
    { barcode:"8901234560015", name:"Britannia Brown Bread 400g",        brand:"Britannia",  category:"Bakery",    price:45,        stock:15,         unit:"loaf",   emoji:"🍞", lowStockThreshold:5  },
    { barcode:"8901234560016", name:"Dabur Honey 250g",                  brand:"Dabur",      category:"Health",    price:175,       stock:20,         unit:"bottle", emoji:"🍯", lowStockThreshold:5  },
    { barcode:"8901234560017", name:"Dettol Handwash Original 200ml",    brand:"Dettol",     category:"Personal",  price:85,        stock:8+(seed%5), unit:"bottle", emoji:"🧴", lowStockThreshold:3  },
    { barcode:"8901234560018", name:"Colgate Strong Teeth Toothpaste 200g",brand:"Colgate",  category:"Personal",  price:110,       stock:14,         unit:"tube",   emoji:"🪥", lowStockThreshold:3  },
    { barcode:"8901234560019", name:"Onions 1kg",                        brand:"Fresh",      category:"Veggies",   price:35,        stock:0,          unit:"kg",     emoji:"🧅", lowStockThreshold:5  },
    { barcode:"8901234560020", name:"Tomatoes 500g",                     brand:"Fresh",      category:"Veggies",   price:25,        stock:30,         unit:"pack",   emoji:"🍅", lowStockThreshold:5  },
  ];
}

function robustParse(text) {
  if (!text?.trim()) return null;
  let s = text.replace(/```json/gi,"").replace(/```/g,"").trim();
  s = s.replace(/\}\s*\{/g,"},{");
  try { const r = JSON.parse(s); if (r) return r; } catch(_) {}
  const o1=s.indexOf("["), o2=s.lastIndexOf("]");
  if (o1!==-1 && o2>o1) { try { return JSON.parse(s.slice(o1,o2+1)); } catch(_) {} }
  const b1=s.indexOf("{"), b2=s.lastIndexOf("}");
  if (b1!==-1 && b2>b1) { try { return JSON.parse(s.slice(b1,b2+1)); } catch(_) {} }
  return null;
}

async function generateInventoryForShop(shopId, shopName) {
  const prompt = `Generate 20 Indian grocery products for shop "${shopName}". Use real brands.
Return ONLY a JSON array, no other text:
[{"barcode":"8901234561001","name":"Amul Taaza Toned Milk 1L","brand":"Amul","category":"Dairy","price":54,"stock":40,"unit":"packet","emoji":"🥛","lowStockThreshold":10}]`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", max_tokens: 2000, temperature: 0.2,
        messages: [
          { role:"system", content:"You are a JSON API. Output ONLY valid JSON arrays. No text, no markdown." },
          { role:"user",   content: prompt },
        ],
      }),
    });
    const data    = await groqRes.json();
    if (data.error) { console.log("Groq error:", data.error.message); return null; }
    const rawText = data.choices?.[0]?.message?.content || "";
    const parsed  = robustParse(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch(e) {
    console.error("Inventory gen error:", e.message);
    return null;
  }
}

// GET /api/shop-inventory/:shopId
router.get("/:shopId", async (req, res) => {
  const { shopId } = req.params;
  const shopName   = req.query.shopName || "QuickMart";
  const refresh    = req.query.refresh === "true";

  if (!shopInventories[shopId] || refresh) {
    console.log(`🤖 Generating inventory for ${shopName}...`);
    const aiInventory = await generateInventoryForShop(shopId, shopName);
    if (aiInventory) {
      shopInventories[shopId] = aiInventory;
      console.log(`✅ AI generated ${aiInventory.length} products for ${shopId}`);
    } else {
      // Always fall back — never return empty
      shopInventories[shopId] = getFallbackInventory(shopName);
      console.log(`📦 Using fallback inventory for ${shopId} (${shopInventories[shopId].length} products)`);
    }
  }

  res.json({ success:true, shopId, shopName, inventory: shopInventories[shopId] });
});

// POST /api/shop-inventory/:shopId/update
router.post("/:shopId/update", (req, res) => {
  const { shopId }                    = req.params;
  const { barcode, action, quantity } = req.body;
  const qty = parseInt(quantity);
  const inv = shopInventories[shopId];
  if (!inv) return res.status(404).json({ success:false, message:"Shop not found" });
  const product = inv.find(p => p.barcode === barcode);
  if (!product) return res.status(404).json({ success:false, message:"Product not found" });
  const before = product.stock;
  if      (action==="add")      product.stock = Math.max(0, product.stock+qty);
  else if (action==="subtract") product.stock = Math.max(0, product.stock-qty);
  else if (action==="set")      product.stock = Math.max(0, qty);
  console.log(`Stock [${shopId}]: ${product.name} ${before}→${product.stock}`);
  res.json({ success:true, product, before, after:product.stock });
});

// POST /api/shop-inventory/:shopId/bulk
router.post("/:shopId/bulk", (req, res) => {
  const { shopId }  = req.params;
  const { updates } = req.body;
  const inv         = shopInventories[shopId];
  if (!inv) return res.status(404).json({ success:false, message:"Shop not found" });
  const results = updates.map(u => {
    const product = inv.find(p => p.barcode===u.barcode);
    if (!product) return { barcode:u.barcode, success:false };
    const before = product.stock, qty = parseInt(u.quantity)||0;
    if      (u.action==="add")      product.stock = Math.max(0,product.stock+qty);
    else if (u.action==="subtract") product.stock = Math.max(0,product.stock-qty);
    else if (u.action==="set")      product.stock = Math.max(0,qty);
    return { barcode:u.barcode, name:product.name, before, after:product.stock, success:true };
  });
  res.json({ success:true, results });
});

// POST /api/shop-inventory/:shopId/add-product
router.post("/:shopId/add-product", async (req, res) => {
  const { shopId } = req.params;
  const { query }  = req.body;
  const prompt     = `Return ONE Indian grocery product matching "${query}". ONLY JSON object, no text:
{"barcode":"AI001","name":"Full Name with Brand and Size","brand":"Brand","category":"Category","price":99,"stock":30,"unit":"pack","emoji":"🛍️","lowStockThreshold":5}`;
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},
      body: JSON.stringify({ model:"llama-3.1-8b-instant", max_tokens:200, temperature:0.1,
        messages:[{role:"system",content:"Output ONLY valid JSON. No text."},{role:"user",content:prompt}] }),
    });
    const data    = await groqRes.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    const parsed  = robustParse(rawText);
    if (!parsed || !parsed.name) return res.status(400).json({ success:false, message:"Could not parse product" });
    parsed.barcode = "AI_" + Date.now();
    if (!shopInventories[shopId]) shopInventories[shopId] = getFallbackInventory("Shop");
    shopInventories[shopId].push(parsed);
    res.json({ success:true, product:parsed });
  } catch(e) {
    res.status(500).json({ success:false, message:e.message });
  }
});

module.exports = router;