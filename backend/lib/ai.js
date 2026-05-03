const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseKitchenInput(message) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are a kitchen planning parser.

Return ONLY valid JSON.
No markdown.
No backticks.
No explanations.
Extract appliances like dishwasher, fridge, stove if mentioned.
Extract obstacles: doors, windows, radiators, pipes if mentioned.
Use type values: "door", "window", "radiator", "pipe" (lowercase).
Wall must be "A" or "B" when inferable; otherwise null.
start, width, height are numbers in inches when given; use null if unknown.

Example: user says "door on wall A starts at 90 inches and is 30 inches wide"
→ include in kitchen.obstacles:
{ "type": "door", "wall": "A", "start": 90, "width": 30, "height": null }

If no obstacles are mentioned, use "obstacles": [].

JSON structure:
{
  "kitchen": {
    "shape": "",
    "size": {
      "length": null,
      "width": null
    },
    "layout": {
      "sink_position": null
    },
    "appliances": [
      {
        "type": ""
      }
    ],
    "obstacles": [
      {
        "type": "",
        "wall": "",
        "start": null,
        "width": null,
        "height": null
      }
    ]
  }
}
`,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

let content = response.choices[0].message.content;

content = content.replace(/```json/g, "").replace(/```/g, "").trim();

return JSON.parse(content);
}

module.exports = { parseKitchenInput };
