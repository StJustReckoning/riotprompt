import { describe, it, expect, vi } from 'vitest';
import { ExecutionManager } from '../src/execution/index';
import { OpenAIProvider } from '../src/execution/openai';
import { AnthropicProvider } from '../src/execution/anthropic';
import { GeminiProvider } from '../src/execution/gemini';

// Mock providers
vi.mock('../src/execution/openai');
vi.mock('../src/execution/anthropic');
vi.mock('../src/execution/gemini');

describe('ExecutionManager', () => {
    it('should select OpenAI provider for gpt models', () => {
        const manager = new ExecutionManager();
        const provider = manager.getProvider('gpt-4');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should select OpenAI provider for o1 models', () => {
        const manager = new ExecutionManager();
        const provider = manager.getProvider('o1-mini');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should select Anthropic provider for claude models', () => {
        const manager = new ExecutionManager();
        const provider = manager.getProvider('claude-3-opus');
        expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should select Gemini provider for gemini models', () => {
        const manager = new ExecutionManager();
        const provider = manager.getProvider('gemini-1.5-pro');
        expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it('should default to OpenAI provider', () => {
        const manager = new ExecutionManager();
        const provider = manager.getProvider('unknown-model');
        expect(provider).toBeInstanceOf(OpenAIProvider);
    });
});

