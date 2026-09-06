/**
 * Live latency benchmark against the real Gemini API.
 *
 * The vitest benchmark proves the STRUCTURE of the win with a simulated
 * transport. This one measures the actual magnitude on your network and your
 * account. Run it before shipping so the numbers you quote are real:
 *
 *   GEMINI_API_KEY=... node scripts/benchmark-live.mjs
 *   GEMINI_API_KEY=... node scripts/benchmark-live.mjs --runs 10
 *
 * It costs a handful of cheap flash-model calls per run.
 */
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.error('\n  Set GEMINI_API_KEY to run the live benchmark:');
    console.error('    GEMINI_API_KEY=your_key node scripts/benchmark-live.mjs\n');
    process.exit(0);
}

const runsArg = process.argv.indexOf('--runs');
const RUNS = runsArg > -1 ? parseInt(process.argv[runsArg + 1], 10) : 5;
const MODEL = 'gemini-3.6-flash';

const MENU = [
    'Pepperoni Pizza', 'Margherita Pizza', 'Garlic Bread', 'Coke', 'Sprite',
    'Cheeseburger', 'Double Cheeseburger', 'French Fries', 'Onion Rings',
    'Caesar Salad', 'Chicken Wings', 'Chocolate Brownie'
];
const menuBlock = MENU.map(item => `-${item}`).join('\n');

const UTTERANCES = [
    'can I get two cokes and a pepperoni pizza',
    'actually drop the fries and make it three wings',
    'a cheeseburger with no onions and a sprite please',
    'remove the salad, add a brownie',
    'I want a double cheeseburger and some onion rings'
];

const ORDER_SCHEMA = {
    type: 'OBJECT',
    properties: {
        orderItems: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    action: { type: 'STRING', enum: ['add', 'remove', 'update'] },
                    foodName: { type: 'STRING' },
                    quantity: { type: 'INTEGER' }
                },
                required: ['action', 'foodName', 'quantity']
            }
        }
    },
    required: ['orderItems']
};

const genAi = new GoogleGenAI({ apiKey });

const extractConfig = (minimal) => ({
    temperature: 0,
    maxOutputTokens: 256,
    ...(minimal ? { thinkingConfig: { thinkingLevel: 'MINIMAL' } } : {}),
    systemInstruction:
        `Extract the food items, quantities, and the user's intended action.\n` +
        `The 'action' key MUST be exactly one of these strings: "add", "remove", or "update".\n` +
        `Only map requested items to the provided "Valid Menu Items" list.\n` +
        `If the user asks for items not on the menu, leave the array empty.\n\n` +
        `VALID MENU ITEMS:\n${menuBlock}`,
    responseMimeType: 'application/json',
    responseSchema: ORDER_SCHEMA
});

const chatConfig = (minimal) => ({
    maxOutputTokens: 60,
    ...(minimal ? { thinkingConfig: { thinkingLevel: 'MINIMAL' } } : {}),
    systemInstruction:
        `You are a friendly cashier at a restaurant.\n` +
        `Briefly confirm what the user just said in a natural, conversational tone.\n` +
        `Do not list prices or ask complex questions. Keep it under 2 sentences.\n\n` +
        `VALID MENU ITEMS :\n${menuBlock}`
});

async function timeExtract(utterance, minimal) {
    const start = performance.now();
    await genAi.models.generateContent({
        model: MODEL, contents: utterance, config: extractConfig(minimal)
    });
    return performance.now() - start;
}

/** Returns time-to-first-token and time-to-complete for the spoken reply. */
async function timeChat(utterance, minimal) {
    const start = performance.now();
    const stream = await genAi.models.generateContentStream({
        model: MODEL, contents: utterance, config: chatConfig(minimal)
    });
    let ttft = null;
    for await (const chunk of stream) {
        if (ttft === null && chunk.text) ttft = performance.now() - start;
    }
    return { ttft: ttft ?? performance.now() - start, total: performance.now() - start };
}

async function timeSequential(utterance) {
    const start = performance.now();
    await timeExtract(utterance, true);
    await timeChat(utterance, true);
    return performance.now() - start;
}

async function timeParallel(utterance) {
    const start = performance.now();
    await Promise.all([timeExtract(utterance, true), timeChat(utterance, true)]);
    return performance.now() - start;
}

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const p95 = (xs) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(xs.length * 0.95) - 1)];
const ms = (n) => `${Math.round(n)}`;
const pad = (v, w) => String(v).padStart(w);

async function collect(label, fn) {
    const samples = [];
    for (let i = 0; i < RUNS; i++) {
        const utterance = UTTERANCES[i % UTTERANCES.length];
        try {
            samples.push(await fn(utterance));
        } catch (error) {
            console.error(`  ! ${label} run ${i + 1} failed: ${error.message}`);
        }
    }
    return { label, samples };
}

console.log(`\n  Live latency benchmark - model ${MODEL}, ${RUNS} runs per strategy`);
console.log('  (first call of the process pays DNS + TLS; that is the cost warmUp() removes)\n');

// Warm the connection so the comparison is not skewed by the first handshake.
await genAi.models.generateContent({
    model: MODEL, contents: 'ping',
    config: { maxOutputTokens: 1, thinkingConfig: { thinkingLevel: 'MINIMAL' } }
}).catch(() => {});

const results = [];
results.push(await collect('extract, default thinking', u => timeExtract(u, false)));
results.push(await collect('extract, MINIMAL thinking', u => timeExtract(u, true)));
results.push(await collect('chat TTFT, default thinking', async u => (await timeChat(u, false)).ttft));
results.push(await collect('chat TTFT, MINIMAL thinking', async u => (await timeChat(u, true)).ttft));
results.push(await collect('end-to-end sequential', timeSequential));
results.push(await collect('end-to-end parallel', timeParallel));

console.log('  ' + '-'.repeat(64));
console.log(`  ${'strategy'.padEnd(32)}${pad('median', 10)}${pad('p95', 10)}${pad('n', 6)}`);
console.log('  ' + '-'.repeat(64));
for (const { label, samples } of results) {
    if (samples.length === 0) { console.log(`  ${label.padEnd(32)}${pad('failed', 10)}`); continue; }
    console.log(`  ${label.padEnd(32)}${pad(ms(median(samples)), 10)}${pad(ms(p95(samples)), 10)}${pad(samples.length, 6)}`);
}
console.log('  ' + '-'.repeat(64) + '\n');

const [defExtract, minExtract, defTtft, minTtft, seq, par] = results.map(r => r.samples);
const gain = (before, after) =>
    before.length && after.length
        ? `${Math.round(median(before) - median(after))}ms faster (${(median(before) / median(after)).toFixed(2)}x)`
        : 'n/a';

console.log(`  MINIMAL thinking on extraction : ${gain(defExtract, minExtract)}`);
console.log(`  MINIMAL thinking on first token: ${gain(defTtft, minTtft)}`);
console.log(`  Parallel instead of sequential : ${gain(seq, par)}`);
console.log('\n  The local fast path removes the extraction call entirely for simple');
console.log('  utterances - measured at ~3 microseconds in the vitest benchmark.\n');
