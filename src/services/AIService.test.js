import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AIService from './AIService';
import { GoogleGenAI } from '@google/genai';

// 1. Mock the GoogleGenAI SDK so we don't make real network requests
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn()
    };
});

describe('AIService', () => {
    let originalEnv;
    let mockGenerateContent;

    beforeEach(() => {
        // Save the original env variable so we don't mess up other tests
        originalEnv = import.meta.env.VITE_GEMINI_API_KEY;
        import.meta.env.VITE_GEMINI_API_KEY = 'fake_test_api_key';

        // Setup the mock function for generateContent
        mockGenerateContent = vi.fn();
        
        // Tell the mocked GoogleGenAI class to return our mocked models object
        GoogleGenAI.mockImplementation(function() {
            return {
                models: {
                    generateContent: mockGenerateContent
                }
            }
        })
    });

    afterEach(() => {
        // Restore the original environment and clear mocks after every test
        import.meta.env.VITE_GEMINI_API_KEY = originalEnv;
        vi.clearAllMocks();
    });

    it('should initialize successfully when API key is present', () => {
        const service = new AIService();
        
        // Check that the GoogleGenAI constructor was called with the fake key
        expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'fake_test_api_key' });
    });

    it('should successfully extract an order and return parsed JSON', async () => {
        // 1. Arrange: Tell our mock what to return when called
        const mockApiResponse = [
            { action: "add", foodName: "Pepperoni Pizza", quantity: 2 },
            { action: "remove", foodName: "Garlic Bread", quantity: 1 }
        ];
        
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({ orderItems: mockApiResponse })
        });

        const service = new AIService();
        const validMenu = ["Pepperoni Pizza", "Garlic Bread", "Coke"];
        
        // 2. Act: Call our method
        const result = await service.extractOrder("Drop the bread please, and add 2 pizza, thank you", validMenu);

        // 3. Assert: Verify it sent the right data and parsed the response correctly
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        
        // Check that the menu was properly injected into the instructions
        const callArguments = mockGenerateContent.mock.calls[0][0];
        expect(callArguments.config.systemInstruction).toContain("-Pepperoni Pizza");
        expect(callArguments.config.systemInstruction).toContain("-Garlic Bread");

        // Check the final output
        expect(result).toEqual(mockApiResponse);
    });

    it('should return an empty array if the API returns empty text', async () => {
        mockGenerateContent.mockResolvedValue({
            text: "" // Simulate an empty response
        });

        const service = new AIService();
        const result = await service.extractOrder("Just checking", ["Pizza"]);

        expect(result).toEqual([]);
    });
});