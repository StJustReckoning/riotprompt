import { Model } from "../src/chat";
import { create as createFormatter, FormatOptions, SectionSeparator, SectionTitleProperty } from "../src/formatter";
import { Content } from "../src/items/content";
import { Context } from "../src/items/context";
import { Instruction } from "../src/items/instruction";
import { Section } from "../src/items/section";
import { Weighted } from "../src/items/weighted";
import { create as createPrompt } from "../src/prompt";
// Import the constructor for Prompt
import { createSection } from "../src/riotprompt";
import { describe, expect, it } from 'vitest';

// Let's create simple mock functions instead of using vi.fn()
const createMockFn = () => function () { return undefined; };

// Create a mock to shim the join method for our tests
const createJoinable = (items: any[]) => {
    const joinable = items;
    joinable.join = (separator: string) => items.map(item => item.text || item).join(separator);
    return joinable;
};

// Define a minimal mock section to satisfy the return type of 'add'
const minimalMockSection: Section<Weighted> = {
    title: 'mock',
    items: [],
    // @ts-ignore
    add: createMockFn(),
    // @ts-ignore
    append: createMockFn(),
    // @ts-ignore
    prepend: createMockFn(),
    // @ts-ignore
    insert: createMockFn(),
    // @ts-ignore
    remove: createMockFn(),
    // @ts-ignore
    replace: createMockFn()
};

describe("formatter", () => {
    const model: Model = "gpt-4o";
    // Create formatter instance for tests
    const formatter = createFormatter();

    describe("formatPersona", () => {
        it("should format persona correctly", () => {
            const traits = [{ text: "trait1", weight: 1 }, { text: "trait2", weight: 1 }];
            const instructions = [{ text: "instruction1", weight: 1 }, { text: "instruction2", weight: 1 }];

            const traitsSection = createSection({ title: 'Traits' });
            const instructionsSection = createSection({ title: 'Instructions' });

            traits.forEach(trait => traitsSection.add(trait));
            instructions.forEach(instruction => instructionsSection.add(instruction));

            const persona = createSection({ title: 'Persona' });
            persona.add(traitsSection);
            persona.add(instructionsSection);

            const result = formatter.formatPersona(model, persona);
            expect(result.role).toBe("system");
            expect(result.content).toBe("<Persona>\n<Traits>\ntrait1\n\ntrait2\n</Traits>\n\n<Instructions>\ninstruction1\n\ninstruction2\n</Instructions>\n</Persona>");
        });

        it("should format persona with custom separators", () => {
            const traits = [{ text: "trait1", weight: 1 }, { text: "trait2", weight: 1 }];
            const instructions = [{ text: "instruction1", weight: 1 }, { text: "instruction2", weight: 1 }];

            const traitsSection = createSection({ title: 'Traits' });
            const instructionsSection = createSection({ title: 'Instructions' });

            traits.forEach(trait => traitsSection.add(trait));
            instructions.forEach(instruction => instructionsSection.add(instruction));

            const persona = createSection({ title: 'Persona' });
            persona.add(traitsSection);
            persona.add(instructionsSection);

            // Create a custom formatter with tag separator
            const customFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "tag" as SectionSeparator,
                    sectionDepth: 0
                }
            });

            const result = customFormatter.formatPersona(model, persona);
            expect(result.role).toBe("system");
            expect(result.content).toBe("<Persona>\n<Traits>\ntrait1\n\ntrait2\n</Traits>\n\n<Instructions>\ninstruction1\n\ninstruction2\n</Instructions>\n</Persona>");
        });
    });

    describe("format", () => {
        it("should format simple text correctly", () => {
            const text: Weighted = { text: "test text", weight: 1 };
            const result = formatter.format(text);
            expect(result).toBe("test text");
        });

        it("should format section with tag separator correctly", () => {
            // Define the section object directly for clarity
            const sectionItems = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];
            const section: Section<Weighted> = {
                title: "Test Section",
                items: sectionItems,
                // @ts-ignore
                add: createMockFn(),
                // @ts-ignore
                append: createMockFn(),
                // @ts-ignore
                prepend: createMockFn(),
            };

            // Create formatter with tag separator
            const tagFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "tag" as SectionSeparator,
                }
            });

            const result = tagFormatter.format(section);
            expect(result).toBe(`<Test Section>\nitem1\n\nitem2\n</Test Section>`);
        });

        it("should format section with markdown separator correctly", () => {
            // Define the section object directly for clarity
            const sectionItems = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];
            const section: Section<Weighted> = {
                title: "Test Section",
                items: sectionItems,
                // @ts-ignore
                add: createMockFn(),
                // @ts-ignore
                append: createMockFn(),
                // @ts-ignore
                prepend: createMockFn(),
            };

            // Create formatter with markdown separator
            const markdownFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "markdown" as SectionSeparator,
                }
            });

            const result = markdownFormatter.format(section, 1);
            expect(result).toBe(`## Test Section\n\nitem1\n\nitem2`);
        });

        it("should format section with different sectionTitleProperty", () => {
            const sectionItems = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];
            // Ensure the section has a 'name' property to match the sectionTitleProperty
            const section = {
                title: "Test Section",
                name: "Test Section", // Add a name property
                items: sectionItems,
                add: (item: any) => section
            } as unknown as Section<Weighted>;

            // Create formatter with custom title property
            const customFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "tag" as SectionSeparator,
                    sectionTitleProperty: "name" as SectionTitleProperty,
                }
            });

            const result = customFormatter.format(section);
            expect(result).toBe(`<Test Section>\nitem1\n\nitem2\n</Test Section>`);
        });

        it("should format section with custom indentation", () => {
            const sectionItems = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];
            const section: Section<Weighted> = {
                title: "Test Section",
                items: sectionItems,
                // @ts-ignore
                add: createMockFn(),
                // @ts-ignore
                append: createMockFn(),
                // @ts-ignore
                prepend: createMockFn(),
            };

            // Create formatter with custom indentation
            const indentationFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "tag" as SectionSeparator,
                    sectionIndentation: true,
                }
            });

            const result = indentationFormatter.format(section);
            expect(result).toBe(`<Test Section>\nitem1\n\nitem2\n</Test Section>`);
        });

        it("should format section with custom title prefix and separator", () => {
            const sectionItems = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];
            const section: Section<Weighted> = {
                title: "Test Section",
                items: sectionItems,
                // @ts-ignore
                add: createMockFn(),
                // @ts-ignore
                append: createMockFn(),
                // @ts-ignore
                prepend: createMockFn(),
            };

            // Create formatter with custom title prefix and separator
            const customFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "markdown" as SectionSeparator,
                    sectionTitlePrefix: "Category",
                    sectionTitleSeparator: "-",
                    sectionDepth: 0
                }
            });

            const result = customFormatter.format(section);
            expect(result).toBe(`# Category - Test Section\n\nitem1\n\nitem2`);
        });
    });

    describe("formatArray", () => {
        it("should format array of items correctly", () => {
            const items: Weighted[] = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];

            const result = formatter.formatArray(items);
            expect(result).toBe("item1\n\nitem2");
        });

        it("should handle empty arrays", () => {
            const items: Weighted[] = [];

            const result = formatter.formatArray(items);
            expect(result).toBe("");
        });

        it("should format Content items correctly", () => {
            const items: Content[] = [
                { text: "content1", weight: 1 },
                { text: "content2", weight: 1 }
            ];
            const result = formatter.formatArray(items);
            expect(result).toBe("content1\n\ncontent2");
        });

        it("should format Instruction items correctly", () => {
            const items: Instruction[] = [
                { text: "instruction1", weight: 1 },
                { text: "instruction2", weight: 1 }
            ];
            const result = formatter.formatArray(items);
            expect(result).toBe("instruction1\n\ninstruction2");
        });

        it("should format Context items correctly", () => {
            const items: Context[] = [
                { text: "context1", weight: 1 },
                { text: "context2", weight: 1 }
            ];
            const result = formatter.formatArray(items);
            expect(result).toBe("context1\n\ncontext2");
        });

        it("should format array with custom area separator", () => {
            const items: Weighted[] = [
                { text: "item1", weight: 1 },
                { text: "item2", weight: 1 }
            ];

            // Create formatter with tag separator
            const tagFormatter = createFormatter({
                formatOptions: {
                    sectionSeparator: "tag" as SectionSeparator,
                }
            });

            const result = tagFormatter.formatArray(items);
            expect(result).toBe("item1\n\nitem2");
        });
    });

    describe("formatPrompt", () => {
        it("should format prompt correctly", () => {
            const model: Model = "gpt-4o";
            const instructions = createSection({ title: 'Instructions' });
            const contents = createSection({ title: 'Contents' });
            const contexts = createSection({ title: 'Contexts' });

            // Add some content to the prompt
            instructions.add("Test instruction");
            contents.add("Test content");
            contexts.add("Test context");

            const traitsSection = createSection({ title: 'Traits' });
            const personaInstructionsSection = createSection({ title: 'Instructions' });

            traitsSection.add({ text: "trait1", weight: 1 });
            personaInstructionsSection.add({ text: "instruction1", weight: 1 });

            const persona = createSection({ title: 'Persona' });
            persona.add(traitsSection);
            persona.add(personaInstructionsSection);

            const prompt = createPrompt({ persona, instructions, contents, contexts });

            const result = formatter.formatPrompt(model, prompt);
            expect(result.model).toBe("gpt-4o");
            expect(result.messages.length).toBe(2);
            expect(result.messages[0].role).toBe("system");
            expect(result.messages[0].content).toBe("<Persona>\n<Traits>\ntrait1\n</Traits>\n\n<Instructions>\ninstruction1\n</Instructions>\n</Persona>");
            expect(result.messages[1].role).toBe("user");
            expect(result.messages[1].content).toContain("Test instruction");
            expect(result.messages[1].content).toContain("Test content");
            expect(result.messages[1].content).toContain("Test context");
        });
    });


});
