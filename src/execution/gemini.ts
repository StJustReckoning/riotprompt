import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider, ProviderResponse, ExecutionOptions } from './provider';
import { Request } from '../chat';

export class GeminiProvider implements Provider {
    async execute(request: Request, options: ExecutionOptions = {}): Promise<ProviderResponse> {
        const apiKey = options.apiKey || process.env.GEMINI_API_KEY; // or GOOGLE_API_KEY
        if (!apiKey) throw new Error('Gemini API key is required');

        const genAI = new GoogleGenerativeAI(apiKey);
        
        const modelName = options.model || request.model || 'gemini-1.5-pro';
        
        // Gemini format: system instruction is separate, history is separate from last message
        // generateContent accepts a string or parts.
        
        // We need to construct the prompt.
        // Simple approach: Concat system instructions + chat history
        
        let systemInstruction = '';
        
        // Extract system prompt
        for (const msg of request.messages) {
            if (msg.role === 'system' || msg.role === 'developer') {
                systemInstruction += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + '\n\n';
            }
        }

        // Configure model with system instruction if available (newer Gemini versions support this)
        // Or just prepend to first user message.
        // Let's try to prepend for compatibility if needed, but 'systemInstruction' param exists in getGenerativeModel config.
        
        const configuredModel = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction ? systemInstruction.trim() : undefined
        });

        // Build history/messages
        // Gemini `generateContent` takes the *last* user message.
        // `startChat` takes history.
        
        const chatHistory = [];
        let lastUserMessage = '';

        for (const msg of request.messages) {
            if (msg.role === 'system' || msg.role === 'developer') continue;
            
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            
            if (msg.role === 'user') {
                lastUserMessage = content; // Assuming strictly alternating or we just want the prompt?
                // If there are multiple messages, we should build a chat.
            }
            
            chatHistory.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: content }]
            });
        }

        // If we are just running a prompt (single turn), we can use generateContent with the full text.
        // But let's support multi-turn by using startChat if history > 1.
        
        // If it's a typical "Prompt" execution, it's usually System + 1 User message.
        
        let result;
        
        if (chatHistory.length > 1) {
            // Remove last message from history to send it
            const lastMsg = chatHistory.pop();
            const chat = configuredModel.startChat({
                history: chatHistory
            });
            result = await chat.sendMessage(lastMsg?.parts[0].text || '');
        } else {
            // Just one message (or none?)
            result = await configuredModel.generateContent(lastUserMessage || ' ');
        }

        const response = await result.response;
        const text = response.text();

        return {
            content: text,
            model: modelName,
            // Gemini usage metadata usageMetadata
            usage: response.usageMetadata ? {
                inputTokens: response.usageMetadata.promptTokenCount,
                outputTokens: response.usageMetadata.candidatesTokenCount
            } : undefined
        };
    }
}

