import * as fs from 'fs/promises';
import * as path from 'path';
import { Prompt } from './prompt';
import { Section } from './items/section';
import { Weighted } from './items/weighted';

export const saveToDirectory = async (prompt: Prompt, basePath: string) => {
    // Ensure base directory exists
    await fs.mkdir(basePath, { recursive: true });

    // 1. Save Persona
    if (prompt.persona) {
        await saveSection(prompt.persona, path.join(basePath, 'persona'));
    }

    // 2. Save Instructions
    if (prompt.instructions) {
        await saveSection(prompt.instructions, path.join(basePath, 'instructions'));
    }

    // 3. Save Context
    if (prompt.contexts) {
        await saveSection(prompt.contexts, path.join(basePath, 'context'));
    }

    // 4. Save Content (if any)
    if (prompt.contents) {
        await saveSection(prompt.contents, path.join(basePath, 'content'));
    }
}

const saveSection = async (section: Section<Weighted>, targetPath: string) => {
    // If section has subsections, create a directory and recurse
    // If section only has items, check if we can save as single file (e.g. name of section + .md)
    
    // Simplification: We will use a mixed approach.
    // If the section is "flat" (only items), we can write it to a file.
    // If the section is "nested" (has subsections), we create a directory.
    
    // However, to be consistent with Loader logic:
    // Loader reads files in a directory as subsections.
    // So if we have a section "Instructions", and we save it as a directory "instructions":
    // Its items become content of files?
    
    // Strategy:
    // 1. Create directory `targetPath`.
    // 2. If the section has items (text), verify if they have titles (subsections).
    // 3. For each item:
    //    - If it's a string/Instruction/Content/Context (leaf):
    //      - If the parent section is the ROOT (e.g. 'persona'), and it's just text, maybe we prefer `persona.md`.
    //    - If it's a subsection:
    //      - Recurse into subdirectory.

    // Let's refine based on typical usage:
    // - Persona: usually one big text. -> `persona.md`
    // - Instructions: usually one big text or list of files. -> `instructions.md` or `instructions/part1.md`
    // - Context: usually list of files. -> `context/data.json`, `context/info.md`
    
    // We need to differentiate based on the targetPath provided by caller.
    // If targetPath ends in "persona" (directory name), we can choose to write `targetPath.md` instead if it's flat.
    
    // But `saveToDirectory` created `basePath/persona` (directory path string).
    
    // Let's check complexity:
    const hasSubsections = section.items.some(item => 
        typeof item === 'object' && 'items' in item
    );

    if (!hasSubsections) {
        // Flat section. 
        // If it has multiple items, we can join them? Or write as numbered files?
        // Usually, a flat section implies content for a single file.
        // We prefer to write to `targetPath.md`.
        const content = section.items.map(item => {
            if (typeof item === 'string') return item;
            return (item as Weighted).text;
        }).join('\n\n');
        
        // Check if we should write to .md file instead of directory
        // targetPath is e.g. ".../persona". We want ".../persona.md".
        await fs.writeFile(`${targetPath}.md`, content);
        return;
    }

    // Nested section
    await fs.mkdir(targetPath, { recursive: true });

    for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        
        if (typeof item === 'object' && 'items' in item) {
            // Subsection
            // Use title as filename/dirname
            const subTitle = (item as Section<Weighted>).title || `part-${i + 1}`;
            const subPath = path.join(targetPath, subTitle);
            await saveSection(item as Section<Weighted>, subPath);
        } else {
            // Leaf item mixed with subsections.
            // Write to a file. 
            // If it's just text, we need a filename.
            const fileName = `item-${i + 1}.md`;
            const content = typeof item === 'string' ? item : (item as Weighted).text;
            await fs.writeFile(path.join(targetPath, fileName), content);
        }
    }
}

