import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Serializer from '../src/serializer';
import { create as createPrompt } from '../src/prompt';
import { create as createSection } from '../src/items/section';

// Mock XMLParser
const mockParse = vi.fn();
vi.mock('fast-xml-parser', () => ({
    XMLParser: vi.fn(() => ({
        parse: mockParse
    }))
}));

describe('Serializer Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default behavior: return empty or basic structure to avoid crashes in other tests if they run here
        // But since I'm mocking the module, I need to ensure toJSON/toXML don't rely on it (they don't use XMLParser, only fromXML does).
    });

    describe('JSON', () => {
        it('should handle undefined sections in fromJSON', () => {
            // Minimal JSON
            const json = JSON.stringify({});
            const prompt = Serializer.fromJSON(json);
            
            expect(prompt.persona).toBeUndefined();
            expect(prompt.contents).toBeUndefined();
            expect(prompt.contexts).toBeUndefined();
            expect(prompt.instructions).toBeDefined(); // Always created
        });

        it('should handle mix of nested sections and items', () => {
            const json = JSON.stringify({
                instructions: {
                    title: 'Main',
                    items: [
                        'Simple string',
                        { text: 'Weighted item', weight: 0.5 },
                        { 
                            title: 'Sub',
                            items: ['Nested item']
                        }
                    ]
                }
            });

            const prompt = Serializer.fromJSON(json);
            const items = prompt.instructions.items;
            
            expect((items[0] as any).text).toBe('Simple string');
            expect((items[1] as any).text).toBe('Weighted item');
            expect((items[1] as any).weight).toBe(0.5);
            expect((items[2] as any).items[0].text).toBe('Nested item');
        });

        it('should throw on invalid section structure', () => {
            expect(() => {
                // @ts-ignore
                Serializer.fromJSON(JSON.stringify({
                    instructions: { invalid: 'structure' }
                }));
            }).toThrow('Invalid section structure');
        });
    });

    describe('XML', () => {
        // toXML does NOT use XMLParser, so we can test it directly
        it('should serialize simple items', () => {
            const prompt = createPrompt({
                instructions: createSection({ title: 'T' }).add('text')
            });
            const xml = Serializer.toXML(prompt);
            expect(xml).toContain('<item>text</item>');
        });

        it('should serialize nested sections', () => {
            const prompt = createPrompt({
                instructions: createSection({ title: 'Root' }).add(
                    createSection({ title: 'Child', weight: 0.5 })
                )
            });
            const xml = Serializer.toXML(prompt);
            expect(xml).toContain('<section title="Child" weight="0.5">');
        });

        it('should handle XML entities escaping', () => {
            const prompt = createPrompt({
                instructions: createSection().add('< & " > \'')
            });
            const xml = Serializer.toXML(prompt);
            expect(xml).toContain('&lt; &amp; &quot; &gt; &apos;');
        });

        // fromXML uses XMLParser, so we use the mock
        it('should throw on invalid XML', () => {
            // Mock parse to throw or return bad structure
            mockParse.mockReturnValue([]); // empty array -> no prompt root
            expect(() => Serializer.fromXML('not xml')).toThrow('missing <prompt> root');
        });

        it('should parse weighted items from XML', () => {
            // Mock specific structure for this test
            mockParse.mockReturnValue([
                { 
                    prompt: [
                        { 
                            instructions: [
                                { 
                                    item: [
                                        { "#text": "Weighted Text" },
                                        { ":@": { "@_weight": "0.8" } }
                                    ] 
                                }
                            ] 
                        }
                    ] 
                }
            ]);

            const xml = '...'; // Content doesn't matter, mock returns structure
            const prompt = Serializer.fromXML(xml);
            const item = prompt.instructions.items[0] as any;
            
            expect(item.text).toBe('Weighted Text');
            expect(item.weight).toBe(0.8);
        });

        it('should parse nested sections from XML', () => {
            mockParse.mockReturnValue([
                { 
                    prompt: [
                        { 
                            instructions: [
                                { 
                                    section: [
                                        { ":@": { "@_title": "Sub" } },
                                        { 
                                            item: [
                                                { "#text": "Inner" }
                                            ] 
                                        }
                                    ]
                                }
                            ] 
                        }
                    ] 
                }
            ]);

            const xml = '...';
            const prompt = Serializer.fromXML(xml);
            const sub = prompt.instructions.items[0] as any;
            expect(sub.title).toBe('Sub');
            expect(sub.items[0].text).toBe('Inner');
        });
    });
});
