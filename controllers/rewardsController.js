const User = require("../models/User");
const PointHistory = require("../models/pointHistoryModel");

// Get user's points and tier info
exports.getRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user).select("points totalPointsEarned tier");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get tier thresholds
    const tierThresholds = {
      bronze: 0,
      silver: 500,
      gold: 2000,
      platinum: 5000
    };

    const nextTier = getNextTier(user.tier);
    const pointsToNextTier = nextTier ? tierThresholds[nextTier] - user.totalPointsEarned : 0;

    res.json({
      points: user.points,
      totalPointsEarned: user.totalPointsEarned,
      tier: user.tier,
      nextTier,
      pointsToNextTier: Math.max(0, pointsToNextTier),
      tierThresholds
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get point history
exports.getPointHistory = async (req, res) => {
  try {
    const history = await PointHistory.find({ userId: req.user })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper to add points to user
exports.addPoints = async (userId, points, action, description, orderId = null, metadata = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.points += points;
  user.totalPointsEarned += points;
  user.tier = calculateTier(user.totalPointsEarned);
  await user.save();

  await PointHistory.create({
    userId,
    points,
    type: "earned",
    action,
    description,
    orderId,
    metadata
  });

  return user;
};

// Helper to redeem points
exports.redeemPoints = async (userId, points, description, orderId = null) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.points < points) throw new Error("Insufficient points");

  user.points -= points;
  await user.save();

  await PointHistory.create({
    userId,
    points: -points,
    type: "redeemed",
    action: "redemption",
    description,
    orderId
  });

  return user;
};

// Calculate tier based on total points
function calculateTier(totalPoints) {
  if (totalPoints >= 5000) return "platinum";
  if (totalPoints >= 2000) return "gold";
  if (totalPoints >= 500) return "silver";
  return "bronze";
}

function getNextTier(currentTier) {
  const tiers = ["bronze", "silver", "gold", "platinum"];
  const index = tiers.indexOf(currentTier);
  return index < tiers.length - 1 ? tiers[index + 1] : null;
}
