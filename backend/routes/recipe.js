// routes/recipe.js
// POST /api/recipe/suggest
// body: { query: "Make Pizza for 4 people" }
//
// Interview explanation:
//   1. Groq AI parses the query → returns structured ingredient list with quantities
//   2. We match each ingredient to our inventory using fuzzy name matching
//   3. Quantities are scaled to the number of people mentioned
//   4. Returns matched products ready to add to cart

const express   = require("express");
const router    = express.Router();
const inventory = require("../data/inventory");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

router.post("/suggest", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, message: "query required." });

  const prompt = `You are a grocery ingredient assistant for an Indian online store.

The user said: "${query}"

Your job:
1. Identify the dish/meal being requested
2. Extract the number of people (default to 2 if not mentioned)
3. List the key grocery ingredients needed, with realistic quantities scaled for that many people
4. For each ingredient, suggest the closest grocery product name that would be found in an Indian supermarket

Respond ONLY with a valid JSON object like this:
{
  "dish": "Pizza",
  "servings": 4,
  "ingredients": [
    { "name": "Flour", "quantity": "500g", "productHint": "flour" },
    { "name": "Cheese", "quantity": "200g", "productHint": "cheese" },
    { "name": "Tomato", "quantity": "3 pieces", "productHint": "tomato" },
    { "name": "Olive Oil", "quantity": "2 tbsp", "productHint": "oil" }
  ]
}

Only return JSON. No explanation. No markdown. No extra text.`;

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        max_tokens:  500,
        temperature: 0.3,
        messages:    [{ role: "user", content: prompt }],
      }),
    });

    const groqData = await groqRes.json();
    const rawText  = groqData.choices?.[0]?.message?.content || "";

    let recipe;
    try {
      let cleaned = rawText.replace(/```json|```/gi, "").trim();
      cleaned = cleaned.replace(/\}\s*\{/g, "},{");
      recipe  = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ success: false, message: "AI returned invalid JSON. Try again." });
    }

    // Match each ingredient to inventory using fuzzy keyword matching
    const matched = recipe.ingredients.map(ing => {
      const hint    = (ing.productHint || ing.name).toLowerCase();
      const words   = hint.split(/\s+/);

      // Score each inventory item by how many hint words appear in its name
      const scored = inventory.map(product => {
        const pname = product.name.toLowerCase();
        const score = words.filter(w => w.length > 2 && pname.includes(w)).length;
        return { ...product, score };
      }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

      return {
        ingredient:  ing.name,
        quantity:    ing.quantity,
        product:     scored[0] || null,   // best match or null if nothing found
      };
    });

    return res.json({
      success: true,
      dish:     recipe.dish,
      servings: recipe.servings,
      matched,
    });

  } catch (e) {
    console.error("Recipe route error:", e);
    return res.status(500).json({ success: false, message: "Server error: " + e.message });
  }
});

module.exports = router;