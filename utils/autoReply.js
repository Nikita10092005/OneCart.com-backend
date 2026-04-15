const getAutoReply = (msg) => {
  const text = msg.toLowerCase();

  if (text.includes("order")) {
    return "📦 You can track your order in Orders section → /orders";
  }

  if (text.includes("return")) {
    return "🔄 To return a product:\n1. Go to Orders\n2. Click Return\n3. Submit request";
  }

  if (text.includes("payment")) {
    return "💳 Payment failed?\nTry:\n• Different card\n• UPI\n• Check balance";
  }

  if (text.includes("hello") || text.includes("hi")) {
    return "👋 Hello! How can I help you today?";
  }

  return "🤖 I'm here to help! Try asking about orders, returns, or payments.";
};

module.exports = getAutoReply;