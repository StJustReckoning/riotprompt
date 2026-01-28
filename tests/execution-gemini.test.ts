import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../src/execution/gemini';
import { Request } from '../src/chat';

// Mock Google Generative AI SDK
const mockGenerateContent = vi.fn();
const mockStartChat = vi.fn();
const mockSendMessage = vi.fn();
const mockGetGenerativeModel = vi.fn();

vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: vi.fn(function(this: any) {
            return {
                getGenerativeModel: mockGetGenerativeModel
            };
        })
    };
});

describe('GeminiProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        mockGetGenerativeModel.mockReturnValue({
            generateContent: mockGenerateContent,
            startChat: mockStartChat
        });

        const mockResponse = {
            response: {
                text: () => 'Gemini response',
                usageMetadata: {
                    promptTokenCount: 12,
                    candidatesTokenCount: 34
                }
            }
        };

        mockGenerateContent.mockResolvedValue(mockResponse);
        
        mockStartChat.mockReturnValue({
            sendMessage: mockSendMessage
        });
        
        mockSendMessage.mockResolvedValue(mockResponse);
    });

    it('should call Gemini API (generateContent) for single turn', async () => {
        const provider = new GeminiProvider();
        const request: Request = {
            model: 'gemini-1.5-pro',
            messages: [
                { role: 'user', content: 'Hello' }
            ],
            addMessage: () => {}
        };

        const result = await provider.execute(request, { apiKey: 'test-key' });

        expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gemini-1.5-pro',
            systemInstruction: undefined
        }));

        expect(mockGenerateContent).toHaveBeenCalledWith('Hello');

        expect(result.content).toBe('Gemini response');
        expect(result.usage?.inputTokens).toBe(12);
    });

    it('should handle system prompt', async () => {
        const provider = new GeminiProvider();
        const request: Request = {
            model: 'gemini-1.5-pro',
            messages: [
                { role: 'system', content: 'Be cool.' },
                { role: 'user', content: 'Hi' }
            ],
            addMessage: () => {}
        };

        await provider.execute(request, { apiKey: 'test-key' });

        expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
            systemInstruction: 'Be cool.'
        }));
    });

    it('should use startChat for multi-turn history', async () => {
        const provider = new GeminiProvider();
        const request: Request = {
            model: 'gemini-1.5-pro',
            messages: [
                { role: 'user', content: 'Turn 1' },
                { role: 'assistant', content: 'Response 1' },
                { role: 'user', content: 'Turn 2' }
            ],
            addMessage: () => {}
        };

        await provider.execute(request, { apiKey: 'test-key' });

        // History should contain first two messages (mapped roles)
        // role 'assistant' -> 'model'
        expect(mockStartChat).toHaveBeenCalledWith({
            history: [
                { role: 'user', parts: [{ text: 'Turn 1' }] },
                { role: 'model', parts: [{ text: 'Response 1' }] }
            ]
        });

        // Last message sent via sendMessage
        expect(mockSendMessage).toHaveBeenCalledWith('Turn 2');
    });
});

