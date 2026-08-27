import { GoogleGenerativeAI } from "@google/generative-ai";

export default class AIService {
    #genAi;
    #model;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if(!apiKey) {
            throw new Error("Missing VITE_GEMINI_API_KEY in .env file");
        }

        this.#genAi = new GoogleGenerativeAI(apiKey);
        
        this.#model = this.#genAi.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: `
                You are a backend intent extraction engine for a food ordering system.
                Extract the food items, quantities, and the user's intended action.
                
                CRITICAL RULES:
                1. You must respond ONLY with a raw, valid JSON array of objects. Do NOT wrap the response in markdown blocks like \`\`\`json.
                2. Each object must have exactly three keys: 'action', 'foodName', and 'quantity'.
                3. The 'action' key MUST be exactly one of these strings: "add", "remove", or "update".
                4. Only map requested items to the provided "Valid Menu Items" list.
            `
        });
    }

    async extractOrder(userInput: string, validMenuItems: string[]) {
        try {
            const prompt = `
                Valid Menu Items: ${validMenuItems.join(", ")}
                User Request: "${userInput}"
            `;
            const result = await this.#model.generateContent(prompt);
            const response = result.response.text();
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("Failed to extract intents from AI: ", error);
            return [];
        }
    }
}