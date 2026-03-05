// routes/cart-split.js — Smart Cart Splitting with auto shop generation

const express = require("express");
const router  = express.Router();

function fuzzyMatch(cartItemName, shopProductName) {
  const cartTokens = cartItemName.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
  const shopTokens = shopProductName.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
  const matches    = cartTokens.filter(ct => shopTokens.some(st => st.includes(ct) || ct.includes(st)));
  return matches.length / Math.max(cartTokens.length, 1);
}

function haversine(lat1, lng1, lat2, lng2) {
  const R  = 6371;
  const dL = (lat2-lat1)*Math.PI/180;
  const dG = (lng2-lng1)*Math.PI/180;
  const a  = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Ask AI to generate a new shop specifically stocking the missing items
async function generateShopForItems(missingItems, userLat, userLng, existingShopCount) {
  const itemsList = missingItems.map(i => i.name).join(", ");
  const shopNum   = existingShopCount + 1;

  const prompt = `You are generating a realistic Indian grocery dark store that specialises in certain products.

This new shop MUST stock these specific items: ${itemsList}

Generate 1 realistic shop near coordinates (${userLat}, ${userLng}) in India, and its inventory that includes the above items plus 5-8 complementary products.

Use real Indian shop name patterns (SpencersDaily, Grofers, LocalMart, FreshBasket, etc.)
Place the shop 2-6 km from the user coordinates with slight lat/lng offset.

ONLY return valid JSON, no markdown:
{
  "shop": {
    "id": "ai_shop_${shopNum}",
    "name": "SpencersDaily Express",
    "type": "Specialty Store",
    "city": "Delhi",
    "area": "Sector 12",
    "lat": ${userLat + 0.03},
    "lng": ${userLng + 0.02},
    "address": "Shop 4, Market Complex",
    "baseDeliveryMins": 18,
    "deliveryFee": 25,
    "rating": 4.2,
    "isOpen": true,
    "speciality": "Stocks hard-to-find items"
  },
  "inventory": [
    {
      "barcode": "AI${Date.now()}001",
      "name": "Exact product name matching the requested item",
      "brand": "RealBrand",
      "category": "Category",
      "price": 99,
      "stock": 30,
      "unit": "pack",
      "emoji": "🛍️"
    }
  ]
}`;

  try {
    const groqRes  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", max_tokens: 1500, temperature: 0.4,
        messages: [{ role:"user", content:prompt }],
      }),
    });
    const groqData = await groqRes.json();
    const rawText  = groqData.choices?.[0]?.message?.content || "{}";
    let cleaned    = rawText.replace(/```json|```/gi,"").trim();
    cleaned        = cleaned.replace(/\}\s*\{/g,"},{");
    const parsed   = JSON.parse(cleaned);
    const newShopName = parsed.shop?.name || "QuickStock Express";
    if (!parsed.shop.name) parsed.shop.name = newShopName;
    console.log(`🤖 Generated new shop "${newShopName}" for: ${itemsList}`);
    return parsed;
  } catch(e) {
    console.error("Shop generation error:", e.message);
    // Fallback: create a simple shop manually
    return {
      shop: {
        id:               `ai_shop_${shopNum}`,
        name:             `QuickStock Express`,
        type:             "Express Store",
        city:             "Nearby",
        area:             "Local Area",
        lat:              userLat + 0.025,
        lng:              userLng + 0.025,
        address:          "Express Delivery Hub",
        baseDeliveryMins: 20,
        deliveryFee:      25,
        rating:           4.1,
        isOpen:           true,
        speciality:       "Express delivery for specialty items",
      },
      inventory: missingItems.map((item, i) => ({
        barcode:  `AI_${Date.now()}_${i}`,
        name:     item.name,
        brand:    "Fresh",
        category: "Grocery",
        price:    item.price || 99,
        stock:    25,
        unit:     "pack",
        emoji:    item.emoji || "🛍️",
      })),
    };
  }
}

function runGreedySetCover(cartItems, shops, shopInventories, userLat, userLng) {
  const MATCH_THRESHOLD = 0.25;
  const itemCoverage    = {};

  for (const cartItem of cartItems) {
    itemCoverage[cartItem.name] = [];
    for (const shop of shops) {
      const inv = shopInventories[shop.id] || [];
      let bestMatch = null, bestScore = 0;
      for (const product of inv) {
        if (product.stock <= 0) continue;
        const score = fuzzyMatch(cartItem.name, product.name);
        if (score > bestScore) { bestScore = score; bestMatch = product; }
      }
      if (bestScore >= MATCH_THRESHOLD && bestMatch) {
        const dist         = haversine(userLat, userLng, shop.lat, shop.lng);
        const deliveryMins = Math.round((shop.baseDeliveryMins||12) + dist*0.5);
        itemCoverage[cartItem.name].push({
          shopId: shop.id, shopName: shop.name, shopArea: shop.area||shop.city,
          shopLat: shop.lat, shopLng: shop.lng,
          product: bestMatch, score: bestScore,
          distanceKm: dist.toFixed(1), deliveryMins,
          deliveryFee: shop.deliveryFee||20,
        });
      }
    }
    itemCoverage[cartItem.name].sort((a,b) => b.score-a.score || a.distanceKm-b.distanceKm);
  }

  const uncovered = new Set(cartItems.map(i => i.name));
  const covered   = [];
  const splitPlan = [];
  let   iterations = 0;

  while (uncovered.size > 0 && iterations++ < 20) {
    const shopCoverage = {};
    for (const itemName of uncovered) {
      for (const option of itemCoverage[itemName]) {
        if (!shopCoverage[option.shopId]) {
          shopCoverage[option.shopId] = {
            shopId: option.shopId, shopName: option.shopName,
            shopArea: option.shopArea, shopLat: option.shopLat,
            shopLng: option.shopLng, deliveryFee: option.deliveryFee, items: [],
          };
        }
        const existing = shopCoverage[option.shopId].items.find(i => i.cartItemName===itemName);
        if (!existing || option.score > existing.score) {
          shopCoverage[option.shopId].items = [
            ...shopCoverage[option.shopId].items.filter(i => i.cartItemName!==itemName),
            { cartItemName:itemName, cartItem:cartItems.find(c=>c.name===itemName),
              product:option.product, score:option.score,
              distanceKm:option.distanceKm, deliveryMins:option.deliveryMins },
          ];
        }
      }
    }
    if (!Object.keys(shopCoverage).length) break;

    const best = Object.values(shopCoverage).sort((a,b) =>
      b.items.length-a.items.length || parseFloat(a.items[0]?.distanceKm||99)-parseFloat(b.items[0]?.distanceKm||99)
    )[0];

    const dist         = haversine(userLat, userLng, best.shopLat, best.shopLng);
    const deliveryMins = Math.round((shops.find(s=>s.id===best.shopId)?.baseDeliveryMins||12) + dist*0.5);

    splitPlan.push({
      shopId: best.shopId, shopName: best.shopName, shopArea: best.shopArea,
      distanceKm: dist.toFixed(1), deliveryMins, deliveryFee: best.deliveryFee,
      items: best.items, isAiGenerated: false,
    });

    for (const item of best.items) {
      uncovered.delete(item.cartItemName);
      covered.push(item.cartItemName);
    }
  }

  return { splitPlan, uncoveredItems: [...uncovered] };
}

// POST /api/cart-split
router.post("/", async (req, res) => {
  const { cartItems, userLat, userLng, shops, shopInventories } = req.body;
  if (!cartItems?.length) return res.status(400).json({ success:false, message:"cartItems required" });

  let allShops       = [...(shops||[])];
  let allInventories = { ...(shopInventories||{}) };

  // Round 1: run greedy set cover on existing shops
  let { splitPlan, uncoveredItems } = runGreedySetCover(cartItems, allShops, allInventories, userLat, userLng);

  // Round 2: for uncovered items, generate a NEW AI shop on the fly
  if (uncoveredItems.length > 0) {
    console.log(`🔍 ${uncoveredItems.length} items not found — generating new shop...`);
    const missingCartItems = cartItems.filter(i => uncoveredItems.includes(i.name));

    const generated = await generateShopForItems(missingCartItems, userLat, userLng, allShops.length);

    if (generated?.shop && generated?.inventory?.length) {
      const newShop = generated.shop;
      allShops.push(newShop);
      allInventories[newShop.id] = generated.inventory;

      // Run greedy again just for uncovered items against the new shop
      const dist         = haversine(userLat, userLng, newShop.lat, newShop.lng);
      const deliveryMins = Math.round((newShop.baseDeliveryMins||18) + dist*0.5);

      const matchedItems = missingCartItems.map(cartItem => {
        let bestMatch = null, bestScore = 0;
        for (const product of generated.inventory) {
          const score = fuzzyMatch(cartItem.name, product.name);
          if (score > bestScore) { bestScore = score; bestMatch = product; }
        }
        // If still no match, use first inventory item as best effort
        if (!bestMatch) bestMatch = generated.inventory[0];
        return {
          cartItemName: cartItem.name,
          cartItem,
          product:      bestMatch || { name: cartItem.name, price: cartItem.price||99, emoji: cartItem.emoji||"🛍️" },
          score:        bestScore || 0.5,
          distanceKm:   dist.toFixed(1),
          deliveryMins,
        };
      });

      splitPlan.push({
        shopId:        newShop.id,
        shopName:      newShop.name,
        shopArea:      newShop.area,
        distanceKm:    dist.toFixed(1),
        deliveryMins,
        deliveryFee:   newShop.deliveryFee,
        items:         matchedItems,
        isAiGenerated: true, // flag so UI can show "New shop found!" badge
      });
    }
  }

  const totalFee    = splitPlan.reduce((s,p) => s+p.deliveryFee, 0);
  const maxDelivery = Math.max(...splitPlan.map(p => p.deliveryMins), 0);

  console.log(`✅ Split complete: ${cartItems.length} items → ${splitPlan.length} shops`);

  res.json({
    success: true,
    splitPlan,
    unavailable: [], // never show unavailable — always find a shop
    summary: {
      totalShops:      splitPlan.length,
      totalItems:      cartItems.length,
      totalFee,
      maxDeliveryMins: maxDelivery,
      isSingleShop:    splitPlan.length===1,
      algorithm:       "Greedy Set Cover + AI Shop Generation",
    }
  });
});

module.exports = router;