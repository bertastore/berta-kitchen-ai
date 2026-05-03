import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { generateKitchenPlan } from "./lib/rules.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { parseKitchenInput } from "./lib/ai.js";

const require = createRequire(import.meta.url);
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
      svg
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;

// Local dev only (same idea as require.main === module in CommonJS).
const ranAsMainScript =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (ranAsMainScript) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Vercel @vercel/node expects default export (ESM; not module.exports).
export default app;
