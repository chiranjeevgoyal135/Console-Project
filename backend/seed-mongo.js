// backend/seed-mongo.js
// Run once: node seed-mongo.js
// Seeds Users + Products into MongoDB Atlas
require("dotenv").config();
const mongoose = require("mongoose");
const User    = require("./models/User");
const Product = require("./models/Product");
const Sale    = require("./models/Sale");

const USERS = [
  { email:"buyer@test.com",   password:"buyer123",  role:"buyer",  name:"Rahul Sharma"  },
  { email:"buyer2@test.com",  password:"buyer123",  role:"buyer",  name:"Priya Singh"   },
  { email:"owner@test.com",   password:"owner123",  role:"owner",  name:"Rajesh Agarwal"},
  { email:"seller@test.com",  password:"seller123", role:"seller", name:"Amit Verma",  shopId:"shop_1", shopName:"QuickMart Delhi"        },
  { email:"seller2@test.com", password:"seller123", role:"seller", name:"Neha Gupta",  shopId:"shop_2", shopName:"Blinkit Hub Mumbai"      },
  { email:"seller3@test.com", password:"seller123", role:"seller", name:"Ravi Kumar",  shopId:"shop_3", shopName:"Zepto Express Bangalore" },
];

const PRODUCTS = [
  // DAIRY
  { barcode:"8901234567890", name:"Amul Milk 500ml",         category:"Dairy",     price:28,  stock:50, unit:"packet", emoji:"🥛" },
  { barcode:"8901234567891", name:"Amul Butter 100g",        category:"Dairy",     price:55,  stock:30, unit:"pack",   emoji:"🧈" },
  { barcode:"8901234567910", name:"Nandini Milk 500ml",      category:"Dairy",     price:26,  stock:40, unit:"packet", emoji:"🥛" },
  { barcode:"8901234567911", name:"Mother Dairy Milk 1L",    category:"Dairy",     price:54,  stock:35, unit:"packet", emoji:"🥛" },
  { barcode:"8901234567913", name:"Amul Curd 400g",          category:"Dairy",     price:45,  stock:25, unit:"cup",    emoji:"🥣" },
  { barcode:"8901234567914", name:"Mother Dairy Curd 400g",  category:"Dairy",     price:42,  stock:20, unit:"cup",    emoji:"🥣" },
  // SNACKS
  { barcode:"8901234567898", name:"Maggi Noodles 70g",       category:"Snacks",    price:14,  stock:60, unit:"packet", emoji:"🍜" },
  { barcode:"8901234567920", name:"Yippee Noodles 70g",      category:"Snacks",    price:12,  stock:45, unit:"packet", emoji:"🍜" },
  { barcode:"8901234567899", name:"Lay's Classic 26g",       category:"Snacks",    price:20,  stock:45, unit:"packet", emoji:"🍿" },
  { barcode:"8901234567922", name:"Kurkure Masala 40g",      category:"Snacks",    price:20,  stock:50, unit:"packet", emoji:"🍿" },
  // BISCUITS
  { barcode:"8901234567900", name:"Parle-G Biscuits 250g",   category:"Biscuits",  price:20,  stock:80, unit:"pack",   emoji:"🍪" },
  { barcode:"8901234567930", name:"Britannia Good Day 150g", category:"Biscuits",  price:35,  stock:60, unit:"pack",   emoji:"🍪" },
  { barcode:"8901234567931", name:"Oreo Original 120g",      category:"Biscuits",  price:55,  stock:40, unit:"pack",   emoji:"🍪" },
  // GRAINS
  { barcode:"8901234567895", name:"Basmati Rice 1kg",        category:"Grains",    price:120, stock:25, unit:"bag",    emoji:"🌾" },
  { barcode:"8901234567940", name:"India Gate Rice 1kg",     category:"Grains",    price:140, stock:20, unit:"bag",    emoji:"🌾" },
  { barcode:"8901234567896", name:"Toor Dal 500g",           category:"Grains",    price:80,  stock:18, unit:"pack",   emoji:"🫘" },
  { barcode:"8901234567942", name:"Moong Dal 500g",          category:"Grains",    price:90,  stock:15, unit:"pack",   emoji:"🫘" },
  // BEVERAGES
  { barcode:"8901234567950", name:"Tata Tea Gold 250g",      category:"Beverages", price:140, stock:30, unit:"pack",   emoji:"🍵" },
  { barcode:"8901234567952", name:"Nescafe Classic 50g",     category:"Beverages", price:175, stock:18, unit:"jar",    emoji:"☕" },
  { barcode:"8901234567894", name:"Coconut Water 200ml",     category:"Beverages", price:30,  stock:40, unit:"can",    emoji:"🥥" },
  // OILS
  { barcode:"8901234567897", name:"Sunflower Oil 1L",        category:"Oils",      price:150, stock:12, unit:"bottle", emoji:"🫙" },
  { barcode:"8901234567961", name:"Saffola Gold Oil 1L",     category:"Oils",      price:200, stock:8,  unit:"bottle", emoji:"🫙" },
  // BAKERY
  { barcode:"8901234567893", name:"Brown Bread 400g",        category:"Bakery",    price:45,  stock:15, unit:"loaf",   emoji:"🍞" },
  // HEALTH
  { barcode:"8901234567892", name:"Dabur Honey 250g",        category:"Health",    price:180, stock:20, unit:"bottle", emoji:"🍯" },
  // PERSONAL CARE
  { barcode:"8901234567902", name:"Dettol Handwash 200ml",   category:"Personal",  price:85,  stock:8,  unit:"bottle", emoji:"🧴" },
  { barcode:"8901234567903", name:"Colgate 200g",            category:"Personal",  price:110, stock:14, unit:"tube",   emoji:"🪥" },
];

const SHOPS = [
  { id:"shop_1", name:"QuickMart Delhi",        city:"Delhi"     },
  { id:"shop_2", name:"Blinkit Hub Mumbai",      city:"Mumbai"    },
  { id:"shop_3", name:"Zepto Express Bangalore", city:"Bangalore" },
  { id:"shop_4", name:"Swiggy Instamart Jaipur", city:"Jaipur"   },
];

const SALE_PRODUCTS = [
  { name:"Amul Milk 500ml",         category:"Dairy",     price:28,  emoji:"🥛" },
  { name:"Parle-G Biscuits 250g",   category:"Biscuits",  price:20,  emoji:"🍪" },
  { name:"Maggi Noodles 70g",       category:"Snacks",    price:14,  emoji:"🍜" },
  { name:"Tata Tea Gold 250g",      category:"Beverages", price:140, emoji:"🍵" },
  { name:"Lay's Classic 26g",       category:"Snacks",    price:20,  emoji:"🍿" },
  { name:"Basmati Rice 1kg",        category:"Grains",    price:120, emoji:"🌾" },
  { name:"Amul Butter 100g",        category:"Dairy",     price:55,  emoji:"🧈" },
  { name:"Sunflower Oil 1L",        category:"Oils",      price:150, emoji:"🫙" },
  { name:"Nescafe Classic 50g",     category:"Beverages", price:175, emoji:"☕" },
  { name:"Brown Bread 400g",        category:"Bakery",    price:45,  emoji:"🍞" },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "smarter_blinkit" });
  console.log("✅ Connected to MongoDB");

  // Clear existing
  await User.deleteMany({});
  await Product.deleteMany({});
  await Sale.deleteMany({});
  console.log("🗑️  Cleared existing data");

  // Seed users
  await User.insertMany(USERS);
  console.log(`👥 Seeded ${USERS.length} users`);

  // Seed products
  await Product.insertMany(PRODUCTS);
  console.log(`📦 Seeded ${PRODUCTS.length} products`);

  // Seed 300 historical sales
  const now   = Date.now();
  const sales = [];
  const buyers= ["Rahul S","Priya M","Amit K","Neha G","Ravi T","Sunita R"];
  for (let i = 0; i < 300; i++) {
    const shop    = SHOPS[Math.floor(Math.random() * SHOPS.length)];
    const product = SALE_PRODUCTS[Math.floor(Math.random() * SALE_PRODUCTS.length)];
    const minsAgo = Math.floor(Math.random() * 120);
    sales.push({
      shopId: shop.id, shopName: shop.name, city: shop.city,
      productName: product.name, category: product.category,
      price: product.price, emoji: product.emoji,
      qty:   Math.floor(Math.random() * 3) + 1,
      buyer: buyers[Math.floor(Math.random() * buyers.length)],
      timestamp: new Date(now - minsAgo * 60000),
    });
  }
  await Sale.insertMany(sales);
  console.log(`📊 Seeded ${sales.length} historical sales`);

  console.log("\n✅ MongoDB seeding complete!");
  console.log("   You can now start the server: npm start");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });