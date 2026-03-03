const express = require("express");
const router = require("express").Router();

const SYSTEM_PROMPT = "You are a smart grocery assistant for an Indian grocery delivery app called Smarter Blinkit.\n\nYour job is to suggest grocery products for ANY query a user types. Be creative and helpful.\n\nEXAMPLES:\n- home -> onion, tomato, oil, dal, rice (home cooking essentials)\n- movie -> popcorn, chips, cold drink, chocolate\n- rain -> ginger, tea, instant noodles, biscuits\n- monday -> milk, bread, eggs, banana\n- gym -> eggs, peanut butter, banana, oats\n- night -> chips, chocolate, instant noodles\n- cold -> honey, ginger, tulsi tea, lemon\n- party -> chips, soft drinks, paneer, cake\n\nOnly set matched:false for math problems or purely technical questions (like 'what is 2+2' or 'explain quantum physics').\nFor everything else, find a grocery angle and set matched:true.\n\nSTRICT FORMAT: Reply with ONLY raw JSON, no markdown, no backticks, no explanation.\nProduct names must be realistic for Indian grocery stores.\nPrices in Indian Rupees. reason field under 6 words. Use relevant emoji.\n\nOutput only this:\n{\"matched\":true,\"keyword\":\"label\",\"suggestions\":[{\"name\":\"Product\",\"price\":99,\"emoji\":\"emoji\",\"reason\":\"reason\"}]}";

router.get("/", async (req, res) => {
  const query = (req.query.query || "").trim();
  if (!query) return res.status(400).json({ success: false, message: "Query required." });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, message: "GROQ_API_KEY not set in .env" });

  console.log("AI query:", query);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "User typed: \"" + query + "\". Suggest Indian grocery products. JSON only, no other text." }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq error:", data.error.message);
      return res.status(500).json({ success: false, message: data.error.message });
    }

    const rawText = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
    console.log("Groq response:", rawText);

    const cleaned = rawText.replace(/```json|```/gi, "").trim();

    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed:", cleaned);
      return res.status(500).json({ success: false, message: "AI returned invalid format." });
    }

    return res.status(200).json({
      success: true,
      matched: parsed.matched,
      keyword: parsed.keyword || null,
      suggestions: parsed.suggestions || []
    });

  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ success: false, message: "Could not reach Groq API." });
  }
});

module.exports = router;