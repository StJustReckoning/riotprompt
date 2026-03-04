import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as proxyAnthropic from '../src/execution/proxy-anthropic';
import * as proxyGemini from '../src/execution/proxy-gemini';
import * as proxyOpenai from '../src/execution/proxy-openai';

vi.mock('undici', () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    class MockProxyAgent {
        type = 'proxy-agent';
        constructor(_opts: any) {}
    }
    return {
        ProxyAgent: MockProxyAgent,
        fetch: mockFetch,
    };
});

const ENV_KEYS = [
    'HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy',
    'NO_PROXY', 'no_proxy', 'NODE_TLS_REJECT_UNAUTHORIZED',
];

function clearProxyEnv() {
    for (const key of ENV_KEYS) {
        delete process.env[key];
    }
}

type ProxyModule = typeof proxyAnthropic;

const modules: Array<{ name: string; mod: ProxyModule }> = [
    { name: 'proxy-anthropic', mod: proxyAnthropic },
    { name: 'proxy-gemini', mod: proxyGemini },
    { name: 'proxy-openai', mod: proxyOpenai },
];

describe.each(modules)('$name', ({ mod }) => {
    beforeEach(clearProxyEnv);
    afterEach(clearProxyEnv);

    describe('getProxyUrl', () => {
        it('returns undefined when no proxy env vars are set', () => {
            expect(mod.getProxyUrl()).toBeUndefined();
        });

        it('reads HTTPS_PROXY', () => {
            process.env.HTTPS_PROXY = 'https://proxy:8080';
            expect(mod.getProxyUrl()).toBe('https://proxy:8080');
        });

        it('reads https_proxy', () => {
            process.env.https_proxy = 'https://lower:8080';
            expect(mod.getProxyUrl()).toBe('https://lower:8080');
        });

        it('reads HTTP_PROXY', () => {
            process.env.HTTP_PROXY = 'http://httpproxy:3128';
            expect(mod.getProxyUrl()).toBe('http://httpproxy:3128');
        });

        it('reads http_proxy', () => {
            process.env.http_proxy = 'http://lower-http:3128';
            expect(mod.getProxyUrl()).toBe('http://lower-http:3128');
        });

        it('prefers HTTPS_PROXY over lower-priority vars', () => {
            process.env.HTTPS_PROXY = 'https://winner:8080';
            process.env.http_proxy = 'http://loser:3128';
            expect(mod.getProxyUrl()).toBe('https://winner:8080');
        });
    });

    describe('getStrictSSL', () => {
        it('returns true by default', () => {
            expect(mod.getStrictSSL()).toBe(true);
        });

        it('returns false when NODE_TLS_REJECT_UNAUTHORIZED is 0', () => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            expect(mod.getStrictSSL()).toBe(false);
        });

        it('returns true for any other value', () => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
            expect(mod.getStrictSSL()).toBe(true);
        });
    });

    describe('isProxyBypassed', () => {
        it('returns false when NO_PROXY is not set', () => {
            expect(mod.isProxyBypassed('https://api.example.com')).toBe(false);
        });

        it('returns true for wildcard *', () => {
            process.env.NO_PROXY = '*';
            expect(mod.isProxyBypassed('https://anything.com')).toBe(true);
        });

        it('returns true for exact hostname match', () => {
            process.env.NO_PROXY = 'api.example.com';
            expect(mod.isProxyBypassed('https://api.example.com/path')).toBe(true);
        });

        it('returns false for non-matching hostname', () => {
            process.env.NO_PROXY = 'other.example.com';
            expect(mod.isProxyBypassed('https://api.example.com/path')).toBe(false);
        });

        it('matches domain suffix', () => {
            process.env.NO_PROXY = '.example.com';
            expect(mod.isProxyBypassed('https://api.example.com')).toBe(true);
        });

        it('matches domain suffix without leading dot', () => {
            process.env.NO_PROXY = 'example.com';
            expect(mod.isProxyBypassed('https://api.example.com')).toBe(true);
        });

        it('handles comma-separated list', () => {
            process.env.NO_PROXY = 'localhost,example.com,.internal.net';
            expect(mod.isProxyBypassed('https://localhost/foo')).toBe(true);
            expect(mod.isProxyBypassed('https://api.example.com')).toBe(true);
            expect(mod.isProxyBypassed('https://svc.internal.net')).toBe(true);
            expect(mod.isProxyBypassed('https://external.io')).toBe(false);
        });

        it('handles empty entries in list', () => {
            process.env.NO_PROXY = ',localhost,,';
            expect(mod.isProxyBypassed('https://localhost')).toBe(true);
        });

        it('returns false for invalid URL', () => {
            process.env.NO_PROXY = 'example.com';
            expect(mod.isProxyBypassed('not-a-url')).toBe(false);
        });

        it('reads no_proxy (lowercase)', () => {
            process.env.no_proxy = 'localhost';
            expect(mod.isProxyBypassed('https://localhost')).toBe(true);
        });
    });

    describe('createProxyFetch', () => {
        it('returns a function', () => {
            const proxyFetch = mod.createProxyFetch('https://proxy:8080');
            expect(typeof proxyFetch).toBe('function');
        });

        it('calls undici fetch with dispatcher for non-bypassed URLs', async () => {
            const { fetch: undiciFetch } = await import('undici');
            const proxyFetch = mod.createProxyFetch('https://proxy:8080');
            await proxyFetch('https://api.example.com/v1/chat');
            expect(undiciFetch).toHaveBeenCalledWith(
                'https://api.example.com/v1/chat',
                expect.objectContaining({ dispatcher: expect.any(Object) }),
            );
        });

        it('calls undici fetch without dispatcher for bypassed URLs', async () => {
            process.env.NO_PROXY = 'api.example.com';
            const { fetch: undiciFetch } = await import('undici');
            vi.mocked(undiciFetch).mockClear();
            const proxyFetch = mod.createProxyFetch('https://proxy:8080');
            await proxyFetch('https://api.example.com/v1/chat');
            expect(undiciFetch).toHaveBeenCalledWith(
                'https://api.example.com/v1/chat',
                undefined,
            );
        });

        it('handles URL object input', async () => {
            const { fetch: undiciFetch } = await import('undici');
            vi.mocked(undiciFetch).mockClear();
            const proxyFetch = mod.createProxyFetch('https://proxy:8080');
            const url = new URL('https://api.example.com/v1/chat');
            await proxyFetch(url);
            expect(undiciFetch).toHaveBeenCalled();
        });

        it('handles Request-like object input', async () => {
            const { fetch: undiciFetch } = await import('undici');
            vi.mocked(undiciFetch).mockClear();
            const proxyFetch = mod.createProxyFetch('https://proxy:8080');
            const req = { url: 'https://api.example.com/v1/chat' };
            await proxyFetch(req as any);
            expect(undiciFetch).toHaveBeenCalled();
        });
    });
});

describe('proxy-gemini withProxyFetch', () => {
    beforeEach(clearProxyEnv);
    afterEach(clearProxyEnv);

    it('temporarily replaces globalThis.fetch and restores it', async () => {
        const originalFetch = globalThis.fetch;
        const result = await proxyGemini.withProxyFetch('https://proxy:8080', async () => {
            expect(globalThis.fetch).not.toBe(originalFetch);
            return 'done';
        });
        expect(result).toBe('done');
        expect(globalThis.fetch).toBe(originalFetch);
    });

    it('restores globalThis.fetch even if callback throws', async () => {
        const originalFetch = globalThis.fetch;
        await expect(
            proxyGemini.withProxyFetch('https://proxy:8080', async () => {
                throw new Error('boom');
            }),
        ).rejects.toThrow('boom');
        expect(globalThis.fetch).toBe(originalFetch);
    });
});
