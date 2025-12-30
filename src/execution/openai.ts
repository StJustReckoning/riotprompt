import OpenAI from 'openai';
import { Provider, ProviderResponse, ExecutionOptions } from './provider';
import { Request } from '../chat';

export class OpenAIProvider implements Provider {
    async execute(request: Request, options: ExecutionOptions = {}): Promise<ProviderResponse> {
        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key is required');

        const client = new OpenAI({ apiKey });
        
        const model = options.model || request.model || 'gpt-4';

        // Convert RiotPrompt messages to OpenAI messages
        const messages = request.messages.map(msg => {
            const role = msg.role === 'developer' ? 'system' : msg.role; // OpenAI uses system, not developer usually (except o1)
            // But wait, o1 uses developer. Let's respect what formatter gave us if valid.
            // OpenAI Node SDK types expect specific roles.
            // RiotPrompt roles: "user" | "assistant" | "system" | "developer"
            // OpenAI roles: "system" | "user" | "assistant" | "tool" | "function" | "developer" (recent versions)
            
            // We'll cast to any to avoid strict type issues with older/newer SDK versions mismatch
            return {
                role: role,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                name: msg.name
            } as any;
        });

        const response = await client.chat.completions.create({
            model: model,
            messages: messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            response_format: request.responseFormat,
        });

        const choice = response.choices[0];
        
        return {
            content: choice.message.content || '',
            model: response.model,
            usage: response.usage ? {
                inputTokens: response.usage.prompt_tokens,
                outputTokens: response.usage.completion_tokens
            } : undefined
        };
    }
}

