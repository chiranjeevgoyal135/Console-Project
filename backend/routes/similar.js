// routes/similar.js
const express   = require("express");
const router    = express.Router();
const inventory = require("../data/inventory");

let driver = null;
try {
  const neo4j = require("neo4j-driver");
  if (process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD) {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
      { disableLosslessIntegers: true }
    );
    console.log("Neo4j driver initialised ✅");
  }
} catch(e) {
  console.log("neo4j-driver not installed");
}

// Enrich Neo4j result with stock/emoji from local inventory
function enrich(records) {
  return records.map(r => {
    const bc    = r.get("barcode");
    const local = inventory.find(p => p.barcode === bc) || {};
    return {
      barcode:  bc,
      name:     r.get("name"),
      category: r.get("category"),
      price:    r.get("price"),
      stock:    local.stock  ?? 99,
      emoji:    local.emoji  ?? "🛍️",
      unit:     local.unit   ?? "item",
    };
  });
}

// Fallback when Neo4j is unavailable
function fallback(barcode) {
  const product = inventory.find(p => p.barcode === barcode);
  if (!product) return { similar: [], boughtWith: [] };

  const similar = inventory
    .filter(p => p.barcode !== barcode && p.category === product.category)
    .slice(0, 4);

  const boughtWith = inventory
    .filter(p => p.barcode !== barcode && p.category !== product.category)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  return { similar, boughtWith };
}

router.get("/:barcode", async (req, res) => {
  const { barcode } = req.params;

  if (driver) {
    const session = driver.session();
    try {
      const simRes = await session.run(
        `MATCH (p:Product {barcode:$barcode})-[:SIMILAR_TO]->(s:Product)
         RETURN s.barcode AS barcode, s.name AS name, s.category AS category, s.price AS price
         LIMIT 6`,
        { barcode }
      );

      const bwtRes = await session.run(
        `MATCH (p:Product {barcode:$barcode})-[:BOUGHT_WITH]->(b:Product)
         RETURN b.barcode AS barcode, b.name AS name, b.category AS category, b.price AS price
         LIMIT 4`,
        { barcode }
      );

      await session.close();

      const similar    = enrich(simRes.records);
      const boughtWith = enrich(bwtRes.records);

      console.log(`Neo4j: ${barcode} → ${similar.length} similar, ${boughtWith.length} bought-with`);

      return res.json({ success: true, source: "neo4j", barcode, similar, boughtWith });
    } catch(e) {
      await session.close();
      console.error("Neo4j query error:", e.message);
    }
  }

  // Fallback
  const fb = fallback(barcode);
  return res.json({ success: true, source: "fallback", barcode, ...fb });
});

module.exports = router;