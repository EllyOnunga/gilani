import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, embed } from "ai";
import { createGoogleAiProvider } from "../src/lib/ai-gateway.server";
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

async function testEmbeddingAndChat() {
  const provider = createGoogleAiProvider();
  console.log("Created provider.");

  const startTime = Date.now();
  try {
    const embeddingModel = provider.textEmbeddingModel();
    console.log("Calling embed with maxRetries: 0...");
    const { embedding } = await embed({
      model: embeddingModel,
      value: "What is internal landforming processes?",
      maxRetries: 0, // Fail fast on quota/auth errors!
    });
    console.log("Embedding generated successfully! Length:", embedding.length);
  } catch (err: any) {
    console.log(`Embedding generation failed instantly in ${Date.now() - startTime}ms! Error:`, err.message || err);
  }

  try {
    const chatModel = provider.chatModel();
    console.log("Calling streamText...");
    const result = await streamText({
      model: chatModel,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, say hi!" }
      ],
    });

    console.log("Streaming response...");
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
      process.stdout.write(chunk);
    }
    console.log("\nStream finished successfully! Full text length:", fullText.length);
  } catch (err) {
    console.error("Chat streaming failed:", err);
  }
}

testEmbeddingAndChat();
