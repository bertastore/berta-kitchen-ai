import fs from "node:fs";

async function testDrawing() {
  const response = await fetch("http://localhost:3000/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message:
        "L-shaped kitchen 14x12, sink on left, dishwasher, stove, fridge, door on wall A starts at 90 inches and is 30 inches wide"
    })
  });

  const data = await response.json();

  fs.writeFileSync("kitchen.svg", data.svg);

  console.log("kitchen.svg created");
}

testDrawing();
