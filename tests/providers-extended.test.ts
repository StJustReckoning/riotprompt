import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../src/execution/anthropic';
import { GeminiProvider } from '../src/execution/gemini';
import { OpenAIProvider } from '../src/execution/openai';
import { Request } from '../src/chat';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    anthropicCreate: vi.fn(),
    openaiCreate: vi.fn(),
    geminiGetModel: vi.fn(),
    geminiGenerateContent: vi.fn(),
    geminiStartChat: vi.fn(),
    geminiSendMessage: vi.fn()
}));

// Mock SDKs
vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn(() => ({
        messages: { create: mocks.anthropicCreate }
    }))
}));

vi.mock('openai', () => ({
    default: vi.fn(() => ({
        chat: { completions: { create: mocks.openaiCreate } }
    }))
}));

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(() => ({
        getGenerativeModel: mocks.geminiGetModel
    }))
}));

describe('Execution Providers Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default Gemini setup
        mocks.geminiGetModel.mockReturnValue({
            generateContent: mocks.geminiGenerateContent,
            startChat: mocks.geminiStartChat
        });
        mocks.geminiStartChat.mockReturnValue({
            sendMessage: mocks.geminiSendMessage
        });
        
        const mockResponse = {
            response: {
                text: () => 'ok',
                usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 }
            }
        };
        mocks.geminiGenerateContent.mockResolvedValue(mockResponse);
        mocks.geminiSendMessage.mockResolvedValue(mockResponse);
    });

    describe('AnthropicProvider', () => {
        it('should throw if API key missing', async () => {
            const provider = new AnthropicProvider();
            const request: Request = { model: 'claude', messages: [], addMessage: () => {} };
            
            const originalKey = process.env.ANTHROPIC_API_KEY;
            delete process.env.ANTHROPIC_API_KEY;
            
            await expect(provider.execute(request, {})).rejects.toThrow('API key is required');
            
            process.env.ANTHROPIC_API_KEY = originalKey;
        });

        it('should handle system messages correctly', async () => {
            mocks.anthropicCreate.mockResolvedValue({
                content: [{ type: 'text', text: 'ok' }],
                model: 'claude',
                usage: { input_tokens: 1, output_tokens: 1 }
            });

            const provider = new AnthropicProvider();
            const request: Request = {
                model: 'claude',
                messages: [
                    { role: 'system', content: 'sys' },
                    { role: 'user', content: 'user' }
                ],
                addMessage: () => {}
            };

            await provider.execute(request, { apiKey: 'key' });
            
            expect(mocks.anthropicCreate).toHaveBeenCalledWith(expect.objectContaining({
                system: 'sys',
                messages: [{ role: 'user', content: 'user' }]
            }));
        });
        it('should handle non-string content (e.g. array)', async () => {
            mocks.anthropicCreate.mockResolvedValue({ 
                content: [{ type: 'text', text: 'response' }], 
                model: 'claude', 
                usage: {} 
            });
            const provider = new AnthropicProvider();
            await provider.execute({
                model: 'claude',
                messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
                addMessage: () => {}
            }, { apiKey: 'key' });
            
            expect(mocks.anthropicCreate).toHaveBeenCalledWith(expect.objectContaining({
                messages: [{ role: 'user', content: '[{"type":"text","text":"hi"}]' }]
            }));
        });
    });

    describe('OpenAIProvider', () => {
        it('should throw if API key missing', async () => {
            const provider = new OpenAIProvider();
            const request: Request = { model: 'gpt', messages: [], addMessage: () => {} };
            
            const originalKey = process.env.OPENAI_API_KEY;
            delete process.env.OPENAI_API_KEY;
            
            await expect(provider.execute(request, {})).rejects.toThrow('API key is required');
            
            process.env.OPENAI_API_KEY = originalKey;
        });

        it('should map developer role for o1 models', async () => {
            mocks.openaiCreate.mockResolvedValue({
                choices: [{ message: { content: 'ok' } }],
                model: 'o1',
                usage: {}
            });

            const provider = new OpenAIProvider();
            const request: Request = {
                model: 'o1',
                messages: [{ role: 'developer', content: 'dev' }],
                addMessage: () => {}
            };

            await provider.execute(request, { apiKey: 'key' });
            
            expect(mocks.openaiCreate).toHaveBeenCalledWith(expect.objectContaining({
                messages: [{ role: 'system', content: 'dev', name: undefined }]
            }));
        });
        it('should handle non-string content and missing usage', async () => {
            mocks.openaiCreate.mockResolvedValue({
                choices: [{ message: { content: 'ok' } }],
                model: 'gpt-4'
                // no usage
            });

            const provider = new OpenAIProvider();
            const result = await provider.execute({
                model: 'gpt-4',
                messages: [{ role: 'user', content: ['part1', 'part2'] }],
                addMessage: () => {}
            }, { apiKey: 'key' });

            expect(result.usage).toBeUndefined();
            expect(mocks.openaiCreate).toHaveBeenCalledWith(expect.objectContaining({
                messages: [{ role: 'user', content: '["part1","part2"]', name: undefined }]
            }));
        });
    });

    describe('GeminiProvider', () => {
        it('should throw if API key missing', async () => {
            const provider = new GeminiProvider();
            const request: Request = { model: 'gemini', messages: [], addMessage: () => {} };
            
            const originalKey = process.env.GEMINI_API_KEY;
            delete process.env.GEMINI_API_KEY;
            
            await expect(provider.execute(request, {})).rejects.toThrow('API key is required');
            
            process.env.GEMINI_API_KEY = originalKey;
        });

        it('should use generateContent for single user message', async () => {
            const provider = new GeminiProvider();
            const request: Request = {
                model: 'gemini',
                messages: [{ role: 'user', content: 'Hi' }],
                addMessage: () => {}
            };

            await provider.execute(request, { apiKey: 'key' });

            expect(mocks.geminiGenerateContent).toHaveBeenCalledWith('Hi');
            expect(mocks.geminiStartChat).not.toHaveBeenCalled();
        });

        it('should use startChat for multi-turn history', async () => {
            const provider = new GeminiProvider();
            const request: Request = {
                model: 'gemini',
                messages: [
                    { role: 'user', content: '1' },
                    { role: 'assistant', content: '2' },
                    { role: 'user', content: '3' }
                ],
                addMessage: () => {}
            };

            await provider.execute(request, { apiKey: 'key' });

            expect(mocks.geminiStartChat).toHaveBeenCalledWith({
                history: [
                    { role: 'user', parts: [{ text: '1' }] },
                    { role: 'model', parts: [{ text: '2' }] }
                ]
            });
            expect(mocks.geminiSendMessage).toHaveBeenCalledWith('3');
        });

        it('should extract system instruction', async () => {
            const provider = new GeminiProvider();
            const request: Request = {
                model: 'gemini',
                messages: [
                    { role: 'system', content: 'Be helpful' },
                    { role: 'user', content: 'Hi' }
                ],
                addMessage: () => {}
            };

            await provider.execute(request, { apiKey: 'key' });

            expect(mocks.geminiGetModel).toHaveBeenCalledWith(expect.objectContaining({
                systemInstruction: 'Be helpful'
            }));
        });
        it('should handle non-string content and missing usage', async () => {
            mocks.geminiGenerateContent.mockResolvedValue({
                response: { text: () => 'ok' } // no usageMetadata
            });

            const provider = new GeminiProvider();
            const result = await provider.execute({
                model: 'gemini',
                messages: [{ role: 'user', content: { text: 'hi' } }],
                addMessage: () => {}
            }, { apiKey: 'key' });

            expect(result.usage).toBeUndefined();
            expect(mocks.geminiGenerateContent).toHaveBeenCalledWith('{"text":"hi"}');
        });
    });
});
