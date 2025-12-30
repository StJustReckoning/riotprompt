import { Provider, ProviderResponse, ExecutionOptions } from './provider';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { Request } from '../chat';

export type { Provider, ProviderResponse, ExecutionOptions };

export class ExecutionManager {
    private providers: Map<string, Provider>;

    constructor() {
        this.providers = new Map();
        this.providers.set('openai', new OpenAIProvider());
        this.providers.set('anthropic', new AnthropicProvider());
        this.providers.set('gemini', new GeminiProvider());
    }

    getProvider(model: string): Provider {
        if (model.startsWith('gpt') || model.startsWith('o1')) {
            return this.providers.get('openai')!;
        } else if (model.startsWith('claude')) {
            return this.providers.get('anthropic')!;
        } else if (model.startsWith('gemini')) {
            return this.providers.get('gemini')!;
        }
        
        // Fallback or default?
        return this.providers.get('openai')!;
    }

    async execute(request: Request, options: ExecutionOptions = {}): Promise<ProviderResponse> {
        const model = options.model || request.model;
        const provider = this.getProvider(model);
        return provider.execute(request, options);
    }
}

export const execute = async (request: Request, options: ExecutionOptions = {}): Promise<ProviderResponse> => {
    const manager = new ExecutionManager();
    return manager.execute(request, options);
}
