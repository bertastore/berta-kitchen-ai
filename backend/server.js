const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { generateKitchenPlan } = require("./lib/rules.js");
const { parseKitchenInput } = require("./lib/ai.js");
const { generateKitchenSVG } = require("./lib/drawing");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Berta Kitchen AI is running 🚀");
});

app.post("/parse", async (req, res) => {
  const { message } = req.body;

  try {
    const result = await parseKitchenInput(message);
    const plan = generateKitchenPlan(result.kitchen);
    const svg = generateKitchenSVG(plan);
    res.json({
      parsedInput: result,
      plan,
      svg,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
