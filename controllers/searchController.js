const Product = require("../models/productModel");

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for",
  "is", "and", "or", "jpg", "jpeg", "png", "webp",
  "img", "image", "photo", "pic"
]);

const imageSearch = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  let keywords = req.file.originalname
    .split(/[^a-zA-Z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  // TODO: If GOOGLE_CLOUD_VISION_KEY is set, call Vision API to extract labels
  // and merge/replace keywords with Vision results.
  if (process.env.GOOGLE_CLOUD_VISION_KEY) {
    try {
      // TODO: integrate Vision API call here
    } catch (err) {
      console.error("Vision API error, falling back to filename keywords:", err);
    }
  }

  if (keywords.length === 0) {
    return res.json({ products: [] });
  }

  const orClauses = keywords.flatMap((kw) => [
    { name: { $regex: kw, $options: "i" } },
    { category: { $regex: kw, $options: "i" } },
    { description: { $regex: kw, $options: "i" } },
  ]);

  const matches = await Product.find({ $or: orClauses });

  const scored = matches.map((product) => {
    const haystack = [
      product.name || "",
      product.category || "",
      product.description || "",
    ]
      .join(" ")
      .toLowerCase();

    const score = keywords.reduce(
      (acc, kw) => acc + (haystack.includes(kw) ? 1 : 0),
      0
    );

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const products = scored.slice(0, 10).map((s) => s.product);

  return res.json({ products });
};

module.exports = { imageSearch };
