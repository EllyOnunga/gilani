import dotenv from "dotenv";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";

dotenv.config();

async function main() {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return;

  const groq = createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqKey,
  });

  try {
    const { object } = await generateObject({
      model: groq.chatModel("llama-3.3-70b-versatile"),
      schema: z.object({
        joke: z.string(),
      }),
      prompt: "Tell me a joke about antigravity.",
    });
    console.log("Success! Object from Groq:", object);
  } catch (err) {
    console.error("Error from Groq generateObject:", err);
  }
}

main();
