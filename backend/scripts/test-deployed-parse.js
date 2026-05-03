/**
 * Test the deployed backend POST /parse endpoint.
 *
 * How to run (Node.js 18+ required for native fetch):
 *
 *   From repository root:
 *     node backend/scripts/test-deployed-parse.js
 *
 *   From the backend folder:
 *     node scripts/test-deployed-parse.js
 *
 * Optional: override URL
 *     PARSE_URL="https://your-deployment.vercel.app/parse" node backend/scripts/test-deployed-parse.js
 */

const DEFAULT_URL =
  "https://project-sw819-hante5s2v-sales-3536s-projects.vercel.app/parse";

const url = process.env.PARSE_URL || DEFAULT_URL;

const body = {
  message:
    "L-shaped kitchen 14x12, sink on left, dishwasher, stove, fridge",
};

async function main() {
  console.log("POST", url);
  console.log("Body:", JSON.stringify(body, null, 2));
  console.log("---");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Status:", res.status, res.statusText);

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("Response was not valid JSON.");
      console.log("Raw body:\n", text);
      process.exitCode = 1;
      return;
    }

    console.log("Response JSON:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Request failed:");
    console.error(err);
    process.exitCode = 1;
  }
}

main();
