import * as fs from 'fs/promises';
import { convertToSection } from '../../src/items/section';
import { FormatOptions, Formatter } from '../../src/riotprompt';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const __dirname = import.meta.dirname;

describe('Markdown Parser Integration Test', () => {

    const testFormatWithFiles = async (expectedFilePath: string, jsonFilePath: string, options: Partial<FormatOptions> = {}) => {
        // 2. Read the expected JSON file content
        const parsedJsonString = await fs.readFile(jsonFilePath, 'utf-8');
        const parsedJson = JSON.parse(parsedJsonString);
        const parsedSection = convertToSection(parsedJson);


        const formatter = Formatter.create({ formatOptions: options as FormatOptions });
        const formattedSection = formatter.format(parsedSection);

        const expectedString = await fs.readFile(expectedFilePath, 'utf-8');

        // Check first section (Initial Test with simple text)
        expect(formattedSection).toEqual(expectedString);

    }

    it('format the section in test1.json and compare with the expected output in test1.txt', async () => {
        await testFormatWithFiles(path.join(__dirname, 'test1.txt'), path.join(__dirname, 'test1.json'));
    });

    it('format the section in test1.json and compare with the expected output in test1.md', async () => {
        await testFormatWithFiles(path.join(__dirname, 'test1.md'), path.join(__dirname, 'test1.json'), { sectionSeparator: "markdown" });
    });


    it('format the section in test2.json and compare with the expected output in test2.txt', async () => {
        await testFormatWithFiles(path.join(__dirname, 'test2.txt'), path.join(__dirname, 'test2.json'));
    });

    it('format the section in test2.json and compare with the expected output in test2.md', async () => {
        await testFormatWithFiles(path.join(__dirname, 'test2.md'), path.join(__dirname, 'test2.json'), { sectionSeparator: "markdown" });
    });

    it('format the section in test3.json and compare with the expected output in test3.txt', async () => {
        await testFormatWithFiles(path.join(__dirname, 'test3.txt'), path.join(__dirname, 'test3.json'));
    });

    it('format the section in test3.json and compare with the expected output in test3.md', async () => {
        await testFormatWithFiles(path.join(__dirname, 'test3.md'), path.join(__dirname, 'test3.json'), { sectionSeparator: "markdown", sectionDepth: 1 });
    });

});
