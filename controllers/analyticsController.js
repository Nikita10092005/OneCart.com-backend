const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const User = require("../models/User");

// SALES ANALYTICS
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue trends
    const revenueTrends = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Best selling products
    const bestSellingProducts = await Order.aggregate([
      { $unwind: "$products" },
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
          revenue: { $sum: { $multiply: ["$products.quantity", "$totalAmount"] } }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          category: "$product.category",
          totalSold: 1,
          revenue: 1,
          price: "$product.price"
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Peak hours analysis
    const peakHours = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      revenueTrends,
      bestSellingProducts,
      peakHours,
      period: days
    });

  } catch (error) {
    console.error("Sales Analytics Error:", error);
    res.status(500).json({ message: "Error fetching sales analytics" });
  }
};

// CUSTOMER ANALYTICS
const getCustomerAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Purchase patterns
    const purchasePatterns = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$userId",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          totalOrders: 1,
          totalSpent: 1,
          avgOrderValue: 1
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    // Customer demographics
    const totalCustomers = await User.countDocuments();
    const activeCustomers = await Order.distinct("userId", { 
      createdAt: { $gte: startDate } 
    }).then(users => users.length);

    // Customer lifetime value
    const lifetimeValue = await Order.aggregate([
      {
        $group: {
          _id: "$userId",
          lifetimeValue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgLifetimeValue: { $avg: "$lifetimeValue" },
          totalCustomers: { $sum: 1 },
          avgOrderCount: { $avg: "$orderCount" }
        }
      }
    ]);

    // New customers over time
    const newCustomersTrend = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      purchasePatterns,
      demographics: {
        totalCustomers,
        activeCustomers,
        newCustomers: activeCustomers
      },
      lifetimeValue: lifetimeValue[0] || { avgLifetimeValue: 0, totalCustomers: 0, avgOrderCount: 0 },
      newCustomersTrend
    });

  } catch (error) {
    console.error("Customer Analytics Error:", error);
    res.status(500).json({ message: "Error fetching customer analytics" });
  }
};

// INVENTORY REPORTS
const getInventoryReports = async (req, res) => {
  try {
    // Stock levels
    const stockLevels = await Product.find({})
      .select("name category stock price discount")
      .sort({ stock: 1 });

    // Low stock alerts (stock < 10)
    const lowStockAlerts = await Product.find({ stock: { $lt: 10 } })
      .select("name category stock price")
      .sort({ stock: 1 });

    // Dead stock (no sales in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const soldProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: "$products" },
      { $group: { _id: "$products.productId" } }
    ]);

    const soldProductIds = soldProducts.map(item => item._id);
    const deadStock = await Product.find({
      _id: { $nin: soldProductIds },
      stock: { $gt: 0 }
    }).select("name category stock price");

    // Category-wise inventory
    const categoryInventory = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          avgPrice: { $avg: "$price" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Reorder suggestions
    const reorderSuggestions = await Product.find({
      $or: [
        { stock: { $lt: 5 } },
        { stock: { $lt: 20 }, category: { $in: ["Electronics", "Clothing"] } }
      ]
    }).select("name category stock price").sort({ stock: 1 });

    res.json({
      stockLevels,
      lowStockAlerts,
      deadStock,
      categoryInventory,
      reorderSuggestions,
      summary: {
        totalProducts: stockLevels.length,
        lowStockCount: lowStockAlerts.length,
        deadStockCount: deadStock.length,
        totalInventoryValue: categoryInventory.reduce((sum, cat) => sum + cat.totalValue, 0)
      }
    });

  } catch (error) {
    console.error("Inventory Reports Error:", error);
    res.status(500).json({ message: "Error fetching inventory reports" });
  }
};

// FINANCIAL REPORTS
const getFinancialReports = async (req, res) => {
  try {
    const { period = '30', type = 'daily' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue trends based on type
    let groupFormat;
    switch (type) {
      case 'weekly':
        groupFormat = { $week: "$createdAt" };
        break;
      case 'monthly':
        groupFormat = { $month: "$createdAt" };
        break;
      default:
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const revenueTrends = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Profit margins (simplified - assuming 70% cost)
    const profitAnalysis = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          estimatedCost: { $sum: { $multiply: ["$totalAmount", 0.7] } }
        }
      },
      {
        $addFields: {
          estimatedProfit: { $subtract: ["$totalRevenue", "$estimatedCost"] },
          profitMargin: { 
            $multiply: [
              { $divide: [{ $subtract: ["$totalRevenue", "$estimatedCost"] }, "$totalRevenue"] },
              100
            ]
          }
        }
      }
    ]);

    // Payment method analysis
    const paymentMethods = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$payment",
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Category-wise revenue
    const categoryRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          revenue: { $sum: { $multiply: ["$products.quantity", "$product.price"] } },
          unitsSold: { $sum: "$products.quantity" }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Daily/Weekly/Monthly comparison
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    const currentPeriod = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }
    ]);

    const previousPeriod = await Order.aggregate([
      { $match: { createdAt: { $gte: previousPeriodStart, $lt: startDate } } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }
    ]);

    const current = currentPeriod[0] || { revenue: 0, orders: 0 };
    const previous = previousPeriod[0] || { revenue: 0, orders: 0 };

    const revenueGrowth = previous.revenue > 0 
      ? ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(2)
      : 0;

    const orderGrowth = previous.orders > 0
      ? ((current.orders - previous.orders) / previous.orders * 100).toFixed(2)
      : 0;

    res.json({
      revenueTrends,
      profitAnalysis: profitAnalysis[0] || { totalRevenue: 0, estimatedProfit: 0, profitMargin: 0 },
      paymentMethods,
      categoryRevenue,
      growthComparison: {
        currentPeriod: current,
        previousPeriod: previous,
        revenueGrowth: parseFloat(revenueGrowth),
        orderGrowth: parseFloat(orderGrowth)
      },
      summary: {
        totalRevenue: current.revenue,
        totalOrders: current.orders,
        avgOrderValue: current.orders > 0 ? current.revenue / current.orders : 0
      }
    });

  } catch (error) {
    console.error("Financial Reports Error:", error);
    res.status(500).json({ message: "Error fetching financial reports" });
  }
};

module.exports = {
  getSalesAnalytics,
  getCustomerAnalytics,
  getInventoryReports,
  getFinancialReports
};
