const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
require("dotenv").config(); // Intenta cargar .env del directorio actual

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }
  console.log("API Key found (length):", apiKey.length);
  // print first 5 chars
  console.log("API Key start:", apiKey.substring(0, 5));

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  try {
    console.log("Ping Gemini...");
    const result = await model.generateContent("Say hi");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
