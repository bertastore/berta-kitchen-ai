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

For L-shaped kitchens in this app, map horizontal side conventions when wall labels are not stated:
- "left side" / "left wall" / "along the left" → wall "A", side "left"
- "right side" / "right wall" / "along the right" → wall "B", side "right"

When the user explicitly says "wall A" or "wall B", set wall to that letter and side may be null.

Extract appliances: dishwasher, fridge, stove, sink — each as its own object when mentioned.
Include sink as an appliance when the user describes sink placement (e.g. "sink on the right", "sink under window").
Each appliance object MUST use:
{
  "type": "stove" | "fridge" | "dishwasher" | "sink",
  "wall": "A" | "B" | null,
  "side": "left" | "right" | null,
  "position": null
}

Rules for wall/side:
- If inferable from text, set wall and/or side; otherwise null.
- If only side is known, set side and leave wall null (the planner maps side to wall).
- position is always null unless the user gives an explicit inch offset (then a number).

Examples:
User: "left side has stove and fridge"
→ appliances include stove and fridge each with side "left", wall null (or wall "A" if you infer).

User: "right side has window and sink"
→ appliances include sink with side "right", wall null (or wall "B").
→ obstacles include window with wall "B" or side "right" when inferable.

Extract obstacles: doors, windows, radiators, pipes if mentioned.
Use obstacle type values: "door", "window", "radiator", "pipe" (lowercase).
Obstacles use wall "A" or "B" when inferable; otherwise null.
Optional "side": "left" | "right" on obstacles when the wall letter is not stated (same mapping as appliances).

start, width, height are numbers in inches when given; use null if unknown.

Example: user says "door on wall A starts at 90 inches and is 30 inches wide"
→ include in kitchen.obstacles:
{ "type": "door", "wall": "A", "start": 90, "width": 30, "height": null }

If no obstacles are mentioned, use "obstacles": [].

Keep layout.sink_position as a short human-readable phrase when the user describes sink placement (e.g. "left", "right", "under window"), or null.

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
        "type": "sink",
        "wall": null,
        "side": null,
        "position": null
      }
    ],
    "obstacles": [
      {
        "type": "",
        "wall": null,
        "side": null,
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
