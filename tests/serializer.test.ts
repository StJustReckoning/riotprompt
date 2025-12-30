import { describe, it, expect } from 'vitest';
import * as Serializer from '../src/serializer';
import { create as createPrompt } from '../src/prompt';
import { create as createSection } from '../src/items/section';
import { create as createInstruction } from '../src/items/instruction';
import { create as createContext } from '../src/items/context';

describe('Serializer', () => {
    const createTestPrompt = () => {
        return createPrompt({
            persona: createSection({ title: 'Persona' }).add('You are a bot.'),
            instructions: createSection({ title: 'Instructions' }).add('Do work.'),
            contexts: createSection({ title: 'Context' }).add(
                createSection({ title: 'Data' }).add('{ "a": 1 }')
            )
        });
    };

    describe('JSON', () => {
        it('should serialize to JSON', () => {
            const prompt = createTestPrompt();
            const json = Serializer.toJSON(prompt);
            const parsed = JSON.parse(json);

            expect(parsed.persona.title).toBe('Persona');
            expect(parsed.persona.items[0].text).toBe('You are a bot.');
            expect(parsed.instructions.title).toBe('Instructions');
            expect(parsed.contexts.items[0].title).toBe('Data');
        });

        it('should deserialize from JSON', () => {
            const prompt = createTestPrompt();
            const json = Serializer.toJSON(prompt);
            const deserialized = Serializer.fromJSON(json);

            expect(deserialized.persona?.title).toBe('Persona');
            // Check that it's a real Section object with methods
            expect(deserialized.persona?.add).toBeDefined(); 
            // Check content
            expect((deserialized.persona?.items[0] as any).text).toBe('You are a bot.');
            
            // Check nested structure
            const contextSection = deserialized.contexts?.items[0] as any;
            expect(contextSection.title).toBe('Data');
            expect(contextSection.items[0].text).toBe('{ "a": 1 }');
        });
    });

    describe('XML', () => {
        it('should serialize to XML', () => {
            const prompt = createTestPrompt();
            const xml = Serializer.toXML(prompt);

            expect(xml).toContain('<prompt>');
            expect(xml).toContain('<persona title="Persona">');
            expect(xml).toContain('<item>You are a bot.</item>');
            expect(xml).toContain('<section title="Data">');
        });

        it('should deserialize from XML', () => {
            const prompt = createTestPrompt();
            const xml = Serializer.toXML(prompt);
            const deserialized = Serializer.fromXML(xml);

            expect(deserialized.persona?.title).toBe('Persona');
            expect(deserialized.instructions.title).toBe('Instructions');
            
            // XML parsing might handle weights differently or not present if undefined
            // Check content text
            expect((deserialized.persona?.items[0] as any).text).toBe('You are a bot.');
            expect((deserialized.instructions.items[0] as any).text).toBe('Do work.');

            // Nested
            const contextSection = deserialized.contexts?.items[0] as any;
            expect(contextSection.title).toBe('Data');
            // XML trimValues=true might affect spaces in JSON content unless we use CDATA or preserve
            // But fast-xml-parser with trimValues: true will trim content.
            // Let's adjust expectation or config.
            // '{ "a": 1 }' -> '{ "a": 1 }' should survive if distinct.
            expect(contextSection.items[0].text).toBe('{ "a": 1 }');
        });
    });
});

