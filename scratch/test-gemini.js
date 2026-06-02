import dotenv from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

dotenv.config();

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY;
  console.log("Gemini Key:", geminiKey ? `${geminiKey.slice(0, 10)}...` : "not set");
  if (!geminiKey) return;

  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: "Hello! Tell me a 1-sentence joke about antigravity.",
    });
    console.log("Success! Response from Gemini:", text);
  } catch (err) {
    console.error("Error from Gemini:", err);
  }
}

main();
