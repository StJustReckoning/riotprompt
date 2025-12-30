import { XMLParser } from "fast-xml-parser";
import { Prompt, create as createPrompt } from "./prompt";
import { Section, create as createSection } from "./items/section";
import { Instruction } from "./items/instruction";
import { Context } from "./items/context";
import { Content } from "./items/content";
import { Weighted } from "./items/weighted";

export const toJSON = (prompt: Prompt): string => {
    return JSON.stringify(prompt, null, 2);
}

const escapeXML = (str: string): string => {
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

const itemToXML = (item: any): string => {
    if (typeof item === 'string') {
        return `<item>${escapeXML(item)}</item>`;
    }
    
    // Check if it's a section
    if (item && typeof item === 'object' && 'items' in item) {
        return sectionToXML(item);
    }

    // Check if it's a weighted item
    if (item && typeof item === 'object' && 'text' in item) {
        const weightAttr = (item.weight !== undefined && item.weight !== null) ? ` weight="${item.weight}"` : '';
        return `<item${weightAttr}>${escapeXML(item.text)}</item>`;
    }

    return '';
}

const sectionToXML = (section: any, tagName: string = 'section'): string => {
    const titleAttr = section.title ? ` title="${escapeXML(section.title)}"` : '';
    const weightAttr = section.weight ? ` weight="${section.weight}"` : '';
    
    let xml = `<${tagName}${titleAttr}${weightAttr}>`;
    
    if (section.items && Array.isArray(section.items)) {
        xml += section.items.map((item: any) => itemToXML(item)).join('');
    }
    
    xml += `</${tagName}>`;
    return xml;
}

export const toXML = (prompt: Prompt): string => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<prompt>';

    if (prompt.persona) {
        xml += sectionToXML(prompt.persona, 'persona');
    }

    if (prompt.instructions) {
        xml += sectionToXML(prompt.instructions, 'instructions');
    }

    if (prompt.contents) {
        xml += sectionToXML(prompt.contents, 'contents');
    }

    if (prompt.contexts) {
        xml += sectionToXML(prompt.contexts, 'contexts');
    }

    xml += '</prompt>';
    return xml;
}

// ============================================================================
// DESERIALIZATION
// ============================================================================

// --- JSON Parsing ---

const parseSectionFromJSON = <T extends Weighted>(jsonSection: any): Section<T> => {
    if (!jsonSection || !jsonSection.items) {
        throw new Error("Invalid section structure");
    }

    const section = createSection<T>({
        title: jsonSection.title,
        weight: jsonSection.weight
    });

    for (const item of jsonSection.items) {
        if (typeof item === 'object' && 'items' in item) {
            // It's a nested section
            section.add(parseSectionFromJSON<T>(item));
        } else if (typeof item === 'object' && 'text' in item) {
            section.add({
                text: item.text,
                weight: item.weight
            } as T);
        } else if (typeof item === 'string') {
            section.add(item);
        }
    }

    return section;
}

export const fromJSON = (jsonString: string): Prompt => {
    const json = JSON.parse(jsonString);
    
    // We treat the root json object as matching Prompt interface
    // But we need to convert plain objects back to Section instances with methods
    
    const persona = json.persona ? parseSectionFromJSON<Instruction>(json.persona) : undefined;
    const instructions = json.instructions ? parseSectionFromJSON<Instruction>(json.instructions) : createSection<Instruction>({ title: 'Instructions' });
    
    const contents = json.contents ? parseSectionFromJSON<Content>(json.contents) : undefined;
    const contexts = json.contexts ? parseSectionFromJSON<Context>(json.contexts) : undefined;

    return createPrompt({
        persona,
        instructions,
        contents,
        contexts
    });
}

// --- XML Parsing ---

const parseNodeToSection = <T extends Weighted>(node: any): Section<T> => {
    // Node structure with preserveOrder: true
    // It seems attributes can be a sibling property ":@" OR inside the children array depending on version/config/content.
    
    // Children are in the array value of the key "section", "persona", etc.
    const children = node.section || node.persona || node.instructions || node.contents || node.contexts || [];
    
    let attributes = node[":@"] || {};
    
    // Fallback: check if attributes are inside the children array (as seen in some tests/mocks)
    if (!node[":@"] && Array.isArray(children)) {
        for (const child of children) {
            if (child[":@"]) {
                attributes = child[":@"];
                break;
            }
        }
    }

    const title = attributes["@_title"];
    const weight = attributes["@_weight"] ? Number(attributes["@_weight"]) : undefined;
    
    const section = createSection<T>({ title, weight });
    
    if (Array.isArray(children)) {
        for (const child of children) {
            const key = Object.keys(child)[0]; // "item" or "section" or ":@"
            // console.log(`Processing child key: ${key}`);
            if (key === ":@") continue; // Already handled or just attributes
             
            if (key === "item") {
                // Item structure: [ { "#text": "Value" }, { ":@": ... } ]
                const itemContent = child.item;
                let text = "";
                let itemWeight = undefined;
                 
                for (const part of itemContent) {
                    const keys = Object.keys(part);
                    // console.log('Processing item part keys:', keys);
                    if (keys.includes("#text")) {
                        text = part["#text"];
                    } else if (keys.includes(":@")) {
                        const attrs = part[":@"];
                        // console.log('Found attributes:', attrs);
                        // Check both with and without prefix just in case
                        const w = attrs["@_weight"] || attrs["weight"];
                        if (w !== undefined) itemWeight = Number(w);
                    } else {
                        // Fallback for cases where attributes might be directly on the part (unexpected but possible)
                        const w = part["@_weight"] || part["weight"];
                        if (w !== undefined) itemWeight = Number(w);
                    }
                }
                // console.log(`Adding item: ${text}`);
                section.add({ text, weight: itemWeight } as T);
            } else if (key === "section") {
                section.add(parseNodeToSection<T>(child));
            }
        }
    }
    
    return section;
}

export const fromXML = (xmlString: string): Prompt => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        preserveOrder: true,
        trimValues: true
    });

    const parsed = parser.parse(xmlString);
    // parsed is [ { "?xml": ... }, { "prompt": [ ... ] } ]

    let promptNode = null;
    for (const node of parsed) {
        if (node.prompt) {
            promptNode = node.prompt;
            break;
        }
    }

    if (!promptNode) throw new Error("Invalid XML: missing <prompt> root");

    let persona: Section<Instruction> | undefined;
    let instructions: Section<Instruction> = createSection({ title: "Instructions" });
    let contents: Section<Content> | undefined;
    let contexts: Section<Context> | undefined;

    for (const child of promptNode) {
        if (child.persona) {
            persona = parseNodeToSection<Instruction>(child);
            persona.title = "Persona"; // Force title for standard sections?
        } else if (child.instructions) {
            instructions = parseNodeToSection<Instruction>(child);
            instructions.title = "Instructions";
        } else if (child.contents) {
            contents = parseNodeToSection<Content>(child);
            contents.title = "Contents";
        } else if (child.contexts) {
            contexts = parseNodeToSection<Context>(child);
            contexts.title = "Contexts";
        }
    }

    return createPrompt({
        persona,
        instructions,
        contents,
        contexts
    });
}
