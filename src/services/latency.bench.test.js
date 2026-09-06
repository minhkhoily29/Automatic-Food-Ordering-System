import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import MenuIndex from './MenuIndex';
import parseOrderLocally from './FastOrderParser';

vi.mock('@google/genai', () => ({ GoogleGenAI: vi.fn() }));

/**
 * Simulated transport cost model.
 *
 * These are NOT measurements of Google's servers - they are a model, so that
 * the benchmark isolates what OUR code controls (call ordering, thinking level,
 * connection reuse, skipping the call entirely). Swap in numbers from your own
 * production traces to re-scale the absolute figures; the relative structure of
 * the result is what this benchmark establishes.
 */
const SIM = {
    connectMs: 120,     // DNS + TLS, paid once per cold client
    serverMs: 220,      // request handling before the first token
    thinkingMs: 650,    // extra pre-token latency when the model reasons first
    perTokenMs: 12,     // inter-token gap while streaming
    replyTokens: 22,    // tokens in a short spoken confirmation
    jsonTokens: 40      // tokens in the extraction payload
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MENU = ["Pepperoni Pizza", "Garlic Bread", "Coke", "Cheeseburger", "French Fries"];

/** Builds a mocked SDK whose latency responds to the config we pass it. */
function makeMockSdk() {
    const state = { connected: false };

    const preTokenCost = (config) => {
        let cost = SIM.serverMs;
        if (!state.connected) {
            cost += SIM.connectMs;
            state.connected = true;
        }
        const level = config?.thinkingConfig?.thinkingLevel;
        if (level !== 'MINIMAL') cost += SIM.thinkingMs;
        return cost;
    };

    const generateContent = vi.fn(async ({ config }) => {
        await sleep(preTokenCost(config) + SIM.jsonTokens * SIM.perTokenMs);
        return {
            text: JSON.stringify({
                orderItems: [{ action: 'add', foodName: 'Coke', quantity: 2 }]
            })
        };
    });

    const generateContentStream = vi.fn(async ({ config }) => {
        await sleep(preTokenCost(config));
        return (async function* () {
            for (let i = 0; i < SIM.replyTokens; i++) {
                await sleep(SIM.perTokenMs);
                yield { text: 'word ' };
            }
        })();
    });

    // Must be a function expression - the service calls it with `new`.
    GoogleGenAI.mockImplementation(function () {
        return { models: { generateContent, generateContentStream } };
    });

    return { state, generateContent, generateContentStream };
}

/**
 * Replica of the service as it stood before this change: two sequential calls,
 * default thinking, prompt block rebuilt per call.
 */
class LegacyAIService {
    #genAi;
    constructor() { this.#genAi = new GoogleGenAI({ apiKey: 'k' }); }

    async streamConversation(userInput, validMenuItems, onChunkReceived) {
        const menuString = validMenuItems.map(item => `-${item}`).join('\n');
        const output = await this.#genAi.models.generateContentStream({
            model: 'gemini-3.6-flash',
            contents: userInput,
            config: { maxOutputTokens: 60, systemInstruction: menuString }
        });
        let complete = '';
        for await (const chunk of output) {
            complete += chunk.text;
            if (onChunkReceived && chunk.text) onChunkReceived(chunk.text);
        }
        return complete;
    }

    async extractOrder(userInput, validMenuItems) {
        const menuString = validMenuItems.map(item => `-${item}`).join('\n');
        const output = await this.#genAi.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: userInput,
            config: { temperature: 0, systemInstruction: menuString }
        });
        try { return JSON.parse(output.text).orderItems; } catch { return []; }
    }

    /** The original call shape: extract, then speak. */
    async processUtterance(userInput, menu, handlers = {}) {
        const orderItems = await this.extractOrder(userInput, menu);
        if (handlers.onOrderExtracted) handlers.onOrderExtracted(orderItems);
        const reply = await this.streamConversation(userInput, menu, handlers.onChunkReceived);
        return { reply, orderItems, usedFastPath: false };
    }
}

/** Runs one utterance and records the timings a customer actually perceives. */
async function measure(service, utterance, menu) {
    const start = performance.now();
    let firstToken = null;
    let cartUpdated = null;

    await service.processUtterance(utterance, menu, {
        onChunkReceived: () => { if (firstToken === null) firstToken = performance.now() - start; },
        onOrderExtracted: () => { if (cartUpdated === null) cartUpdated = performance.now() - start; }
    });

    return {
        firstToken: Math.round(firstToken),
        cartUpdated: Math.round(cartUpdated),
        total: Math.round(performance.now() - start)
    };
}

const pad = (value, width) => String(value).padStart(width);

describe('AI response latency', () => {
    let AIService;

    beforeEach(async () => {
        import.meta.env.VITE_GEMINI_API_KEY = 'bench_key';
        vi.clearAllMocks();
        // Imported after the mock is installed so each run gets a cold client.
        AIService = (await import('./AIService')).default;
    });

    it('reports end-to-end latency for each strategy', async () => {
        const rows = [];

        // 1. Baseline: the original sequential, default-thinking implementation.
        makeMockSdk();
        rows.push(['Baseline (sequential, thinking on)',
            await measure(new LegacyAIService(), 'two cokes', MENU)]);

        // 2. Optimized, but on an utterance the local parser refuses
        //    (a modification) - so it still pays for the model, in parallel.
        makeMockSdk();
        rows.push(['Optimized, model path (parallel, MINIMAL)',
            await measure(new AIService(), 'a cheeseburger without onions', MENU)]);

        // 3. Optimized on a simple utterance - extraction never hits the network.
        makeMockSdk();
        rows.push(['Optimized, fast path (cart is local)',
            await measure(new AIService(), 'two cokes', MENU)]);

        // 4. Same, with the connection already warmed at app start.
        const warm = makeMockSdk();
        const warmService = new AIService();
        await warmService.warmUp(MENU);
        warm.generateContent.mockClear();
        rows.push(['Optimized, fast path + warmed connection',
            await measure(warmService, 'two cokes', MENU)]);

        const baseline = rows[0][1];
        const lines = [
            '',
            '  AI response latency (simulated transport, ms)',
            '  ' + '-'.repeat(76),
            `  ${'strategy'.padEnd(42)}${pad('cart', 7)}${pad('1st tok', 9)}${pad('total', 8)}${pad('vs base', 10)}`,
            '  ' + '-'.repeat(76),
        ];
        for (const [label, t] of rows) {
            const speedup = (baseline.total / t.total).toFixed(2) + 'x';
            lines.push(`  ${label.padEnd(42)}${pad(t.cartUpdated, 7)}${pad(t.firstToken, 9)}${pad(t.total, 8)}${pad(speedup, 10)}`);
        }
        lines.push('  ' + '-'.repeat(76));
        lines.push('  cart    = when the order appears on screen');
        lines.push('  1st tok = when the customer hears the first word');
        lines.push('');
        console.log(lines.join('\n'));

        // Each strategy must beat the one before it on total latency.
        for (let i = 1; i < rows.length; i++) {
            expect(rows[i][1].total).toBeLessThan(rows[i - 1][1].total);
        }
        // The fast path puts the order on screen essentially instantly.
        expect(rows[2][1].cartUpdated).toBeLessThan(20);
    }, 30000);

    it('measures the local parser itself', () => {
        const index = new MenuIndex(MENU);
        const utterances = [
            'two cokes',
            "I'll have a pepperoni pizza please",
            'drop the bread and add 2 pizza',
            '4 cheeseburgers and three fries'
        ];

        const iterations = 20000;
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            parseOrderLocally(utterances[i % utterances.length], index);
        }
        const perCall = (performance.now() - start) / iterations;

        console.log(`\n  Local parse cost: ${(perCall * 1000).toFixed(1)} microseconds/utterance ` +
            `(${iterations.toLocaleString()} iterations)\n`);

        // Anything in this range is free relative to a network round trip.
        expect(perCall).toBeLessThan(1);
    });

    it('reuses the prompt block instead of rebuilding it per call', async () => {
        makeMockSdk();
        const service = new AIService();
        await service.extractOrder('two cokes', MENU);
        await service.extractOrder('three fries', MENU);

        const calls = GoogleGenAI.mock.results[0].value.models.generateContent.mock.calls;
        // Byte-identical system instructions are what implicit caching keys on.
        expect(calls[0][0].config.systemInstruction)
            .toBe(calls[1][0].config.systemInstruction);
    });

    it('sends MINIMAL thinking on both latency-critical calls', async () => {
        makeMockSdk();
        const service = new AIService();
        await service.processUtterance('a cheeseburger without onions', MENU, {});

        const models = GoogleGenAI.mock.results[0].value.models;
        expect(models.generateContent.mock.calls[0][0].config.thinkingConfig)
            .toEqual({ thinkingLevel: 'MINIMAL' });
        expect(models.generateContentStream.mock.calls[0][0].config.thinkingConfig)
            .toEqual({ thinkingLevel: 'MINIMAL' });
    });
});
