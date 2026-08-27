import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AIService from './AIService.ts'; // Adjust the path if necessary

// 1. Tell Vitest to mock the entire Google SDK module
vi.mock('@google/generative-ai');

describe('AIService Intent Extraction', () => {
    let aiService: AIService;
    let mockGenerateContent: any;

    beforeEach(() => {
        // Provide a fake API key for the constructor to pass
        vi.stubEnv('VITE_GEMINI_API_KEY', 'fake-test-key');

        // Create a fake function to act as Google's server
        mockGenerateContent = vi.fn();

        // Tell our mocked SDK to return our fake function
        vi.mocked(GoogleGenerativeAI).mockImplementation(() => {
            return {
                getGenerativeModel: vi.fn().mockReturnValue({
                    generateContent: mockGenerateContent,
                }),
            } as any; // Cast as 'any' to bypass strict TS type checking for the mock
        });

        // Initialize a fresh service before every test
        aiService = new AIService();
    });

    afterEach(() => {
        // Clean up mocks after each test
        vi.restoreAllMocks();
    });

    it('should successfully parse perfect JSON from the AI', async () => {
        // Arrange: Simulate the AI returning perfectly clean JSON
        const fakeAIResponse = `[{"action": "add", "foodName": "Burger", "quantity": 2}]`;
        mockGenerateContent.mockResolvedValue({
            response: { text: () => fakeAIResponse },
        });

        // Act: Run the method
        const validMenu = ['Burger', 'Fries'];
        const result = await aiService.extractOrder('Get me two beef burgers', validMenu);

        // Assert: Ensure it parsed correctly
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ action: 'add', foodName: 'Burger', quantity: 2 });
    });
});