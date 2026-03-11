// routes/product-pairing.js
// ─────────────────────────────────────────────────────────
// Smart Product Pairing: Beer & Diaper analysis for groceries
//
// TWO-LAYER MODEL:
//  Layer 1 — Association Rules (Apriori/FP-Growth logic)
//             Computes Support, Confidence, Lift from 500
//             simulated grocery transactions
//  Layer 2 — HuggingFace sentence-transformers/all-MiniLM-L6-v2
//             Semantic embedding similarity between product names
//             (catches non-obvious pairings like "Beer & Diapers")
//
// Lift > 1 = products are more likely bought together than by chance
// Lift > 2 = strong pairing signal (act on this)
// ─────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL   = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// ── Grocery product catalog ──
const PRODUCTS = [
  { id:"p01", name:"Amul Gold Milk 1L",          category:"Dairy",      emoji:"🥛", price:68  },
  { id:"p02", name:"Britannia Brown Bread",       category:"Bakery",     emoji:"🍞", price:45  },
  { id:"p03", name:"Amul Butter 100g",            category:"Dairy",      emoji:"🧈", price:55  },
  { id:"p04", name:"Maggi Noodles 70g",           category:"Snacks",     emoji:"🍜", price:14  },
  { id:"p05", name:"Tata Tea Gold 250g",          category:"Beverages",  emoji:"🍵", price:140 },
  { id:"p06", name:"Parle-G Biscuits 500g",       category:"Biscuits",   emoji:"🍪", price:40  },
  { id:"p07", name:"Lay's Classic 26g",           category:"Snacks",     emoji:"🍿", price:20  },
  { id:"p08", name:"Coca-Cola 2L",                category:"Beverages",  emoji:"🥤", price:95  },
  { id:"p09", name:"Domino's Pizza Base",         category:"Bakery",     emoji:"🍕", price:85  },
  { id:"p10", name:"Mozzarella Cheese 200g",      category:"Dairy",      emoji:"🧀", price:140 },
  { id:"p11", name:"Basmati Rice 1kg",            category:"Grains",     emoji:"🌾", price:120 },
  { id:"p12", name:"Yellow Dal 500g",             category:"Grains",     emoji:"🫘", price:80  },
  { id:"p13", name:"Fortune Sunflower Oil 1L",    category:"Oils",       emoji:"🫙", price:150 },
  { id:"p14", name:"Onion 1kg",                   category:"Veggies",    emoji:"🧅", price:40  },
  { id:"p15", name:"Tomato 500g",                 category:"Veggies",    emoji:"🍅", price:30  },
  { id:"p16", name:"Dabur Honey 250g",            category:"Health",     emoji:"🍯", price:175 },
  { id:"p17", name:"Nescafe Classic 50g",         category:"Beverages",  emoji:"☕", price:175 },
  { id:"p18", name:"Oreo Biscuits 300g",          category:"Biscuits",   emoji:"🍪", price:85  },
  { id:"p19", name:"Colgate Toothpaste 200g",     category:"Personal",   emoji:"🦷", price:110 },
  { id:"p20", name:"Pampers Diapers M 30pc",      category:"Baby",       emoji:"👶", price:650 },
  { id:"p21", name:"Kingfisher Beer 650ml",       category:"Beverages",  emoji:"🍺", price:160 },
  { id:"p22", name:"Kurkure Masala 40g",          category:"Snacks",     emoji:"🌽", price:20  },
  { id:"p23", name:"Mother Dairy Curd 400g",      category:"Dairy",      emoji:"🥣", price:45  },
  { id:"p24", name:"Nirma Detergent 1kg",         category:"Household",  emoji:"🧺", price:95  },
  { id:"p25", name:"Britannia Marie Gold",        category:"Biscuits",   emoji:"🍪", price:35  },
];

// ── Simulated transaction patterns (real-world basket logic) ──
// Each array = items frequently bought together in one "household segment"
const BASKET_PATTERNS = [
  // Young adult / party segment
  ["p08","p07","p22","p06","p21"],  // Cola + Chips + Kurkure + Biscuits + Beer
  ["p21","p20","p05"],               // Beer + Diapers + Tea (Beer-Diaper case study!)
  ["p08","p09","p10","p22"],         // Cola + Pizza Base + Cheese + Kurkure
  ["p21","p22","p07","p08"],         // Beer + Kurkure + Chips + Cola
  // Family cooking segment
  ["p11","p12","p13","p14","p15"],  // Rice + Dal + Oil + Onion + Tomato
  ["p11","p13","p14","p15","p23"],  // Rice + Oil + Onion + Tomato + Curd
  ["p12","p14","p15","p13"],        // Dal + Onion + Tomato + Oil
  ["p01","p02","p03","p05"],         // Milk + Bread + Butter + Tea
  // Baby household segment
  ["p20","p01","p23","p24"],         // Diapers + Milk + Curd + Detergent
  ["p20","p01","p16","p05"],         // Diapers + Milk + Honey + Tea
  ["p20","p24","p19"],               // Diapers + Detergent + Toothpaste
  // Breakfast segment
  ["p01","p02","p03","p06","p25"],   // Milk + Bread + Butter + Biscuits + Marie
  ["p05","p17","p02","p06"],         // Tea + Coffee + Bread + Biscuits
  ["p23","p01","p16","p25"],         // Curd + Milk + Honey + Marie
  // Snack segment
  ["p04","p07","p22","p06"],         // Maggi + Chips + Kurkure + Parle-G
  ["p04","p07","p08"],               // Maggi + Chips + Cola
  ["p18","p17","p06"],               // Oreo + Coffee + Parle-G
  // Pizza night
  ["p09","p10","p08","p07"],         // Pizza Base + Cheese + Cola + Chips
  ["p09","p10","p15","p14"],         // Pizza Base + Cheese + Tomato + Onion
];

// ── Generate 600 transactions from patterns ──
let TRANSACTIONS = [];
function generateTransactions() {
  const rand = (n) => Math.floor(Math.random() * n);
  for (let i = 0; i < 600; i++) {
    const pattern = BASKET_PATTERNS[rand(BASKET_PATTERNS.length)];
    // Add 0-3 random extra items to each basket (noise)
    const extras = Array.from({ length: rand(3) }, () => PRODUCTS[rand(PRODUCTS.length)].id);
    const basket = [...new Set([...pattern, ...extras])];
    TRANSACTIONS.push(basket);
  }
  console.log(`🛒 Generated ${TRANSACTIONS.length} simulated transactions`);
}
generateTransactions();

// ── Association Rule Engine ──
// Returns { support, confidence, lift } for every product pair
function computeAssociationRules() {
  const N        = TRANSACTIONS.length;
  const itemFreq = {};    // single item frequency
  const pairFreq = {};    // pair frequency

  TRANSACTIONS.forEach(t => {
    const items = [...new Set(t)];
    items.forEach(a => {
      itemFreq[a] = (itemFreq[a] || 0) + 1;
      items.forEach(b => {
        if (a < b) {
          const key = `${a}|${b}`;
          pairFreq[key] = (pairFreq[key] || 0) + 1;
        }
      });
    });
  });

  const rules = [];
  Object.entries(pairFreq).forEach(([key, count]) => {
    const [a, b] = key.split("|");
    const support    = count / N;
    const confAtoB   = count / itemFreq[a];
    const confBtoA   = count / itemFreq[b];
    const lift       = support / ((itemFreq[a] / N) * (itemFreq[b] / N));
    // Only keep strong associations
    if (support >= 0.03 && lift >= 1.2) {
      const pA = PRODUCTS.find(p => p.id === a);
      const pB = PRODUCTS.find(p => p.id === b);
      if (pA && pB) {
        rules.push({
          product_a:  pA,
          product_b:  pB,
          support:    Math.round(support * 1000) / 10,   // percentage
          confidence: Math.round(Math.max(confAtoB, confBtoA) * 100),
          lift:       Math.round(lift * 100) / 100,
          transactions: count,
          strength:   lift >= 3 ? "🔥 Very Strong" : lift >= 2 ? "💪 Strong" : "📈 Moderate",
          color:      lift >= 3 ? "#f97316" : lift >= 2 ? "#22c55e" : "#3b82f6",
        });
      }
    }
  });

  return rules.sort((a, b) => b.lift - a.lift);
}

// Cache rules (recompute rarely)
let cachedRules = null;
function getRules() {
  if (!cachedRules) cachedRules = computeAssociationRules();
  return cachedRules;
}

// ── HuggingFace Semantic Similarity ──
async function getHFEmbeddings(texts) {
  try {
    const token = process.env.HF_API_TOKEN; // optional — model is public
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resp = await fetch(HF_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: texts }),
    });
    if (!resp.ok) return null;
    return await resp.json(); // array of embedding vectors
  } catch { return null; }
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── GET /api/product-pairing/rules ──
// Returns all association rules sorted by lift
router.get("/rules", (req, res) => {
  const rules  = getRules();
  const limit  = parseInt(req.query.limit) || 20;
  const minLift= parseFloat(req.query.minLift) || 1.2;
  res.json({
    success: true,
    totalTransactions: TRANSACTIONS.length,
    totalRules: rules.length,
    rules: rules.filter(r => r.lift >= minLift).slice(0, limit),
    topPairs: rules.slice(0, 3),  // highlight top 3
  });
});

// ── GET /api/product-pairing/product/:id ──
// Returns pairings for a specific product
router.get("/product/:id", (req, res) => {
  const { id }  = req.params;
  const rules   = getRules();
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return res.status(404).json({ success: false });

  const pairings = rules
    .filter(r => r.product_a.id === id || r.product_b.id === id)
    .map(r => ({
      ...r,
      paired_with: r.product_a.id === id ? r.product_b : r.product_a,
    }))
    .slice(0, 6);

  res.json({ success: true, product, pairings });
});

// ── POST /api/product-pairing/semantic ──
// Uses HuggingFace to find semantic pairings for a query product
router.post("/semantic", async (req, res) => {
  const { productName } = req.body;
  if (!productName) return res.status(400).json({ success: false });

  // Get embeddings for all product names + the query
  const allNames   = PRODUCTS.map(p => p.name);
  const queryIndex = allNames.indexOf(productName);

  const embeddings = await getHFEmbeddings([productName, ...allNames]);

  if (!embeddings || !Array.isArray(embeddings)) {
    // Fallback: return rule-based results
    const rules   = getRules();
    const product = PRODUCTS.find(p => p.name === productName);
    if (!product) return res.json({ success:true, source:"fallback", pairs:[] });
    const pairs = rules.filter(r => r.product_a.id===product.id || r.product_b.id===product.id)
      .map(r => ({ ...r, paired_with: r.product_a.id===product.id?r.product_b:r.product_a }))
      .slice(0,5);
    return res.json({ success:true, source:"association_rules_fallback", pairs });
  }

  const queryEmb  = embeddings[0];
  const prodEmbs  = embeddings.slice(1);

  // Compute cosine similarity to every other product
  const similarities = PRODUCTS.map((p, i) => ({
    product:    p,
    similarity: cosineSim(queryEmb, prodEmbs[i]),
  }))
  .filter(x => x.product.name !== productName)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 8);

  res.json({
    success: true,
    source:  "huggingface_semantic",
    model:   HF_MODEL,
    query:   productName,
    pairs:   similarities.map(s => ({
      product:    s.product,
      similarity: Math.round(s.similarity * 100),
      reason:     `Semantically similar (${Math.round(s.similarity * 100)}% match)`,
    })),
  });
});

// ── GET /api/product-pairing/insights ──
// Beer & Diaper style insights: surprising cross-category pairs
router.get("/insights", (req, res) => {
  const rules = getRules();

  // Cross-category pairs with high lift = the "Beer & Diaper" discoveries
  const surprising = rules
    .filter(r => r.product_a.category !== r.product_b.category && r.lift >= 2)
    .slice(0, 6);

  // Same-category pairs (expected but useful)
  const expected = rules
    .filter(r => r.product_a.category === r.product_b.category)
    .slice(0, 4);

  // Stats
  const avgLift   = rules.reduce((s,r) => s + r.lift, 0) / rules.length;
  const topLift   = rules[0]?.lift || 0;

  res.json({
    success: true,
    totalTransactions: TRANSACTIONS.length,
    totalRules:    rules.length,
    avgLift:       Math.round(avgLift * 100) / 100,
    topLift:       Math.round(topLift * 100) / 100,
    surprising,   // cross-category = the wow factor
    expected,     // same-category = obvious pairs
    allRules:     rules.slice(0, 30),
    products:     PRODUCTS,
  });
});

// ── GET /api/product-pairing/cart ──
// Given cart items, returns smart add-on suggestions
router.get("/cart", (req, res) => {
  const cartIds = (req.query.items || "").split(",").filter(Boolean);
  if (!cartIds.length) return res.json({ success:true, suggestions:[] });

  const rules = getRules();
  const scoreMap = {};

  cartIds.forEach(cartId => {
    rules
      .filter(r => r.product_a.id === cartId || r.product_b.id === cartId)
      .forEach(r => {
        const other = r.product_a.id === cartId ? r.product_b : r.product_a;
        if (!cartIds.includes(other.id)) {
          scoreMap[other.id] = scoreMap[other.id] || { product: other, totalLift: 0, triggeredBy: [] };
          scoreMap[other.id].totalLift += r.lift;
          scoreMap[other.id].triggeredBy.push({ with: PRODUCTS.find(p=>p.id===cartId)?.name, lift: r.lift });
        }
      });
  });

  const suggestions = Object.values(scoreMap)
    .sort((a, b) => b.totalLift - a.totalLift)
    .slice(0, 5)
    .map(s => ({
      ...s.product,
      lift:        Math.round(s.totalLift * 100) / 100,
      reason:      `${s.triggeredBy.length > 1 ? `${s.triggeredBy.length} items in your cart suggest` : `Pairs well with ${s.triggeredBy[0]?.with}`} this`,
      triggeredBy: s.triggeredBy,
    }));

  res.json({ success: true, suggestions, cartSize: cartIds.length });
});

module.exports = router;