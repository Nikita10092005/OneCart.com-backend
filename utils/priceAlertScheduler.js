const cron = require("node-cron");
const { checkPriceDrops } = require("../controllers/priceAlertController");

// Schedule price drop check every hour
cron.schedule("0 * * * *", async () => {
  console.log("Running price drop check...");
  try {
    await checkPriceDrops();
    console.log("Price drop check completed");
  } catch (error) {
    console.error("Error in price drop check:", error);
  }
});

console.log("Price alert scheduler started - checks every hour");
