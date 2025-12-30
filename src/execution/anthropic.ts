import Anthropic from '@anthropic-ai/sdk';
import { Provider, ProviderResponse, ExecutionOptions } from './provider';
import { Request } from '../chat';

export class AnthropicProvider implements Provider {
    async execute(request: Request, options: ExecutionOptions = {}): Promise<ProviderResponse> {
        const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('Anthropic API key is required');

        const client = new Anthropic({ apiKey });
        
        const model = options.model || request.model || 'claude-3-opus-20240229';

        // Anthropic separates system prompt from messages
        let systemPrompt = '';
        const messages: Anthropic.MessageParam[] = [];

        for (const msg of request.messages) {
            if (msg.role === 'system' || msg.role === 'developer') {
                systemPrompt += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + '\n\n';
            } else {
                messages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                });
            }
        }

        const response = await client.messages.create({
            model: model,
            system: systemPrompt.trim() || undefined,
            messages: messages,
            max_tokens: options.maxTokens || 4096, // Anthropic requires max_tokens
            temperature: options.temperature,
        });

        // Handle ContentBlock
        const contentBlock = response.content[0];
        const text = contentBlock.type === 'text' ? contentBlock.text : '';

        return {
            content: text,
            model: response.model,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
            }
        };
    }
}

