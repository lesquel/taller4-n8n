const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  try {
    console.log("Testing simple generation...");
    const result = await model.generateContent(
      "Hola, esto es una prueba rapida."
    );
    const response = await result.response;
    console.log("Success! Response:", response.text());
  } catch (error) {
    console.error("Error details:", error.message);
    if (error.status) console.error("Status:", error.status);

    // Check quota details if available
    if (error.response) {
      console.error(
        "Full error response:",
        JSON.stringify(error.response, null, 2)
      );
    }
  }
}

test();
