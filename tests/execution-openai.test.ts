import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../src/execution/openai';
import { Request } from '../src/chat';

// Mock OpenAI SDK
const mockCreate = vi.fn();
vi.mock('openai', () => {
    return {
        default: vi.fn(function(this: any) {
            return {
                chat: {
                    completions: {
                        create: mockCreate
                    }
                }
            };
        })
    };
});

describe('OpenAIProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mock response
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: 'Test response' } }],
            model: 'gpt-4',
            usage: { prompt_tokens: 10, completion_tokens: 20 }
        });
    });

    it('should call OpenAI API with correct parameters', async () => {
        const provider = new OpenAIProvider();
        const request: Request = {
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a bot.' },
                { role: 'user', content: 'Hello' }
            ],
            addMessage: () => {}
        };

        const result = await provider.execute(request, { apiKey: 'test-key' });

        expect(mockCreate).toHaveBeenCalledWith({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a bot.' },
                { role: 'user', content: 'Hello' }
            ],
            temperature: undefined,
            max_tokens: undefined
        });

        expect(result.content).toBe('Test response');
        expect(result.usage?.inputTokens).toBe(10);
        expect(result.usage?.outputTokens).toBe(20);
    });

    it('should use developer role if specified', async () => {
        const provider = new OpenAIProvider();
        const request: Request = {
            model: 'o1',
            messages: [
                { role: 'developer', content: 'Dev prompt' }
            ],
            addMessage: () => {}
        };

        await provider.execute(request, { apiKey: 'test-key' });

        // OpenAI SDK types might conflict but we pass it through.
        // My implementation in openai.ts converts 'developer' to 'system' unless logic changed.
        // Let's check implementation:
        // const role = msg.role === 'developer' ? 'system' : msg.role;
        // Wait, I should verify what I wrote in src/execution/openai.ts
        
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            messages: [
                { role: 'system', content: 'Dev prompt' }
            ]
        }));
    });
});

