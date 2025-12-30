import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionManager, execute } from '../src/execution/index';
import { OpenAIProvider } from '../src/execution/openai';
import { AnthropicProvider } from '../src/execution/anthropic';
import { GeminiProvider } from '../src/execution/gemini';
import { Request } from '../src/chat';

// Mock providers
vi.mock('../src/execution/openai');
vi.mock('../src/execution/anthropic');
vi.mock('../src/execution/gemini');

describe('Execution Manager', () => {
    let manager: ExecutionManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new ExecutionManager();
    });

    it('should select OpenAI provider for gpt-* models', () => {
        const provider = manager.getProvider('gpt-4');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should select OpenAI provider for o1-* models', () => {
        const provider = manager.getProvider('o1-preview');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should select Anthropic provider for claude-* models', () => {
        const provider = manager.getProvider('claude-3-opus');
        expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should select Gemini provider for gemini-* models', () => {
        const provider = manager.getProvider('gemini-1.5-pro');
        expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it('should default to OpenAI provider for unknown models', () => {
        const provider = manager.getProvider('unknown-model');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should execute request using selected provider', async () => {
        const mockExecute = vi.fn().mockResolvedValue({
            content: 'Response',
            model: 'gpt-4'
        });

        // Setup mock implementation
        (OpenAIProvider as any).mockImplementation(() => ({
            execute: mockExecute
        }));

        // Re-instantiate manager to pick up mock
        manager = new ExecutionManager();

        const request: Request = {
            model: 'gpt-4',
            messages: [],
            addMessage: () => {}
        };

        await manager.execute(request);

        expect(mockExecute).toHaveBeenCalledWith(request, {});
    });

    it('should use model from options if provided', async () => {
        const mockExecute = vi.fn().mockResolvedValue({ content: 'Response', model: 'claude' });
        
        (AnthropicProvider as any).mockImplementation(() => ({
            execute: mockExecute
        }));

        manager = new ExecutionManager();

        const request: Request = {
            model: 'gpt-4', // Request says GPT
            messages: [],
            addMessage: () => {}
        };

        // Options say Claude
        await manager.execute(request, { model: 'claude-3' });

        // Should use Anthropic provider because options.model override
        // Wait, getProvider is called with options.model || request.model
        // And execute called on that provider.
        
        // Let's verify correct provider is chosen
        // We need to spy on getProvider or check the side effect (mock called)
        
        expect(mockExecute).toHaveBeenCalled();
    });

    describe('execute helper', () => {
        it('should create manager and execute', async () => {
             const mockExecute = vi.fn().mockResolvedValue({
                content: 'Response',
                model: 'gpt-4'
            });

            (OpenAIProvider as any).mockImplementation(() => ({
                execute: mockExecute
            }));

            const request: Request = {
                model: 'gpt-4',
                messages: [],
                addMessage: () => {}
            };

            await execute(request);

            expect(mockExecute).toHaveBeenCalled();
        });
    });
});

