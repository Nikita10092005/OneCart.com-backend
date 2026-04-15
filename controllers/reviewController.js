const Review = require("../models/reviewModel");
const Product = require("../models/productModel");
const User = require("../models/User");
const mongoose = require("mongoose");
const { addPoints } = require("./rewardsController");
const { recomputeSellerRating } = require("../utils/sellerMetrics");

// CREATE REVIEW
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    // Check if user purchased this product (for verified badge)
    const Order = require("../models/orderModel");
    const userOrders = await Order.find({ 
      userId, 
      'products.productId': productId,
      status: 'Delivered'
    });

    const review = new Review({
      productId,
      userId,
      rating,
      title,
      comment,
      images: images || [],
      verified: userOrders.length > 0
    });

    await review.save();

    // Update product's average rating
    await updateProductRating(productId);

    // Recompute seller rating (fire and forget)
    recomputeSellerRating(product.sellerId);

    // Add points for review (50 points per review)
    try {
      await addPoints(userId, 50, "review", `Earned 50 points for reviewing ${product.name}`, null, { productId, rating });
    } catch (e) {
      console.error("Failed to add review points:", e);
    }

    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name')
      .populate('productId', 'name');

    res.status(201).json({
      message: "Review created successfully",
      review: populatedReview
    });

  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET PRODUCT REVIEWS
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ productId, hidden: { $ne: true } })
      .populate('userId', 'name')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ productId, hidden: { $ne: true } });

    // Calculate rating distribution
    const ratingStats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), hidden: { $ne: true } } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      ratingStats
    });

  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE REVIEW HELPFUL COUNT
const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Simple increment (in production, you'd track which users marked helpful)
    review.helpful += 1;
    await review.save();

    res.json({ message: "Review marked as helpful", helpful: review.helpful });

  } catch (error) {
    console.error("Error marking review helpful:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE REVIEW
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user;

    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await Review.findByIdAndDelete(reviewId);
    await updateProductRating(review.productId);

    // Recompute seller rating (fire and forget)
    const reviewedProduct = await Product.findById(review.productId);
    recomputeSellerRating(reviewedProduct?.sellerId);

    res.json({ message: "Review deleted successfully" });

  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// HELPER FUNCTION TO UPDATE PRODUCT RATING
const updateProductRating = async (productId) => {
  try {
    const ratingStats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const stats = ratingStats[0] || { avgRating: 0, totalReviews: 0 };
    
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats.avgRating * 10) / 10,
      totalReviews: stats.totalReviews
    });

  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

module.exports = {
  createReview,
  getProductReviews,
  markReviewHelpful,
  deleteReview,
  updateProductRating,
  addReview: createReview,
  getReviews: getProductReviews
};