const { parseKitchenInput } = require("../backend/lib/ai");
const { generateKitchenPlan } = require("../backend/lib/rules");
const { generateKitchenSVG } = require("../backend/lib/drawing");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    const parsedInput = await parseKitchenInput(message);
    const plan = generateKitchenPlan(parsedInput.kitchen);
    const svg = generateKitchenSVG(plan);

    return res.status(200).json({
      parsedInput,
      plan,
      svg,
    });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      error: "Failed to generate kitchen plan",
      details: error.message,
    });
  }
};
