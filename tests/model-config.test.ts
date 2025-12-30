import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
    ModelRegistry, 
    getModelRegistry, 
    resetModelRegistry, 
    configureModel,
    getPersonaRole,
    getEncoding,
    supportsToolCalls,
    getModelFamily
} from '../src/model-config';

describe('Model Configuration', () => {
    describe('ModelRegistry', () => {
        let registry: ModelRegistry;

        beforeEach(() => {
            registry = new ModelRegistry();
        });

        it('should have default configurations', () => {
            const configs = registry.getAllConfigs();
            expect(configs.length).toBeGreaterThan(0);
            
            // Check for known families
            expect(configs.some(c => c.family === 'gpt-4')).toBe(true);
            expect(configs.some(c => c.family === 'claude')).toBe(true);
        });

        it('should match GPT-4 models correctly', () => {
            const config = registry.getConfig('gpt-4-turbo');
            expect(config.family).toBe('gpt-4');
            expect(config.personaRole).toBe('system');
            expect(config.encoding).toBe('gpt-4o');
        });

        it('should match O-series models correctly', () => {
            const config = registry.getConfig('o1-preview');
            expect(config.family).toBe('o-series');
            expect(config.personaRole).toBe('developer');
        });

        it('should match Claude models correctly', () => {
            const config = registry.getConfig('claude-3-opus');
            expect(config.family).toBe('claude');
            expect(config.personaRole).toBe('system');
            expect(config.encoding).toBe('cl100k_base');
        });

        it('should fallback to default for unknown models', () => {
            const config = registry.getConfig('unknown-model-v1');
            expect(config.family).toBe('unknown');
            expect(config.personaRole).toBe('system');
        });

        it('should allow registering new configurations', () => {
            registry.register({
                exactMatch: 'my-custom-model',
                personaRole: 'developer',
                encoding: 'cl100k_base',
                family: 'custom'
            });

            const config = registry.getConfig('my-custom-model');
            expect(config.family).toBe('custom');
            expect(config.personaRole).toBe('developer');
        });

        it('should prioritize exact match over pattern', () => {
            // Register a pattern that would match
            registry.register({
                pattern: /^test-.*/,
                personaRole: 'system',
                encoding: 'gpt-4o',
                family: 'pattern-match'
            });

            // Register an exact match that conflicts
            registry.register({
                exactMatch: 'test-specific',
                personaRole: 'developer',
                encoding: 'cl100k_base',
                family: 'exact-match'
            });

            // Note: Registry checks in order. So if we want exact match to win, 
            // it depends on order or logic.
            // The logic in getConfig iterates through configs in order.
            // If I register pattern first, it will match pattern first.
            // If I register exact match first, it will match exact match first.
            // However, the implementation of getConfig checks `exactMatch` AND `pattern` inside the loop.
            // But it returns on first match. 
            
            // Let's create a new registry to test priority by order
            const r2 = new ModelRegistry();
            r2.reset(); // clear defaults

            // 1. Add pattern
            r2.register({
                pattern: /test/,
                personaRole: 'system',
                encoding: 'gpt-4o',
                family: 'pattern'
            });
            // 2. Add exact
            r2.register({
                exactMatch: 'test',
                personaRole: 'developer',
                encoding: 'gpt-4o',
                family: 'exact'
            });

            // Since pattern was added first, it should match first?
            // "Configs are checked in registration order (first match wins)"
            // But we changed registration to unshift (LIFO), so last registered wins.
            expect(r2.getConfig('test').family).toBe('exact');

            // Now try reverse order
            const r3 = new ModelRegistry();
            r3.reset();
            r3.register({
                exactMatch: 'test',
                personaRole: 'developer',
                encoding: 'gpt-4o',
                family: 'exact'
            });
             r3.register({
                pattern: /test/,
                personaRole: 'system',
                encoding: 'gpt-4o',
                family: 'pattern'
            });
            // Pattern added last, so checked first.
            expect(r3.getConfig('test').family).toBe('pattern');
        });

        it('should cache results', () => {
            const config1 = registry.getConfig('gpt-4');
            // Modify internal cache to verify it's being used (hacky but effective for unit test)
            (registry as any).cache.set('gpt-4', { ...config1, family: 'hacked' });
            
            const config2 = registry.getConfig('gpt-4');
            expect(config2.family).toBe('hacked');
        });

        it('should clear cache', () => {
            const config1 = registry.getConfig('gpt-4');
            (registry as any).cache.set('gpt-4', { ...config1, family: 'hacked' });
            
            registry.clearCache();
            const config2 = registry.getConfig('gpt-4');
            expect(config2.family).toBe('gpt-4'); // Back to original because cache cleared
        });

        it('should reset to defaults', () => {
            registry.reset();
            const configs = registry.getAllConfigs();
            // Should contain defaults
            expect(configs.some(c => c.family === 'gpt-4')).toBe(true);
        });

        describe('Error Handling', () => {
            it('should throw when registering invalid config', () => {
                expect(() => {
                    registry.register({
                        personaRole: 'system',
                        encoding: 'gpt-4o'
                    } as any);
                }).toThrow('Model config must have either pattern or exactMatch');
            });

            it('should throw when no config found', () => {
                // Remove the default fallback to trigger error
                registry = new ModelRegistry();
                (registry as any).configs = []; // Manually clear
                
                expect(() => {
                    registry.getConfig('anything');
                }).toThrow('No configuration found for model: anything');
            });
        });
    });

    describe('Global Registry Helpers', () => {
        beforeEach(() => {
            resetModelRegistry();
        });

        it('should get global registry', () => {
            const r1 = getModelRegistry();
            const r2 = getModelRegistry();
            expect(r1).toBe(r2);
        });

        it('should get persona role', () => {
            expect(getPersonaRole('o1-preview')).toBe('developer');
        });

        it('should get encoding', () => {
            expect(getEncoding('gpt-4')).toBe('gpt-4o');
        });

        it('should check tool support', () => {
            expect(supportsToolCalls('gpt-4')).toBe(true);
        });

        it('should get family', () => {
            expect(getModelFamily('claude-3')).toBe('claude');
        });

        it('should configure new model globally', () => {
            configureModel({
                exactMatch: 'global-custom',
                personaRole: 'developer',
                encoding: 'o200k_base',
                family: 'global'
            });

            expect(getModelFamily('global-custom')).toBe('global');
        });
    });
});

