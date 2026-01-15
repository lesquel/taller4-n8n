const https = require("https");
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https
  .get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          console.error("Error:", json.error);
        } else {
          console.log("Available models:");
          json.models.forEach((m) => {
            if (m.name.includes("gemini")) {
              console.log(
                `- ${m.name} (methods: ${m.supportedGenerationMethods.join(
                  ", "
                )})`
              );
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse response:", e);
        console.log("Raw:", data);
      }
    });
  })
  .on("error", (e) => {
    console.error("Request error:", e);
  });
