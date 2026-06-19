import { supabaseAdmin } from "../src/integrations/supabase/client.server";
import { embed, generateText } from "ai";
import { createGoogleAiProvider } from "../src/lib/ai-gateway.server";
//npx tsx --env-file=.env scratch/load-test.ts

const CONCURRENT_USERS = 20;

interface TestResult {
    userId: string;
    embedDurationMs: number;
    dbDurationMs: number;
    chatDurationMs: number;
    totalDurationMs: number;
    success: boolean;
    error?: string;
    personalChunksFound: number;
}

async function runSingleUserSession(userId: string, index: number, queryText: string): Promise<TestResult> {
    const result: TestResult = {
        userId,
        embedDurationMs: 0,
        dbDurationMs: 0,
        chatDurationMs: 0,
        totalDurationMs: 0,
        success: false,
        personalChunksFound: 0
    };

    console.log(`[User ${index + 1}] Starting session for user ${userId.slice(0, 8)}...`);
    const totalStart = Date.now();

    try {
        // 1. Embedding generation
        const embedStart = Date.now();
        const provider = createGoogleAiProvider();
        const embModel = provider.textEmbeddingModel();

        const { embedding } = await embed({
            model: embModel,
            value: queryText,
            maxRetries: 0,
            providerOptions: {
                google: {
                    outputDimensionality: 768,
                },
            },
        });
        result.embedDurationMs = Date.now() - embedStart;
        const embeddingStr = `[${embedding.join(",")}]`;

        // 2. Parallel Database RPC Search
        const dbStart = Date.now();
        const [personalResult, globalResult] = await Promise.all([
            supabaseAdmin.rpc("match_note_chunks", {
                query_embedding: embeddingStr,
                match_user_id: userId,
                match_count: 5,
            }),
            supabaseAdmin.rpc("match_global_note_chunks", {
                query_embedding: embeddingStr,
                match_count: 5,
            })
        ]);
        result.dbDurationMs = Date.now() - dbStart;

        if (personalResult.error) {
            throw new Error(`Personal DB RPC error: ${personalResult.error.message}`);
        }
        if (globalResult.error) {
            throw new Error(`Global DB RPC error: ${globalResult.error.message}`);
        }

        const personalCount = personalResult.data?.length ?? 0;
        const globalCount = globalResult.data?.length ?? 0;
        result.personalChunksFound = personalCount;

        // 3. Call Chat Model (simulate response)
        const chatStart = Date.now();
        const chatModel = provider.chatModel();

        const contextStr = (personalResult.data ?? []).map((c: any) => c.content).join("\n---\n");
        const prompt = `
Context: ${contextStr || "No notes found."}
Question: ${queryText}
`;

        const chatRes = await generateText({
            model: chatModel,
            prompt: prompt,
            system: "You are a helpful KCSE physics tutor. Answer the student's question based on their notes context.",
            temperature: 0.7,
            maxRetries: 1
        });
        result.chatDurationMs = Date.now() - chatStart;

        result.totalDurationMs = Date.now() - totalStart;
        result.success = true;
        console.log(`[User ${index + 1}] ✓ Completed in ${result.totalDurationMs}ms (Embed: ${result.embedDurationMs}ms, DB: ${result.dbDurationMs}ms, Chat: ${result.chatDurationMs}ms). Found ${personalCount} personal chunks.`);
    } catch (err: any) {
        result.totalDurationMs = Date.now() - totalStart;
        result.success = false;
        result.error = err?.message ?? String(err);
        console.error(`[User ${index + 1}] ✗ Failed after ${result.totalDurationMs}ms. Error: ${result.error}`);
    }

    return result;
}

async function main() {
    console.log(`===========================================================`);
    console.log(`   GILANI AI - HEAVY LOAD SIMULATION (${CONCURRENT_USERS} CONCURRENT USERS)`);
    console.log(`===========================================================`);

    // Get active users from profiles
    const { data: users, error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(CONCURRENT_USERS);

    if (error || !users || users.length === 0) {
        console.error("Failed to fetch user profiles for load testing:", error);
        process.exit(1);
    }

    console.log(`Fetched ${users.length} active user profiles to use for load testing.`);

    // Fill up to CONCURRENT_USERS if database has fewer profiles
    const testUsers: string[] = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        const u = users[i % users.length];
        testUsers.push(u.id);
    }

    const testQueries = [
        "What is Hooke's Law?",
        "Explain Newton's third law of motion.",
        "How is the volume of a cylinder calculated?",
        "What is the difference between mass and weight?",
        "Outline the advantages of a sole trader.",
        "Define vector quantities vs scalar quantities.",
        "Explain electromagnetic induction.",
        "Solve for density given mass 65g and volume 10cm3."
    ];

    console.log(`Launching ${CONCURRENT_USERS} parallel user requests...\n`);

    const startTime = Date.now();
    const promises = testUsers.map((userId, index) => {
        const queryText = testQueries[index % testQueries.length];
        return runSingleUserSession(userId, index, queryText);
    });

    const results = await Promise.all(promises);
    const overallDuration = Date.now() - startTime;

    // Compile Stats
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const avgTotal = successful.length > 0 ? successful.reduce((sum, r) => sum + r.totalDurationMs, 0) / successful.length : 0;
    const avgEmbed = successful.length > 0 ? successful.reduce((sum, r) => sum + r.embedDurationMs, 0) / successful.length : 0;
    const avgDb = successful.length > 0 ? successful.reduce((sum, r) => sum + r.dbDurationMs, 0) / successful.length : 0;
    const avgChat = successful.length > 0 ? successful.reduce((sum, r) => sum + r.chatDurationMs, 0) / successful.length : 0;

    console.log(`\n===========================================================`);
    console.log(`                      SIMULATION SUMMARY`);
    console.log(`===========================================================`);
    console.log(`Total Concurrent Users Simulated: ${CONCURRENT_USERS}`);
    console.log(`Successful Requests:              ${successful.length} / ${CONCURRENT_USERS} (${(successful.length / CONCURRENT_USERS * 100).toFixed(1)}%)`);
    console.log(`Failed Requests:                  ${failed.length} / ${CONCURRENT_USERS} (${(failed.length / CONCURRENT_USERS * 100).toFixed(1)}%)`);
    console.log(`Total Simulation Time:            ${(overallDuration / 1000).toFixed(2)}s`);

    if (successful.length > 0) {
        console.log(`\nAverage Latencies for Successful Requests:`);
        console.log(`  - Embedding Generation:         ${avgEmbed.toFixed(1)}ms`);
        console.log(`  - Database Vector Search:       ${avgDb.toFixed(1)}ms`);
        console.log(`  - Chat Generation (LLM):        ${avgChat.toFixed(1)}ms`);
        console.log(`  - Total End-to-End:            ${avgTotal.toFixed(1)}ms`);
    }

    if (failed.length > 0) {
        console.log(`\nFailed Request Error Summary:`);
        const errorCounts: Record<string, number> = {};
        failed.forEach(f => {
            const err = f.error || "Unknown Error";
            errorCounts[err] = (errorCounts[err] || 0) + 1;
        });
        Object.entries(errorCounts).forEach(([err, count]) => {
            console.log(`  - [${count} occurrences] ${err}`);
        });
    }

    console.log(`===========================================================`);
}

main().catch(console.error);
