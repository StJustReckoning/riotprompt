import { DEFAULT_CHARACTER_ENCODING } from "../constants";

// Heuristic to check for Markdown syntax. This is not a full parser.
// It looks for common Markdown patterns.
const markdownRegex = /^(#+\s|\*\s|-\s|\+\s|>\s|\[.*\]\(.*\)|```|~~~|---\\s*$)/m;

/**
 * Inspects a string to see if it likely contains Markdown syntax.
 *
 * @param input The string or Buffer content to inspect.
 * @returns True if Markdown syntax is suspected, false otherwise.
 */
export function isMarkdown(input: string | Buffer): boolean {
    if (input == null) {
        return false;
    }
    // Convert Buffer to string if necessary
    const content = typeof input === 'string' ? input : input.toString(DEFAULT_CHARACTER_ENCODING);
    if (!content || content.trim() === '') {
        return false; // Empty string is not considered Markdown
    }

    // Check for common Markdown patterns in the entire content
    if (markdownRegex.test(content)) {
        return true;
    }

    // Fallback: Check for a high prevalence of Markdown-like list/header starters
    // or thematic breaks, or code blocks.
    // We'll consider up to the first ~2000 characters, roughly equivalent to the byte check.
    const effectiveContent = content.length > 2000 ? content.substring(0, 2000) : content;
    const lines = effectiveContent.split('\n');
    let markdownFeatureCount = 0;
    const featurePatterns = [
        /^#+\s+.+/,      // Headers (e.g., # Heading)
        /^\s*[*+-]\s+.+/, // List items (e.g., * item, - item, + item)
        /^\s*>\s+.+/,      // Blockquotes (e.g., > quote)
        /\[.+\]\(.+\)/,   // Links (e.g., [text](url))
        /!\[.+\]\(.+\)/,  // Images (e.g., ![alt](src))
        /`{1,3}[^`]+`{1,3}/, // Inline code (e.g., `code`) or code blocks (```code```)
        /^\s*_{3,}\s*$/,  // Thematic breaks (e.g., ---, ***, ___)
        /^\s*-{3,}\s*$/,
        /^\s*\*{3,}\s*$/
    ];

    for (const line of lines) {
        // Stop checking if we have already found enough features to be confident.
        // This is a small optimization for very long inputs that are clearly markdown early on.
        if (markdownFeatureCount >= 2 && lines.length > 10) { // Heuristic threshold
            const significantLineCountEarly = Math.min(lines.indexOf(line) + 1, 20);
            if (significantLineCountEarly > 0 && markdownFeatureCount / significantLineCountEarly > 0.1) {
                return true;
            }
        }

        for (const pattern of featurePatterns) {
            if (pattern.test(line.trim())) {
                markdownFeatureCount++;
                break; // Count each line only once
            }
        }
    }

    // If more than 5% of the first few lines (up to 20 lines or all lines if fewer)
    // show markdown features, or if there are at least 2 distinct features in short texts,
    // consider it Markdown.
    const significantLineCount = Math.min(lines.length, 20);
    if (significantLineCount > 0) {
        // Calculate the exact threshold percentage
        const thresholdPercentage = markdownFeatureCount / significantLineCount;

        // Check against the 5% threshold (0.05)
        // Using >= 0.05 exactly matches 5%, > 0.05 requires more than 5%
        if (thresholdPercentage >= 0.05 + 0.0001) { // Adding a small epsilon to ensure exactly 5% passes but just below fails
            return true;
        }

        // Other conditions for returning true
        if ((markdownFeatureCount >= 1 && significantLineCount <= 5) || markdownFeatureCount >= 2) {
            return true;
        }
    }

    return false;
}

// Example usage (optional, for testing):
// function testIsMarkdownString() {
//   console.log('--- Testing isMarkdownString ---');
//   const markdown1 = '# Hello World\\nThis is a test.';
//   console.log(`Test 1 (Header): "${markdown1.substring(0,10)}..." -> ${isMarkdownString(markdown1)}`); // true

//   const markdown2 = '* Item 1\\n* Item 2';
//   console.log(`Test 2 (List): "${markdown2.substring(0,10)}..." -> ${isMarkdownString(markdown2)}`); // true

//   const markdown3 = '[Google](https://google.com)';
//   console.log(`Test 3 (Link): "${markdown3.substring(0,15)}..." -> ${isMarkdownString(markdown3)}`); // true

//   const markdown4 = '> This is a quote.';
//   console.log(`Test 4 (Blockquote): "${markdown4.substring(0,10)}..." -> ${isMarkdownString(markdown4)}`); // true

//   const markdown5 = '```javascript\\nconsole.log("hello");\\n```';
//   console.log(`Test 5 (Code block): "${markdown5.substring(0,15)}..." -> ${isMarkdownString(markdown5)}`); // true

//   const text1 = 'This is a plain text string.';
//   console.log(`Test 6 (Plain text): "${text1.substring(0,10)}..." -> ${isMarkdownString(text1)}`); // false

//   const text2 = 'hello_world.this_is_a_test_string_with_underscores_but_not_markdown_thematic_break';
//   console.log(`Test 7 (Long non-markdown): "${text2.substring(0,10)}..." -> ${isMarkdownString(text2)}`); // false

//   const text3 = '<xml><tag>value</tag></xml>';
//   console.log(`Test 8 (XML): "${text3.substring(0,10)}..." -> ${isMarkdownString(text3)}`); // false

//   const shortMarkdown = '# H';
//   console.log(`Test 9 (Short Markdown): "${shortMarkdown}" -> ${isMarkdownString(shortMarkdown)}`); // true

//   const shortNonMarkdown = 'Hello';
//   console.log(`Test 10 (Short Non-Markdown): "${shortNonMarkdown}" -> ${isMarkdownString(shortNonMarkdown)}`); // false

//   const emptyString = '';
//   console.log(`Test 11 (Empty string): "" -> ${isMarkdownString(emptyString)}`); // false

//   const whitespaceString = '   \t \n  ';
//   console.log(`Test 12 (Whitespace string): "${whitespaceString.substring(0,5)}..." -> ${isMarkdownString(whitespaceString)}`); // false

//   const markdownWithManyFeatures = `# Title\\n\\n* list\\n* list2\\n\\n> quote here\\n\\n\`\`\`\\ncode\\n\`\`\`\\n\\nnormal text paragraph with a [link](url).\n---\nAnother paragraph.\nThis is just a test string to see how it performs with multiple markdown features present.\nHello world this is a very long line that does not contain any markdown syntax at all, it is just plain text that goes on and on.\n* Another list item\n* And another one\n# Another Header\n## Subheader\nThis is fun.\nOkay I think this is enough.\nFinal line.\nAnother final line.\nOne more for good measure.\nOkay that should be enough lines to test the early exit.\n`;
//   console.log(`Test 13 (Many Features): "${markdownWithManyFeatures.substring(0,10)}..." -> ${isMarkdownString(markdownWithManyFeatures)}`); // true

//   const htmlLike = '<div><p>Hello</p><ul><li>item</li></ul></div>';
//   console.log(`Test 14 (HTML-like): "${htmlLike.substring(0,10)}..." -> ${isMarkdownString(htmlLike)}`); // false

//   console.log('--- End Testing ---');
// }

// testIsMarkdownString();
