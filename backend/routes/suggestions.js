const express = require("express");
const router  = express.Router();

// Cache results — same query never hits Groq twice in same session
const queryCache = {};

function robustParse(text) {
  if (!text?.trim()) return null;
  let s = text.replace(/```json/gi,"").replace(/```/g,"").trim();
  s = s.replace(/\}\s*\{/g,"},{").replace(/\}\s*\(\s*\{/g,"},{");
  // 1. Direct parse
  try { const r = JSON.parse(s); if (r) return r; } catch(_) {}
  // 2. Extract first { ... }
  const o1 = s.indexOf("{"), o2 = s.lastIndexOf("}");
  if (o1 !== -1 && o2 > o1) {
    try { const r = JSON.parse(s.slice(o1, o2+1)); if (r) return r; } catch(_) {}
  }
  // 3. Extract first [ ... ]
  const a1 = s.indexOf("["), a2 = s.lastIndexOf("]");
  if (a1 !== -1 && a2 > a1) {
    try { const r = JSON.parse(s.slice(a1, a2+1)); if (Array.isArray(r)) return { matched:true, suggestions:r }; } catch(_) {}
  }
  return null;
}

router.post("/", async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.json({ matched: false, suggestions: [] });

  // System prompt forces strict JSON-only output
  const systemPrompt = `You are a JSON API. You ONLY output valid JSON. No explanations. No markdown. No extra text. Just JSON.`;

  const userPrompt = `Return 6 Indian grocery products for the search: "${query}"

Output this exact JSON structure:
{"matched":true,"keyword":"${query}","suggestions":[{"name":"Amul Gold Full Cream Milk 1L","price":68,"emoji":"🥛","reason":"Premium full cream milk","brand":"Amul"},{"name":"Mother Dairy Milk 500ml","price":28,"emoji":"🥛","reason":"Fresh toned milk","brand":"Mother Dairy"}]}

Rules:
- Real Indian brands (Amul, Parle, Britannia, Tata, Maggi, Nestle, ITC, Dabur, etc.)
- Real INR prices
- If query has no grocery meaning, output: {"matched":false,"suggestions":[]}`;

  // Return cached result if available
  const cacheKey = query.toLowerCase().trim();
  if (queryCache[cacheKey]) {
    console.log(`Cache hit: "${query}"`);
    return res.json(queryCache[cacheKey]);
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",   // 8B model = separate quota, much faster
        max_tokens: 600,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      }),
    });

    const groqData = await groqRes.json();

    // Log any API-level errors
    if (groqData.error) {
      console.error("Groq API error:", groqData.error);
      return res.json({ matched: false, suggestions: [] });
    }

    const rawText = groqData.choices?.[0]?.message?.content || "";
    console.log(`AI query: "${query}" | raw (${rawText.length} chars):`, rawText.slice(0,120));

    const parsed = robustParse(rawText);
    if (!parsed) {
      console.error("Parse failed. Full response:", rawText);
      return res.json({ matched: false, suggestions: [] });
    }

    if (parsed.suggestions) {
      parsed.suggestions = parsed.suggestions.map(s => ({
        ...s,
        price: Number(s.price) || 50,
        stock: Math.floor(Math.random() * 50) + 5,
        unit:  "pack",
      }));
    }

    queryCache[cacheKey] = parsed; // cache for session
    return res.json(parsed);
  } catch(e) {
    console.error("Suggestions fetch error:", e.message);
    return res.status(500).json({ matched: false, suggestions: [] });
  }
});

module.exports = router;