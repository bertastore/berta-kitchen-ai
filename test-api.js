const url = "https://project-sw819-git-main-sales-3536s-projects.vercel.app/api/parse";

async function testAPI() {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "L-shaped kitchen 14x12, sink on left, dishwasher, stove, fridge"
      })
    });

    console.log("Status:", response.status);

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("Error:", error);
  }
}

testAPI();
