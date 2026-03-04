// Run: node -r dotenv/config neo4j-seed.js
require("dotenv").config();
const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

const products = [
  // Dairy
  { barcode: "8901234567890", name: "Amul Milk 500ml",         category: "Dairy",     price: 28  },
  { barcode: "8901234567910", name: "Nandini Milk 500ml",      category: "Dairy",     price: 26  },
  { barcode: "8901234567911", name: "Mother Dairy Milk 1L",    category: "Dairy",     price: 54  },
  { barcode: "8901234567891", name: "Amul Butter 100g",        category: "Dairy",     price: 55  },
  { barcode: "8901234567912", name: "Britannia Butter 100g",   category: "Dairy",     price: 52  },
  { barcode: "8901234567913", name: "Amul Curd 400g",          category: "Dairy",     price: 45  },
  { barcode: "8901234567914", name: "Mother Dairy Curd 400g",  category: "Dairy",     price: 42  },
  // Snacks / Noodles
  { barcode: "8901234567898", name: "Maggi Noodles",           category: "Snacks",    price: 14  },
  { barcode: "8901234567920", name: "Yippee Noodles",          category: "Snacks",    price: 12  },
  { barcode: "8901234567921", name: "Top Ramen Noodles",       category: "Snacks",    price: 13  },
  { barcode: "8901234567899", name: "Lay's Classic 26g",       category: "Snacks",    price: 20  },
  { barcode: "8901234567922", name: "Kurkure Masala 40g",      category: "Snacks",    price: 20  },
  { barcode: "8901234567923", name: "Pringles Original 110g",  category: "Snacks",    price: 99  },
  // Biscuits
  { barcode: "8901234567900", name: "Parle-G Biscuits 250g",   category: "Biscuits",  price: 20  },
  { barcode: "8901234567930", name: "Britannia Good Day 150g", category: "Biscuits",  price: 35  },
  { barcode: "8901234567931", name: "Oreo Original 120g",      category: "Biscuits",  price: 55  },
  { barcode: "8901234567932", name: "Hide & Seek 100g",        category: "Biscuits",  price: 30  },
  { barcode: "8901234567933", name: "Monaco Crackers 200g",    category: "Biscuits",  price: 25  },
  // Grains
  { barcode: "8901234567895", name: "Basmati Rice 1kg",        category: "Grains",    price: 120 },
  { barcode: "8901234567940", name: "India Gate Rice 1kg",     category: "Grains",    price: 140 },
  { barcode: "8901234567941", name: "Daawat Rozana Rice 1kg",  category: "Grains",    price: 110 },
  { barcode: "8901234567896", name: "Toor Dal 500g",           category: "Grains",    price: 80  },
  { barcode: "8901234567942", name: "Moong Dal 500g",          category: "Grains",    price: 90  },
  { barcode: "8901234567943", name: "Chana Dal 500g",          category: "Grains",    price: 75  },
  // Beverages
  { barcode: "8901234567901", name: "Lipton Green Tea 25pk",   category: "Beverages", price: 95  },
  { barcode: "8901234567950", name: "Tata Tea Gold 250g",      category: "Beverages", price: 140 },
  { barcode: "8901234567951", name: "Red Label Tea 250g",      category: "Beverages", price: 130 },
  { barcode: "8901234567952", name: "Nescafe Classic 50g",     category: "Beverages", price: 175 },
  { barcode: "8901234567953", name: "Bru Coffee 50g",          category: "Beverages", price: 160 },
  { barcode: "8901234567894", name: "Coconut Water 200ml",     category: "Beverages", price: 30  },
  // Oils
  { barcode: "8901234567897", name: "Sunflower Oil 1L",        category: "Oils",      price: 150 },
  { barcode: "8901234567960", name: "Fortune Refined Oil 1L",  category: "Oils",      price: 145 },
  { barcode: "8901234567961", name: "Saffola Gold Oil 1L",     category: "Oils",      price: 200 },
  // Bakery
  { barcode: "8901234567893", name: "Brown Bread 400g",        category: "Bakery",    price: 45  },
  { barcode: "8901234567970", name: "Harvest Gold Bread 400g", category: "Bakery",    price: 42  },
  { barcode: "8901234567971", name: "Modern Bread 400g",       category: "Bakery",    price: 40  },
  // Health
  { barcode: "8901234567892", name: "Honey 250g",              category: "Health",    price: 180 },
  { barcode: "8901234567980", name: "Patanjali Honey 250g",    category: "Health",    price: 140 },
  // Personal
  { barcode: "8901234567902", name: "Dettol Handwash 200ml",   category: "Personal",  price: 85  },
  { barcode: "8901234567990", name: "Lifebuoy Handwash 200ml", category: "Personal",  price: 75  },
  { barcode: "8901234567903", name: "Colgate 200g",            category: "Personal",  price: 110 },
  { barcode: "8901234567991", name: "Pepsodent 200g",          category: "Personal",  price: 95  },
  { barcode: "8901234567992", name: "Sensodyne 70g",           category: "Personal",  price: 140 },
  // Veggies
  { barcode: "8901234567904", name: "Onions 1kg",              category: "Veggies",   price: 35  },
  { barcode: "8901234567993", name: "Tomatoes 500g",           category: "Veggies",   price: 25  },
  { barcode: "8901234567994", name: "Potatoes 1kg",            category: "Veggies",   price: 30  },
];

// SIMILAR_TO: same category / same product type different brand
const similarEdges = [
  // Milk brands
  ["8901234567890","8901234567910"],
  ["8901234567890","8901234567911"],
  ["8901234567910","8901234567911"],
  // Butter brands
  ["8901234567891","8901234567912"],
  // Curd brands
  ["8901234567913","8901234567914"],
  // Noodles brands
  ["8901234567898","8901234567920"],
  ["8901234567898","8901234567921"],
  ["8901234567920","8901234567921"],
  // Chips/snacks
  ["8901234567899","8901234567922"],
  ["8901234567899","8901234567923"],
  ["8901234567922","8901234567923"],
  // Biscuit brands
  ["8901234567900","8901234567930"],
  ["8901234567900","8901234567931"],
  ["8901234567900","8901234567932"],
  ["8901234567900","8901234567933"],
  ["8901234567930","8901234567931"],
  ["8901234567930","8901234567932"],
  ["8901234567931","8901234567932"],
  // Rice brands
  ["8901234567895","8901234567940"],
  ["8901234567895","8901234567941"],
  ["8901234567940","8901234567941"],
  // Dal types
  ["8901234567896","8901234567942"],
  ["8901234567896","8901234567943"],
  ["8901234567942","8901234567943"],
  // Tea brands
  ["8901234567901","8901234567950"],
  ["8901234567901","8901234567951"],
  ["8901234567950","8901234567951"],
  // Coffee brands
  ["8901234567952","8901234567953"],
  // Oil brands
  ["8901234567897","8901234567960"],
  ["8901234567897","8901234567961"],
  ["8901234567960","8901234567961"],
  // Bread brands
  ["8901234567893","8901234567970"],
  ["8901234567893","8901234567971"],
  ["8901234567970","8901234567971"],
  // Honey brands
  ["8901234567892","8901234567980"],
  // Handwash brands
  ["8901234567902","8901234567990"],
  // Toothpaste brands
  ["8901234567903","8901234567991"],
  ["8901234567903","8901234567992"],
  ["8901234567991","8901234567992"],
  // Veggies
  ["8901234567904","8901234567993"],
  ["8901234567904","8901234567994"],
  ["8901234567993","8901234567994"],
];

// BOUGHT_WITH: frequently purchased together
const boughtWithEdges = [
  ["8901234567895","8901234567896"], // Rice + Dal
  ["8901234567895","8901234567897"], // Rice + Oil
  ["8901234567896","8901234567904"], // Dal + Onion
  ["8901234567897","8901234567904"], // Oil + Onion
  ["8901234567897","8901234567993"], // Oil + Tomato
  ["8901234567904","8901234567993"], // Onion + Tomato
  ["8901234567890","8901234567893"], // Milk + Bread (breakfast)
  ["8901234567890","8901234567891"], // Milk + Butter
  ["8901234567893","8901234567891"], // Bread + Butter
  ["8901234567898","8901234567890"], // Maggi + Milk
  ["8901234567899","8901234567894"], // Chips + Coconut Water
  ["8901234567922","8901234567894"], // Kurkure + Coconut Water
  ["8901234567900","8901234567950"], // Parle-G + Tea
  ["8901234567930","8901234567950"], // Good Day + Tea
  ["8901234567901","8901234567892"], // Green Tea + Honey
  ["8901234567950","8901234567892"], // Tata Tea + Honey
  ["8901234567902","8901234567903"], // Handwash + Toothpaste
  ["8901234567990","8901234567991"], // Lifebuoy + Pepsodent
  ["8901234567931","8901234567953"], // Oreo + Coffee
  ["8901234567952","8901234567931"], // Nescafe + Oreo
  ["8901234567913","8901234567893"], // Curd + Bread
  ["8901234567895","8901234567943"], // Rice + Chana Dal
];

async function seed() {
  try {
    await driver.verifyConnectivity();
    console.log("✅ Connected to Neo4j!");
  } catch(e) {
    console.error("❌ Cannot connect:", e.message);
    await driver.close(); return;
  }

  const session = driver.session();
  try {
    console.log("🗑️  Clearing old data...");
    await session.run("MATCH (n:Product) DETACH DELETE n");

    console.log("📦 Creating", products.length, "product nodes...");
    for (const p of products) {
      await session.run(
        "CREATE (:Product {barcode:$barcode,name:$name,category:$category,price:$price})", p
      );
    }
    console.log("  ✅ All nodes created");

    console.log("🔗 Creating", similarEdges.length*2, "SIMILAR_TO edges...");
    for (const [a,b] of similarEdges) {
      await session.run(
        "MATCH (a:Product{barcode:$a}),(b:Product{barcode:$b}) MERGE (a)-[:SIMILAR_TO]->(b) MERGE (b)-[:SIMILAR_TO]->(a)",
        {a,b}
      );
    }
    console.log("  ✅ Done");

    console.log("🛒 Creating", boughtWithEdges.length*2, "BOUGHT_WITH edges...");
    for (const [a,b] of boughtWithEdges) {
      await session.run(
        "MATCH (a:Product{barcode:$a}),(b:Product{barcode:$b}) MERGE (a)-[:BOUGHT_WITH]->(b) MERGE (b)-[:BOUGHT_WITH]->(a)",
        {a,b}
      );
    }
    console.log("  ✅ Done");

    console.log("\n🎉 Neo4j seed complete!");
  } catch(e) {
    console.error("Seed error:", e.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();