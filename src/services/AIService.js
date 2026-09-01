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
     * @returns {Promise<Array>}
     */
    async extractOrder(userInput, validMenuItems) {
        const menuString = validMenuItems.map(item => `-${item}`).join('\n');
        const outputStream = await this.#genAi.models.generateContentStream({
            model: 'gemini-3.6-flash',
            contents: userInput,
            config: {
                systemInstruction: `
                    You are a backend intent extraction engine for a food ordering system.
                    Extract the food items, quantities, and the user's intended action.
                    Also generate a friendly, natural confirmation message to the customer.
                
                    CRITICAL RULES:
                    1. The 'action' key MUST be exactly one of these strings: "add", "remove", or "update".
                    2. Only map requested items to the provided "Valid Menu Items" list.
                    3. If the user asks for items not on the menu, asks a general question, or types nonsense:
                       - Leave the 'orderItems' array completely empty.
                       - Use the 'confirmationMessage' to politely reply, inform them the item is unavailable, or answer their question naturally.

                    VALID MENU ITEMS:
                    ${menuString}
                `,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        confirmationMessage: {
                            type: "STRING",
                            description: "A friendly reply in response to what the customer just said"
                        },
                        orderItems: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    action: {
                                        type: "STRING",
                                        enum: ["add", "remove", "update"]
                                    },
                                    foodName: {type: "STRING"},
                                    quantity: { type: "INTEGER"}
                                },
                                required: ["action", "foodName", "quantity"]
                                }
                            }
                        },
                    required: ["confirmationMessage", "orderItems"]
                }
            }
        });
        if(response.text) {
            return JSON.parse(response.text);
        }

        return { 
            confirmationMessage: "I didn't quite catch that. Could you repeat your order?", 
            orderItems: [] 
        };
    }
}