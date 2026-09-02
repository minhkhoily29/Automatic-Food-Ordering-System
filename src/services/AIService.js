import { GoogleGenAI } from "@google/genai";

export default class AIService {
    #genAi;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if(!apiKey) {
            throw new Error("Missing VITE_GEMINI_API_KEY in .env file");
        }

        this.#genAi = new GoogleGenAI({apiKey});
    }

    /**
     * 
     * @param {string} userInput 
     * @param {array} validMenuItems 
     * @param {function} onChunkReceived 
     * @returns Promise<string>
     */
    async streamConversation(userInput, validMenuItems, onChunkReceived) {
        const menuString = validMenuItems.map(item => `-${item}`).join('\n');
        const output = await this.#genAi.generateContentStream({
            model: 'gemini-3.6-flash',
            contents: userInput,
            config: {
                systemInstruction: `
                    You are a friendly cashier at a restaurant. 
                    Briefly confirm what the user just said in a natural, conversational tone.
                    Do not list prices or ask complex questions. Keep it under 2 sentences.

                    VALID MENU ITEMS :
                    ${menuString}$
                `
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
     * @returns Promise<Array>
     */
    async extractOrder(userInput, validMenuItems) {
        const menuString = validMenuItems.map(item => `-${item}`).join('\n');
        const output = await this.#genAi.generateContent({
            model: 'gemini-3.6-flash',
            contents: userInput,
            config: {
                systemInstruction: `
                    Extract the food items, quantities, and the user's intended action.
                    The 'action' key MUST be exactly one of these strings: "add", "remove", or "update".
                    Only map requested items to the provided "Valid Menu Items" list.
                    If the user asks for items not on the menu, leave the array empty.
                    
                    VALID MENU ITEMS:
                    ${menuString}
                `,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        orderItems: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    action: { type: "STRING", enum: ["add", "remove", "update"]},
                                    foodName: {type: "STRING"},
                                    quantity: {type: "INTEGER"}
                                },
                                required: ["action", "foodName", "quantity"]
                            }
                        }
                    },
                    required: ["orderItems"]
                }
            }
        });

        try {
            return JSON.parse(response.text);
        } catch(error) {
            console.error("Failed to parse JSON", error);
            return { orderItems: []};
        }
    } 
}