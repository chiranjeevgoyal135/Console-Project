// routes/cart-suggestions.js
const express = require("express");
const router  = express.Router();

router.post("/", async (req, res) => {
  const { cartItems } = req.body;
  if (!cartItems?.length) return res.json({ suggestions: [], bundles: [] });

  const cartNames = cartItems.map(i => i.name).join(", ");

  const prompt = `You are a smart grocery recommendation AI for an Indian grocery app like Blinkit.

Customer's cart: ${cartNames}

Return two types of recommendations as JSON:

1. "suggestions" - items they might have forgotten (6 items)
   Think: if cart has chips → dip/cola; pasta → sauce/cheese; dal-rice → papad/pickle/ghee; bread+butter → jam/eggs

2. "bundles" - classic "people also buy together" combos related to cart items (4 bundles)
   Each bundle has 2-3 items that are always bought together as a set
   Examples: [Dal + Rice + Ghee], [Bread + Butter + Jam], [Pasta + Pasta Sauce + Cheese], [Tea + Sugar + Milk]

Use real Indian brands. Realistic INR prices.

ONLY valid JSON, no markdown:
{
  "suggestions": [
    {"name":"Kissan Mixed Fruit Jam 500g","price":120,"emoji":"🍓","reason":"Goes great with bread","brand":"Kissan"}
  ],
  "bundles": [
    {
      "title": "The Perfect Breakfast",
      "emoji": "🍳",
      "items": [
        {"name":"Amul Butter 100g","price":55,"emoji":"🧈","brand":"Amul"},
        {"name":"Britannia Brown Bread 400g","price":45,"emoji":"🍞","brand":"Britannia"},
        {"name":"Kissan Jam 500g","price":120,"emoji":"🍓","brand":"Kissan"}
      ]
    }
  ]
}`;

  try {
    const groqRes  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", max_tokens: 1000, temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const groqData = await groqRes.json();
    const rawText  = groqData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      let cleaned = rawText.replace(/```json|```/gi,"").trim();
      cleaned = cleaned.replace(/\}\s*\{/g,"},{");
      parsed  = JSON.parse(cleaned);
    } catch(e) {
      return res.json({ suggestions: [], bundles: [] });
    }

    if (parsed.suggestions) {
      parsed.suggestions = parsed.suggestions.map(s => ({ ...s, stock: 20, unit: "pack" }));
    }
    if (parsed.bundles) {
      parsed.bundles = parsed.bundles.map(b => ({
        ...b,
        items: b.items.map(i => ({ ...i, stock: 20, unit: "pack" }))
      }));
    }
    return res.json(parsed);
  } catch(e) {
    return res.status(500).json({ suggestions: [], bundles: [] });
  }
});

module.exports = router;