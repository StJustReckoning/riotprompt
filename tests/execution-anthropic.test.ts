import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../src/execution/anthropic';
import { Request } from '../src/chat';

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
    return {
        default: vi.fn(function(this: any) {
            return {
                messages: {
                    create: mockCreate
                }
            };
        })
    };
});

describe('AnthropicProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue({
            content: [{ type: 'text', text: 'Claude response' }],
            model: 'claude-3-opus-20240229',
            usage: { input_tokens: 15, output_tokens: 25 }
        });
    });

    it('should call Anthropic API with correct parameters', async () => {
        const provider = new AnthropicProvider();
        const request: Request = {
            model: 'claude-3-opus',
            messages: [
                { role: 'system', content: 'System prompt' },
                { role: 'user', content: 'User prompt' }
            ],
            addMessage: () => {}
        };

        const result = await provider.execute(request, { apiKey: 'test-key' });

        expect(mockCreate).toHaveBeenCalledWith({
            model: 'claude-3-opus',
            system: 'System prompt',
            messages: [
                { role: 'user', content: 'User prompt' }
            ],
            max_tokens: 4096,
            temperature: undefined
        });

        expect(result.content).toBe('Claude response');
        expect(result.usage?.inputTokens).toBe(15);
        expect(result.usage?.outputTokens).toBe(25);
    });
});

