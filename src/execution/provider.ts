import { Request } from '../chat';

export interface ProviderResponse {
    content: string;
    model: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

export interface ExecutionOptions {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface Provider {
    execute(request: Request, options?: ExecutionOptions): Promise<ProviderResponse>;
}

