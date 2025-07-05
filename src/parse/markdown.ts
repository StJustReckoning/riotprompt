import { create as createSection, Section, SectionOptions, SectionOptionsSchema } from '../items/section';
import { create as createWeighted, Weighted, WeightedOptionsSchema } from '../items/weighted';

export const parseMarkdown = async <T extends Weighted>(
    input: string | Buffer,
    options: Partial<SectionOptions> = {}
): Promise<Section<T>> => {

    // Dynamic import for marked (ES module)
    const { marked } = await import('marked');

    let markdownContent;
    if (typeof input === 'string') {
        markdownContent = input;
    } else {
        markdownContent = input.toString();
    }

    const sectionOptions = SectionOptionsSchema.parse(options);

    // Use marked.lexer to get tokens without full parsing/rendering
    const tokens = marked.lexer(markdownContent);

    // Create the main section (with a Title from the options)
    const mainSection = createSection<T>(sectionOptions);

    // Track sections at each depth level
    const sectionStack: Section<T>[] = [mainSection];

    // Set if we've seen the first token
    let isFirstToken = true;

    // Set the item options
    const itemOptions = WeightedOptionsSchema.parse({
        ...sectionOptions,
        weight: sectionOptions.itemWeight,
    });

    for (const token of tokens) {
        switch (token.type) {
            case 'heading': {
                const depth = token.depth;

                // If this is the first token and it's a heading, use it as the main section title
                if (isFirstToken) {
                    mainSection.title = token.text;
                    isFirstToken = false;
                    break;
                }

                isFirstToken = false;

                // Create a new section with this heading
                const newSection = createSection<T>({ ...sectionOptions, title: token.text });

                // Ensure the section stack has the right size based on this heading's depth
                // (e.g., a depth-2 heading should be added to the depth-1 section)
                // We need to ensure the stack length is exactly depth, not just less than or equal to depth
                while (sectionStack.length > depth && sectionStack.length > 1) {
                    sectionStack.pop();
                }

                // Make sure we're at the right level for this heading
                // If we stay at the same heading level (e.g., two h2s in sequence),
                // we need to pop once more to get to the parent level
                if (sectionStack.length === depth && sectionStack.length > 1) {
                    sectionStack.pop();
                }

                // Add new section to its parent
                const parentSection = sectionStack[sectionStack.length - 1];
                parentSection.add(newSection, itemOptions);

                // Push this section onto the stack
                sectionStack.push(newSection);
                break;
            }

            case 'paragraph': {
                isFirstToken = false;
                const instruction: T = createWeighted<T>(token.text, itemOptions);
                const currentSection = sectionStack[sectionStack.length - 1];
                currentSection.add(instruction, itemOptions);
                break;
            }

            case 'list': {
                isFirstToken = false;
                // Convert list items to instructions
                const listInstructionContent = token.items.map((item: any) => `- ${item.text}`).join('\n');
                const listInstruction: T = createWeighted<T>(listInstructionContent, itemOptions);
                const currentSection = sectionStack[sectionStack.length - 1];
                currentSection.add(listInstruction, itemOptions);
                break;
            }

            case 'code': {
                isFirstToken = false;
                // Represent code blocks as instructions
                const codeInstruction: T = createWeighted<T>(`\`\`\`${token.lang || ''}\n${token.text}\n\`\`\``, itemOptions);
                const currentSection = sectionStack[sectionStack.length - 1];
                currentSection.add(codeInstruction, itemOptions);
                break;
            }

            case 'space':
                // Usually ignore space tokens between block elements
                break;

            default: {
                isFirstToken = false;
                // Treat other block tokens' text as instructions for robustness
                if ('text' in token && token.text) {
                    const fallbackInstruction: T = createWeighted<T>(token.text, itemOptions);
                    const currentSection = sectionStack[sectionStack.length - 1];
                    currentSection.add(fallbackInstruction, itemOptions);
                }
                break;
            }
        }
    }
    return mainSection;
}
