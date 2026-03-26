const https = require("https");

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { messages, systemPrompt } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "GEMINI_API_KEY not configured" }) };
    }

    const geminiBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
    });

    const responseText = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(geminiBody),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.write(geminiBody);
      req.end();
    });

    const parsed = JSON.parse(responseText);
    const reply = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("ai-companion function error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
