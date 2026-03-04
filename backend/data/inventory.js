const inventory = [
  // ── DAIRY ──
  { barcode: "8901234567890", name: "Amul Milk 500ml",         category: "Dairy",     price: 28,  stock: 50, unit: "packet", emoji: "🥛" },
  { barcode: "8901234567891", name: "Amul Butter 100g",        category: "Dairy",     price: 55,  stock: 30, unit: "pack",   emoji: "🧈" },
  { barcode: "8901234567910", name: "Nandini Milk 500ml",      category: "Dairy",     price: 26,  stock: 40, unit: "packet", emoji: "🥛" },
  { barcode: "8901234567911", name: "Mother Dairy Milk 1L",    category: "Dairy",     price: 54,  stock: 35, unit: "packet", emoji: "🥛" },
  { barcode: "8901234567912", name: "Britannia Butter 100g",   category: "Dairy",     price: 52,  stock: 0,  unit: "pack",   emoji: "🧈" },
  { barcode: "8901234567913", name: "Amul Curd 400g",          category: "Dairy",     price: 45,  stock: 25, unit: "cup",    emoji: "🥣" },
  { barcode: "8901234567914", name: "Mother Dairy Curd 400g",  category: "Dairy",     price: 42,  stock: 20, unit: "cup",    emoji: "🥣" },

  // ── SNACKS ──
  { barcode: "8901234567898", name: "Maggi Noodles",           category: "Snacks",    price: 14,  stock: 60, unit: "packet", emoji: "🍜" },
  { barcode: "8901234567920", name: "Yippee Noodles",          category: "Snacks",    price: 12,  stock: 45, unit: "packet", emoji: "🍜" },
  { barcode: "8901234567921", name: "Top Ramen Noodles",       category: "Snacks",    price: 13,  stock: 30, unit: "packet", emoji: "🍜" },
  { barcode: "8901234567899", name: "Lay's Classic 26g",       category: "Snacks",    price: 20,  stock: 45, unit: "packet", emoji: "🍿" },
  { barcode: "8901234567922", name: "Kurkure Masala 40g",      category: "Snacks",    price: 20,  stock: 50, unit: "packet", emoji: "🍿" },
  { barcode: "8901234567923", name: "Pringles Original 110g",  category: "Snacks",    price: 99,  stock: 20, unit: "can",    emoji: "🍿" },
  { barcode: "8901234567900", name: "Parle-G Biscuits 250g",   category: "Biscuits",  price: 20,  stock: 80, unit: "pack",   emoji: "🍪" },
  { barcode: "8901234567930", name: "Britannia Good Day 150g", category: "Biscuits",  price: 35,  stock: 60, unit: "pack",   emoji: "🍪" },
  { barcode: "8901234567931", name: "Oreo Original 120g",      category: "Biscuits",  price: 55,  stock: 40, unit: "pack",   emoji: "🍪" },
  { barcode: "8901234567932", name: "Hide & Seek 100g",        category: "Biscuits",  price: 30,  stock: 35, unit: "pack",   emoji: "🍪" },
  { barcode: "8901234567933", name: "Monaco Crackers 200g",    category: "Biscuits",  price: 25,  stock: 45, unit: "pack",   emoji: "🍪" },

  // ── GRAINS ──
  { barcode: "8901234567895", name: "Basmati Rice 1kg",        category: "Grains",    price: 120, stock: 25, unit: "bag",    emoji: "🌾" },
  { barcode: "8901234567940", name: "India Gate Rice 1kg",     category: "Grains",    price: 140, stock: 20, unit: "bag",    emoji: "🌾" },
  { barcode: "8901234567941", name: "Daawat Rozana Rice 1kg",  category: "Grains",    price: 110, stock: 18, unit: "bag",    emoji: "🌾" },
  { barcode: "8901234567896", name: "Toor Dal 500g",           category: "Grains",    price: 80,  stock: 18, unit: "pack",   emoji: "🫘" },
  { barcode: "8901234567942", name: "Moong Dal 500g",          category: "Grains",    price: 90,  stock: 15, unit: "pack",   emoji: "🫘" },
  { barcode: "8901234567943", name: "Chana Dal 500g",          category: "Grains",    price: 75,  stock: 22, unit: "pack",   emoji: "🫘" },

  // ── BEVERAGES ──
  { barcode: "8901234567901", name: "Lipton Green Tea 25pk",   category: "Beverages", price: 95,  stock: 22, unit: "box",    emoji: "🍵" },
  { barcode: "8901234567950", name: "Tata Tea Gold 250g",      category: "Beverages", price: 140, stock: 30, unit: "pack",   emoji: "🍵" },
  { barcode: "8901234567951", name: "Red Label Tea 250g",      category: "Beverages", price: 130, stock: 25, unit: "pack",   emoji: "🍵" },
  { barcode: "8901234567952", name: "Nescafe Classic 50g",     category: "Beverages", price: 175, stock: 18, unit: "jar",    emoji: "☕" },
  { barcode: "8901234567953", name: "Bru Coffee 50g",          category: "Beverages", price: 160, stock: 20, unit: "jar",    emoji: "☕" },
  { barcode: "8901234567894", name: "Coconut Water 200ml",     category: "Beverages", price: 30,  stock: 40, unit: "can",    emoji: "🥥" },

  // ── OILS ──
  { barcode: "8901234567897", name: "Sunflower Oil 1L",        category: "Oils",      price: 150, stock: 12, unit: "bottle", emoji: "🫙" },
  { barcode: "8901234567960", name: "Fortune Refined Oil 1L",  category: "Oils",      price: 145, stock: 10, unit: "bottle", emoji: "🫙" },
  { barcode: "8901234567961", name: "Saffola Gold Oil 1L",     category: "Oils",      price: 200, stock: 8,  unit: "bottle", emoji: "🫙" },

  // ── BAKERY ──
  { barcode: "8901234567893", name: "Brown Bread 400g",        category: "Bakery",    price: 45,  stock: 15, unit: "loaf",   emoji: "🍞" },
  { barcode: "8901234567970", name: "Harvest Gold Bread 400g", category: "Bakery",    price: 42,  stock: 12, unit: "loaf",   emoji: "🍞" },
  { barcode: "8901234567971", name: "Modern Bread 400g",       category: "Bakery",    price: 40,  stock: 10, unit: "loaf",   emoji: "🍞" },

  // ── HEALTH ──
  { barcode: "8901234567892", name: "Honey 250g",              category: "Health",    price: 180, stock: 20, unit: "bottle", emoji: "🍯" },
  { barcode: "8901234567980", name: "Patanjali Honey 250g",    category: "Health",    price: 140, stock: 15, unit: "bottle", emoji: "🍯" },

  // ── PERSONAL CARE ──
  { barcode: "8901234567902", name: "Dettol Handwash 200ml",   category: "Personal",  price: 85,  stock: 8,  unit: "bottle", emoji: "🧴" },
  { barcode: "8901234567990", name: "Lifebuoy Handwash 200ml", category: "Personal",  price: 75,  stock: 12, unit: "bottle", emoji: "🧴" },
  { barcode: "8901234567903", name: "Colgate 200g",            category: "Personal",  price: 110, stock: 14, unit: "tube",   emoji: "🪥" },
  { barcode: "8901234567991", name: "Pepsodent 200g",          category: "Personal",  price: 95,  stock: 18, unit: "tube",   emoji: "🪥" },
  { barcode: "8901234567992", name: "Sensodyne 70g",           category: "Personal",  price: 140, stock: 10, unit: "tube",   emoji: "🪥" },

  // ── VEGGIES ──
  { barcode: "8901234567904", name: "Onions 1kg",              category: "Veggies",   price: 35,  stock: 0,  unit: "kg",     emoji: "🧅" },
  { barcode: "8901234567993", name: "Tomatoes 500g",           category: "Veggies",   price: 25,  stock: 30, unit: "pack",   emoji: "🍅" },
  { barcode: "8901234567994", name: "Potatoes 1kg",            category: "Veggies",   price: 30,  stock: 25, unit: "kg",     emoji: "🥔" },
];

module.exports = inventory;