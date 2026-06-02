import dotenv from "dotenv";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

dotenv.config();

async function main() {
  const groqKey = process.env.GROQ_API_KEY;
  console.log("Groq Key:", groqKey ? `${groqKey.slice(0, 10)}...` : "not set");
  if (!groqKey) return;

  const groq = createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqKey,
  });

  try {
    const { text } = await generateText({
      model: groq.chatModel("llama-3.3-70b-versatile"),
      prompt: "Hello! Tell me a 1-sentence joke about antigravity.",
    });
    console.log("Success! Response from Groq:", text);
  } catch (err) {
    console.error("Error from Groq:", err);
  }
}

main();
