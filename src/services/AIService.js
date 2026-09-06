import { GoogleGenAI } from "@google/genai";
import MenuIndex from "./MenuIndex";
import parseOrderLocally from "./FastOrderParser";

const MODEL = 'gemini-3.6-flash';

// The extraction call decides what goes in the cart, so it must not hang: a
// slow response is worse than a retryable failure at the counter.
const EXTRACT_TIMEOUT_MS = 6000;
const CHAT_TIMEOUT_MS = 8000;

// Kept short and stable so the prompt prefix is byte-identical between
// requests, which is what implicit context caching keys on.
const CHAT_INSTRUCTION_HEAD = `You are a friendly cashier at a restaurant.
Briefly confirm what the user just said in a natural, conversational tone.
Do not list prices or ask complex questions. Keep it under 2 sentences.

VALID MENU ITEMS :
`;

const EXTRACT_INSTRUCTION_HEAD = `Extract the food items, quantities, and the user's intended action.
The 'action' key MUST be exactly one of these strings: "add", "remove", or "update".
Only map requested items to the provided "Valid Menu Items" list.
If the user asks for items not on the menu, leave the array empty.

VALID MENU ITEMS:
`;

const ORDER_SCHEMA = {
    type: "OBJECT",
    properties: {
        orderItems: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    action: { type: "STRING", enum: ["add", "remove", "update"] },
                    foodName: { type: "STRING" },
                    quantity: { type: "INTEGER" }
                },
                required: ["action", "foodName", "quantity"]
            }
        }
    },
    required: ["orderItems"]
};

export default class AIService {
    #genAi;
    #menuIndexCache = new Map();

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if(!apiKey) {
            throw new Error("Missing VITE_GEMINI_API_KEY in .env file");
        }

        this.#genAi = new GoogleGenAI({apiKey});
    }

    /**
     * Build (or reuse) the precomputed index for a menu.
     *
     * The menu changes rarely but every utterance needs it, so rebuilding the
     * prompt block on the critical path is wasted work.
     *
     * @param {Array<string>|MenuIndex} validMenuItems
     * @returns {MenuIndex}
     */
    #indexFor(validMenuItems) {
        if (validMenuItems instanceof MenuIndex) return validMenuItems;

        // Menu names never contain a newline, so this is a safe cache key.
        const key = validMenuItems.join('\n');
        let index = this.#menuIndexCache.get(key);
        if (!index) {
            index = new MenuIndex(validMenuItems);
            this.#menuIndexCache.set(key, index);
        }
        return index;
    }

    /**
     * Open the TLS connection and warm the model before the first real order.
     *
     * Called on app load (or when the mic is focused) so the first customer
     * does not pay for DNS, the TLS handshake and a cold model.
     *
     * @param {Array<string>} validMenuItems
     * @returns {Promise<void>}
     */
    async warmUp(validMenuItems = []) {
        this.#indexFor(validMenuItems);
        try {
            await this.#genAi.models.generateContent({
                model: MODEL,
                contents: 'ping',
                config: {
                    maxOutputTokens: 1,
                    thinkingConfig: { thinkingLevel: 'MINIMAL' },
                    httpOptions: { timeout: 3000 }
                }
            });
        } catch {
            // A failed warm-up must never block the UI.
        }
    }

    /**
     *
     * @param {string} userInput
     * @param {array} validMenuItems
     * @param {function} onChunkReceived
     * @param {AbortSignal} [abortSignal]
     * @returns Promise<string>
     */
    async streamConversation(userInput, validMenuItems, onChunkReceived, abortSignal) {
        const menuString = this.#indexFor(validMenuItems).promptBlock;
        const output = await this.#genAi.models.generateContentStream({
            model: MODEL,
            contents: userInput,
            config: {
                maxOutputTokens: 60,
                // The confirmation line needs no reasoning; thinking tokens here
                // are pure time-to-first-token cost.
                thinkingConfig: { thinkingLevel: 'MINIMAL' },
                abortSignal,
                httpOptions: { timeout: CHAT_TIMEOUT_MS },
                systemInstruction: CHAT_INSTRUCTION_HEAD + menuString
            }
        });

        let completeResponse = '';
        for await (const chunk of output) {
            const text = chunk.text;
            completeResponse += text;
            if(onChunkReceived && text) {
                onChunkReceived(text);
            }
        }
        return completeResponse;
    }

    /**
     *
     * @param {string} userInput
     * @param {array} validMenuItems
     * @param {AbortSignal} [abortSignal]
     * @returns Promise<Array>
     */
    async extractOrder(userInput, validMenuItems, abortSignal) {
        const menuString = this.#indexFor(validMenuItems).promptBlock;
        const output = await this.#genAi.models.generateContent({
            model: MODEL,
            contents: userInput,
            config: {
                temperature: 0,
                thinkingConfig: { thinkingLevel: 'MINIMAL' },
                maxOutputTokens: 256,
                abortSignal,
                httpOptions: { timeout: EXTRACT_TIMEOUT_MS },
                systemInstruction: EXTRACT_INSTRUCTION_HEAD + menuString,
                responseMimeType: "application/json",
                responseSchema: ORDER_SCHEMA
            }
        });

        try {
            return JSON.parse(output.text).orderItems;
        } catch(error) {
            console.error("Failed to parse JSON", error);
            return [];
        }
    }

    /**
     * Resolve an utterance without touching the network when possible.
     *
     * @param {string} userInput
     * @param {Array<string>} validMenuItems
     * @returns {Array|null} null when the model is needed
     */
    tryLocalExtract(userInput, validMenuItems) {
        return parseOrderLocally(userInput, this.#indexFor(validMenuItems));
    }

    /**
     * Handle one customer utterance.
     *
     * The spoken confirmation and the cart update are independent, so they run
     * concurrently instead of one after the other. When the local parser is
     * confident the extraction round trip is skipped entirely and the cart
     * updates before the first token of speech arrives.
     *
     * @param {string} userInput
     * @param {Array<string>} validMenuItems
     * @param {object} [handlers]
     * @param {function} [handlers.onChunkReceived]
     * @param {function} [handlers.onOrderExtracted] - called as soon as items resolve
     * @param {AbortSignal} [handlers.abortSignal]
     * @returns {Promise<{reply: string, orderItems: Array, usedFastPath: boolean}>}
     */
    async processUtterance(userInput, validMenuItems, handlers = {}) {
        const { onChunkReceived, onOrderExtracted, abortSignal } = handlers;
        const menuIndex = this.#indexFor(validMenuItems);

        const local = parseOrderLocally(userInput, menuIndex);
        const usedFastPath = local !== null;

        if (usedFastPath && onOrderExtracted) {
            onOrderExtracted(local);
        }

        const orderPromise = usedFastPath
            ? Promise.resolve(local)
            : this.extractOrder(userInput, menuIndex, abortSignal).then(items => {
                if (onOrderExtracted) onOrderExtracted(items);
                return items;
            });

        const replyPromise = this.streamConversation(
            userInput, menuIndex, onChunkReceived, abortSignal
        );

        const [orderItems, reply] = await Promise.all([orderPromise, replyPromise]);
        return { reply, orderItems, usedFastPath };
    }
}
