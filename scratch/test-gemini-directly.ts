import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, embed } from "ai";
import * as fs from "fs";

// Load env and strip quotes
try {
  const envContent = fs.readFileSync(".env", "utf-8");
  envContent.split("\n").forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = m[2]?.trim() || "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  });
} catch (e) {}

const geminiKey = process.env.GEMINI_API_KEY || "";
console.log("Using GEMINI_API_KEY starts with:", geminiKey.substring(0, 10));

async function testGemini() {
  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  
  try {
    console.log("Calling Google embedding model...");
    const { embedding } = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: "Hello world",
    });
    console.log("Success! Google embedding generated. Length:", embedding.length);
  } catch (err: any) {
    console.error("Google embedding failed:", err.message || err);
  }

  try {
    console.log("Calling Google chat model...");
    const result = await streamText({
      model: google("gemini-2.0-flash"),
      prompt: "Say hello!",
    });
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
      process.stdout.write(chunk);
    }
    console.log("\nSuccess! Google chat streamed. Length:", fullText.length);
  } catch (err: any) {
    console.error("Google chat failed:", err.message || err);
  }
}

testGemini();
