// data/inventory.js — product catalog with barcodes
// Each product has a barcode — seller scans/types it to update stock

const inventory = [
  { barcode: "8901234567890", name: "Amul Milk 500ml",      category: "Dairy",    price: 28,  stock: 50,  unit: "packet" },
  { barcode: "8901234567891", name: "Amul Butter 100g",     category: "Dairy",    price: 55,  stock: 30,  unit: "pack"   },
  { barcode: "8901234567892", name: "Honey 250g",           category: "Health",   price: 180, stock: 20,  unit: "bottle" },
  { barcode: "8901234567893", name: "Brown Bread",          category: "Bakery",   price: 45,  stock: 15,  unit: "loaf"   },
  { barcode: "8901234567894", name: "Coconut Water 200ml",  category: "Drinks",   price: 30,  stock: 40,  unit: "can"    },
  { barcode: "8901234567895", name: "Basmati Rice 1kg",     category: "Grains",   price: 120, stock: 25,  unit: "bag"    },
  { barcode: "8901234567896", name: "Toor Dal 500g",        category: "Grains",   price: 80,  stock: 18,  unit: "pack"   },
  { barcode: "8901234567897", name: "Sunflower Oil 1L",     category: "Oils",     price: 150, stock: 12,  unit: "bottle" },
  { barcode: "8901234567898", name: "Maggi Noodles",        category: "Snacks",   price: 14,  stock: 60,  unit: "packet" },
  { barcode: "8901234567899", name: "Lay's Classic 26g",    category: "Snacks",   price: 20,  stock: 45,  unit: "packet" },
  { barcode: "8901234567900", name: "Parle-G Biscuits",     category: "Snacks",   price: 10,  stock: 80,  unit: "pack"   },
  { barcode: "8901234567901", name: "Lipton Green Tea 25pk",category: "Beverages",price: 95,  stock: 22,  unit: "box"    },
  { barcode: "8901234567902", name: "Dettol Handwash 200ml",category: "Personal", price: 85,  stock: 8,   unit: "bottle" },
  { barcode: "8901234567903", name: "Colgate 200g",         category: "Personal", price: 110, stock: 14,  unit: "tube"   },
  { barcode: "8901234567904", name: "Onions 1kg",           category: "Veggies",  price: 35,  stock: 0,   unit: "kg"     },
];

module.exports = inventory;