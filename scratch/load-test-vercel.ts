import { supabaseAdmin } from "../src/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
//npx tsx --env-file=.env scratch/load-test-vercel.ts

const CONCURRENT_USERS = 20;
const DEPLOYED_URL = "https://gilaniai.site/api/chat";

const supabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface VercelTestResult {
    userId: string;
    email: string;
    firstTokenMs: number;
    completionMs: number;
    success: boolean;
    statusCode?: number;
    error?: string;
}

async function runSingleUserSession(
    email: string,
    password: string,
    index: number,
    queryText: string
): Promise<VercelTestResult> {
    const result: VercelTestResult = {
        userId: "",
        email,
        firstTokenMs: 0,
        completionMs: 0,
        success: false
    };

    console.log(`[User ${index + 1}] Creating confirmed test user in Supabase auth...`);
    let createdUser: any = null;
    let convoId = "";

    try {
        // 1. Create a confirmed user in Auth
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (createError || !userData.user) {
            throw new Error(`Failed to create user in Auth: ${createError?.message}`);
        }

        createdUser = userData.user;
        result.userId = createdUser.id;

        // 2. Log the user in to get a valid client JWT token
        const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (signInError || !authData.session) {
            throw new Error(`Failed to sign in and get token: ${signInError?.message}`);
        }

        const token = authData.session.access_token;

        // 3. Create a thread for the user in the database
        convoId = crypto.randomUUID();
        const { error: convoError } = await supabaseAdmin
            .from("conversations")
            .insert({
                id: convoId,
                user_id: createdUser.id,
                title: `Load Test Thread ${index + 1}`
            });

        if (convoError) {
            throw new Error(`Failed to create conversation: ${convoError.message}`);
        }

        // 4. Fire POST request to the deployed Vercel endpoint
        console.log(`[User ${index + 1}] Sending chat request to Vercel URL...`);
        const requestStart = Date.now();

        const response = await fetch(DEPLOYED_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Origin": "https://gilaniai.site"
            },
            body: JSON.stringify({
                threadId: convoId,
                messages: [
                    { role: "user", content: queryText }
                ]
            })
        });

        result.statusCode = response.status;
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}: ${await response.text()}`);
        }

        // 5. Read the SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Response body is not readable");
        }

        let firstTokenReceived = false;

        while (true) {
            const { done, value } = await reader.read();
            if (!firstTokenReceived) {
                result.firstTokenMs = Date.now() - requestStart;
                firstTokenReceived = true;
            }
            if (done) break;
        }

        result.completionMs = Date.now() - requestStart;
        result.success = true;
        console.log(`[User ${index + 1}] ✓ Completed: 1st token in ${result.firstTokenMs}ms, Done in ${result.completionMs}ms (HTTP ${response.status})`);

    } catch (err: any) {
        result.success = false;
        result.error = err?.message ?? String(err);
        console.error(`[User ${index + 1}] ✗ Failed: ${result.error}`);
    } finally {
        // 6. Clean up: delete conversation and user
        try {
            if (convoId) {
                await supabaseAdmin.from("conversations").delete().eq("id", convoId);
            }
            if (createdUser?.id) {
                await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
                console.log(`[User ${index + 1}] Cleaned up user ${createdUser.id.slice(0, 8)}`);
            }
        } catch (cleanupErr: any) {
            console.error(`[User ${index + 1}] Cleanup warning: ${cleanupErr.message}`);
        }
    }

    return result;
}

async function main() {
    console.log(`===========================================================`);
    console.log(`   VERCEL PRODUCTION LOAD TEST (20 CONCURRENT USERS)`);
    console.log(`   Target: ${DEPLOYED_URL}`);
    console.log(`===========================================================`);

    const testQueries = [
        "What is Hooke's Law?",
        "Explain Newton's third law of motion.",
        "How is the volume of a cylinder calculated?",
        "What is the difference between mass and weight?",
        "Outline the disadvantages of a sole trader.",
        "Define vector quantities vs scalar quantities.",
        "Explain electromagnetic induction.",
        "Solve for density given mass 65g and volume 10cm3."
    ];

    const password = `TestPass123!_${crypto.randomBytes(4).toString("hex")}`;
    const startTime = Date.now();

    const promises = Array.from({ length: CONCURRENT_USERS }).map((_, index) => {
        const email = `loadtest_${index + 1}_${crypto.randomBytes(4).toString("hex")}@gilani-load-test.com`;
        const queryText = testQueries[index % testQueries.length];
        return runSingleUserSession(email, password, index, queryText);
    });

    const results = await Promise.all(promises);
    const overallDuration = Date.now() - startTime;

    // Compile Stats
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const avgFirstToken = successful.length > 0 ? successful.reduce((sum, r) => sum + r.firstTokenMs, 0) / successful.length : 0;
    const avgCompletion = successful.length > 0 ? successful.reduce((sum, r) => sum + r.completionMs, 0) / successful.length : 0;

    console.log(`\n===========================================================`);
    console.log(`                      SIMULATION SUMMARY`);
    console.log(`===========================================================`);
    console.log(`Total Concurrent Users Simulated: ${CONCURRENT_USERS}`);
    console.log(`Successful Requests:              ${successful.length} / ${CONCURRENT_USERS} (${(successful.length / CONCURRENT_USERS * 100).toFixed(1)}%)`);
    console.log(`Failed Requests:                  ${failed.length} / ${CONCURRENT_USERS} (${(failed.length / CONCURRENT_USERS * 100).toFixed(1)}%)`);
    console.log(`Total Simulation Time:            ${(overallDuration / 1000).toFixed(2)}s`);

    if (successful.length > 0) {
        console.log(`\nAverage Latencies for Successful Requests:`);
        console.log(`  - Time to First Token:          ${avgFirstToken.toFixed(1)}ms`);
        console.log(`  - Time to Complete Stream:      ${avgCompletion.toFixed(1)}ms`);
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
