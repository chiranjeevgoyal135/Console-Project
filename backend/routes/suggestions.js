// routes/suggestions.js — AI generates real branded products dynamically
const express = require("express");
const router  = express.Router();

router.post("/", async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.json({ matched: false, suggestions: [] });

  const prompt = `You are a smart product catalog AI for an Indian grocery app like Blinkit/Zepto.

User searched: "${query}"

Return 6 real, specific Indian grocery products matching this search.
Rules:
- Use REAL Indian brand names: Parle, Britannia, Amul, Maggi, Tata, Nestle, ITC, Haldirams, Dabur, Patanjali, Lay's, Kurkure, Oreo, Horlicks, Bournvita, MDH, Everest, Mother Dairy, Nandini, Yippee, Sunfeast, Hide&Seek, Good Day, McVities, Mondelez, etc.
- Realistic Indian prices in INR
- Different brands/variants for same category (if user says "biscuits" → Parle-G, Britannia, Oreo, Hide&Seek, Good Day, Monaco)
- If symptom/occasion (fever → ginger tea, honey, lemon; movie night → popcorn, chips, cola)
- If no grocery match → matched:false

ONLY return valid JSON, no markdown, no extra text:
{
  "matched": true,
  "keyword": "biscuits",
  "suggestions": [
    {"name":"Parle-G Original Gluco Biscuits 500g","price":40,"emoji":"🍪","reason":"India's most loved biscuit","brand":"Parle"},
    {"name":"Britannia Good Day Butter Cookies 200g","price":35,"emoji":"🍪","reason":"Rich buttery cookies","brand":"Britannia"},
    {"name":"Oreo Original Sandwich Biscuits 300g","price":85,"emoji":"🍪","reason":"Twist, lick and dunk","brand":"Mondelez"},
    {"name":"Sunfeast Hide & Seek Choco 150g","price":45,"emoji":"🍪","reason":"Chocolate chip favourite","brand":"ITC"},
    {"name":"McVities Digestive Biscuits 250g","price":75,"emoji":"🍪","reason":"Healthy whole wheat biscuit","brand":"McVities"},
    {"name":"Monaco Classic Salted Crackers 200g","price":30,"emoji":"🍘","reason":"Light crispy snack","brand":"Parle"}
  ]
}`;

  try {
    const groqRes  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", max_tokens: 900, temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const groqData = await groqRes.json();
    const rawText  = groqData.choices?.[0]?.message?.content || "";
    console.log("AI query:", query);

    let parsed;
    try {
      let cleaned = rawText.replace(/```json|```/gi,"").trim();
      cleaned = cleaned.replace(/\}\s*\{/g,"},{").replace(/\}\s*\(\s*\{/g,"},{");
      parsed  = JSON.parse(cleaned);
    } catch(e) {
      console.error("JSON parse failed:", rawText.slice(0,200));
      return res.json({ matched: false, suggestions: [] });
    }

    if (parsed.suggestions) {
      parsed.suggestions = parsed.suggestions.map(s => ({
        ...s,
        stock: Math.floor(Math.random() * 50) + 5,
        unit:  "pack",
      }));
    }
    return res.json(parsed);
  } catch(e) {
    console.error("Suggestions error:", e.message);
    return res.status(500).json({ matched: false, suggestions: [] });
  }
});

module.exports = router;