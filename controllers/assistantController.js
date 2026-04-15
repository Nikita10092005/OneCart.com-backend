const Product = require("../models/productModel");

const KNOWN_CATEGORIES = [
  "electronics", "fashion", "clothing", "shoes", "laptop", "mobile", "phone",
  "watch", "headphone", "camera", "tablet", "accessories", "men", "women",
  "kids", "sports", "fitness", "casual", "party", "jewelry", "toys", "books",
  "furniture", "home", "kitchen"
];

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
  "its", "may", "new", "now", "old", "see", "two", "way", "who", "boy",
  "did", "let", "put", "say", "she", "too", "use", "show", "find", "want",
  "need", "give", "some", "with", "that", "this", "from", "have", "been",
  "they", "will", "what", "when", "your", "than", "then", "into", "more",
  "also", "just", "like", "good", "best", "nice", "any", "buy", "price",
  "under", "below", "above", "over", "less", "than", "more", "products",
  "items", "something", "please", "show", "me", "give", "find", "search"
]);

const queryAssistant = async (req, res) => {
  try {
    const query = (req.body.query || "").trim();

    // --- Extract maxPrice ---
    let maxPrice = null;
    const maxPatterns = [
      /under\s+₹?(\d+)/i,
      /below\s+₹?(\d+)/i,
      /less\s+than\s+₹?(\d+)/i
    ];
    for (const pattern of maxPatterns) {
      const match = query.match(pattern);
      if (match) { maxPrice = Number(match[1]); break; }
    }

    // --- Extract minPrice ---
    let minPrice = null;
    const minPatterns = [
      /above\s+₹?(\d+)/i,
      /over\s+₹?(\d+)/i,
      /more\s+than\s+₹?(\d+)/i
    ];
    for (const pattern of minPatterns) {
      const match = query.match(pattern);
      if (match) { minPrice = Number(match[1]); break; }
    }

    // --- Extract category ---
    let category = null;
    const lowerQuery = query.toLowerCase();
    for (const cat of KNOWN_CATEGORIES) {
      const catRegex = new RegExp(`\\b${cat}\\b`, "i");
      if (catRegex.test(lowerQuery)) {
        category = cat;
        break;
      }
    }

    // --- Extract keyword ---
    // Remove price patterns and category from query, then pick significant words
    let cleaned = query
      .replace(/under\s+₹?\d+/gi, "")
      .replace(/below\s+₹?\d+/gi, "")
      .replace(/less\s+than\s+₹?\d+/gi, "")
      .replace(/above\s+₹?\d+/gi, "")
      .replace(/over\s+₹?\d+/gi, "")
      .replace(/more\s+than\s+₹?\d+/gi, "");

    if (category) {
      cleaned = cleaned.replace(new RegExp(`\\b${category}\\b`, "gi"), "");
    }

    const words = cleaned
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOPWORDS.has(w));

    const keyword = words.length > 0 ? words[0] : null;

    // --- No filters at all ---
    if (!maxPrice && !minPrice && !category && !keyword) {
      return res.json({
        filters: {},
        products: [],
        message: "I couldn't understand that. Try something like 'Show me shoes under ₹2000'."
      });
    }

    // --- Build Mongoose query ---
    const mongoQuery = {};

    if (maxPrice !== null || minPrice !== null) {
      mongoQuery.price = {};
      if (maxPrice !== null) mongoQuery.price.$lte = maxPrice;
      if (minPrice !== null) mongoQuery.price.$gte = minPrice;
    }

    if (category) {
      mongoQuery.$or = [
        { category: { $regex: category, $options: "i" } },
        { name: { $regex: category, $options: "i" } }
      ];
    }

    if (keyword) {
      const keywordConditions = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
      if (mongoQuery.$or) {
        // Merge: both category and keyword must match via $and
        mongoQuery.$and = [
          { $or: mongoQuery.$or },
          { $or: keywordConditions }
        ];
        delete mongoQuery.$or;
      } else {
        mongoQuery.$or = keywordConditions;
      }
    }

    const products = await Product.find(mongoQuery);

    const filters = {};
    if (maxPrice !== null) filters.maxPrice = maxPrice;
    if (minPrice !== null) filters.minPrice = minPrice;
    if (category) filters.category = category;
    if (keyword) filters.keyword = keyword;

    return res.json({ filters, products });

  } catch (error) {
    console.error("Assistant query error:", error);
    res.status(500).json({ message: "Error processing assistant query" });
  }
};

module.exports = { queryAssistant };
