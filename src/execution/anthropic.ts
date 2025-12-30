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
            max_tokens: options.maxTokens || 4096,
            temperature: options.temperature,
            ...(request.responseFormat?.type === 'json_schema' ? {
                tools: [{
                    name: request.responseFormat.json_schema.name,
                    description: request.responseFormat.json_schema.description || "Output data in this structured format",
                    input_schema: request.responseFormat.json_schema.schema
                }],
                tool_choice: { type: 'tool', name: request.responseFormat.json_schema.name }
            } : {})
        });

        // Handle ContentBlock
        // Check for tool_use first if we requested structured output
        let text = '';
        
        if (request.responseFormat?.type === 'json_schema') {
            const toolUseBlock = response.content.find(block => block.type === 'tool_use');
            if (toolUseBlock && toolUseBlock.type === 'tool_use') {
                // Return the structured data as a JSON string to match OpenAI behavior
                text = JSON.stringify(toolUseBlock.input, null, 2);
            }
        } else {
            const contentBlock = response.content[0];
            text = contentBlock.type === 'text' ? contentBlock.text : '';
        }

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

