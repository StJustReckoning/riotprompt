import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { Weighted } from '../../src/items/weighted'; // Assuming Weighted is in src/items/
import { create } from '../../src/parser'; // Assuming parser is in src/

const __dirname = import.meta.dirname;

describe('Markdown Parser Integration Test', () => {

    const testParseWithFiles = async (markdownFilePath: string, jsonFilePath: string) => {
        // 1. Read and parse the Markdown file using the parser
        const parser = create();
        const parsedData = await parser.parseFile<Weighted>(markdownFilePath);
        // Create a plain data version by serializing and parsing to remove potential methods
        const plainParsedData = JSON.parse(JSON.stringify(parsedData));

        // 2. Read the expected JSON file content
        const expectedJsonString = await fs.readFile(jsonFilePath, 'utf-8');

        // 3. Parse the expected JSON string into an object
        const expectedJsonObject = JSON.parse(expectedJsonString);

        // Check first section (Initial Test with simple text)
        expect(plainParsedData).toMatchObject(expectedJsonObject);

    }

    it('should parse test1.md and match the structure in test1.json', async () => {
        await testParseWithFiles(path.join(__dirname, 'test1.md'), path.join(__dirname, 'test1.json'));
    });

    it('should parse test2.md and match the structure in test2.json', async () => {
        await testParseWithFiles(path.join(__dirname, 'test2.md'), path.join(__dirname, 'test2.json'));
    });

    it('should parse test3.md and match the structure in test3.json', async () => {
        await testParseWithFiles(path.join(__dirname, 'test3.md'), path.join(__dirname, 'test3.json'));
    });

});
