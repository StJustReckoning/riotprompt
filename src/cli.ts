#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config';
import { Command } from 'commander';
import { create as createConfig } from '@theunwalked/cardigantime';
import { ConfigSchema } from './config';
import * as RiotPrompt from './riotprompt';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

// Initialize Cardigantime configuration
const configManager = createConfig({
    configShape: ConfigSchema.shape,
    defaults: {
        configDirectory: process.cwd(),
        configFile: 'riotprompt.yaml'
    }
});

program
    .name('riotprompt')
    .description('CLI tool for analyzing and processing prompts')
    .version('0.0.1');

export async function isDirectory(path: string): Promise<boolean> {
    try {
        const stat = await fs.stat(path);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

export async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

export async function loadPromptFromDirectory(absolutePromptPath: string): Promise<RiotPrompt.Prompt> {
    let personaSection: RiotPrompt.Section<RiotPrompt.Instruction> | undefined;
    let instructionsSection: RiotPrompt.Section<RiotPrompt.Instruction> | undefined;
    let contextSection: RiotPrompt.Section<RiotPrompt.Context> | undefined;

    const loader = RiotPrompt.Loader.create();

    // 1. Load Persona
    const personaDir = path.join(absolutePromptPath, 'persona');
    const personaFile = path.join(absolutePromptPath, 'persona.md');

    if (await isDirectory(personaDir)) {
        console.log('Loading persona from directory...');
        const personaSections = await loader.load([personaDir]);
        if (personaSections.length > 0) {
            personaSection = RiotPrompt.createSection({ title: 'Persona' });
            personaSections.forEach(section => {
                personaSection!.add(section as any);
            });
        }
    } else if (await fileExists(personaFile)) {
        console.log('Loading persona from file...');
        const personaContent = await fs.readFile(personaFile, 'utf-8');
        personaSection = RiotPrompt.createSection({ title: 'Persona' });
        personaSection.add(RiotPrompt.createInstruction(personaContent));
    } else {
        console.log('No persona found, skipping.');
    }

    // 2. Load Instructions
    const instructionsDir = path.join(absolutePromptPath, 'instructions');
    const instructionsFile = path.join(absolutePromptPath, 'instructions.md');

    if (await isDirectory(instructionsDir)) {
        console.log('Loading instructions from directory...');
        const instructionSections = await loader.load([instructionsDir]);
        if (instructionSections.length > 0) {
            instructionsSection = RiotPrompt.createSection({ title: 'Instructions' });
            instructionSections.forEach(section => {
                instructionsSection!.add(section as any);
            });
        }
    } else if (await fileExists(instructionsFile)) {
        console.log('Loading instructions from file...');
        const instructionsContent = await fs.readFile(instructionsFile, 'utf-8');
        instructionsSection = RiotPrompt.createSection({ title: 'Instructions' });
        instructionsSection.add(RiotPrompt.createInstruction(instructionsContent));
    }

    if (!instructionsSection) {
        throw new Error('instructions (directory or .md file) is required.');
    }

    // 3. Load Context
    const contextDir = path.join(absolutePromptPath, 'context');
    if (await isDirectory(contextDir)) {
        console.log('Loading context from directory...');
        const contextSections = await loader.load([contextDir]);
        
        if (contextSections.length > 0) {
            contextSection = RiotPrompt.createSection({ title: 'Context' });
            contextSections.forEach(section => {
                contextSection!.add(section as any); 
            });
        }
    } else {
        console.log('No context directory found, skipping context.');
    }

    // Build Prompt
    return RiotPrompt.createPrompt({
        persona: personaSection,
        instructions: instructionsSection,
        contexts: contextSection
    });
}

export async function createAction(promptName: string, options: any) {
    try {
        const basePath = path.resolve(options.path, promptName);

        if (await fileExists(basePath)) {
            console.error(`Error: Directory ${basePath} already exists.`);
            process.exit(1);
        }

        if (options.import) {
            // Import Mode
            console.log(`Importing prompt from ${options.import} to ${basePath}...`);
            const content = await fs.readFile(options.import, 'utf-8');
            let prompt: RiotPrompt.Prompt;

            if (options.import.endsWith('.json')) {
                prompt = RiotPrompt.Serializer.fromJSON(content);
            } else if (options.import.endsWith('.xml')) {
                prompt = RiotPrompt.Serializer.fromXML(content);
            } else {
                throw new Error("Unsupported file extension. Use .json or .xml");
            }

            await RiotPrompt.Writer.saveToDirectory(prompt, basePath);
            console.log(`Successfully imported to ${basePath}`);
        } else {
            // Scaffold Mode
            console.log(`Creating prompt structure at ${basePath}...`);

            // Create main directory
            await fs.mkdir(basePath, { recursive: true });

            // Create persona.md
            const personaText = options.persona || 'You are a helpful AI assistant.';
            await fs.writeFile(path.join(basePath, 'persona.md'), personaText);
            console.log('Created persona.md');

            // Create instructions.md
            const instructionsText = options.instructions || 'Please analyze the following request.';
            await fs.writeFile(path.join(basePath, 'instructions.md'), instructionsText);
            console.log('Created instructions.md');

            // Create context directory if requested
            if (options.context) {
                const contextDir = path.join(basePath, 'context');
                await fs.mkdir(contextDir);
                await fs.writeFile(path.join(contextDir, 'README.md'), 'Place context files (json, md, txt) in this directory.');
                console.log('Created context directory');
            }

            console.log(`\nPrompt '${promptName}' created successfully!`);
        }
        console.log(`Run 'riotprompt process ${path.join(options.path, promptName)}' to test it.`);

    } catch (error) {
        console.error('Error creating prompt:', error);
        process.exit(1);
    }
}

export async function processAction(promptPath: string, options: any) {
    try {
        // Load configuration
        const config = await configManager.read(options);
        const modelName = options.model || config.defaultModel;

        console.log(`Processing prompt from: ${promptPath}`);
        console.log(`Using model: ${modelName}`);

        const absolutePromptPath = path.resolve(promptPath);
        
        if (!await fileExists(absolutePromptPath)) {
            console.error(`Error: Prompt path not found at ${absolutePromptPath}`);
            process.exit(1);
        }

        let prompt: RiotPrompt.Prompt;

        if (await isDirectory(absolutePromptPath)) {
            prompt = await loadPromptFromDirectory(absolutePromptPath);
        } else {
            // It's a file
            const content = await fs.readFile(absolutePromptPath, 'utf-8');
            if (absolutePromptPath.endsWith('.json')) {
                prompt = RiotPrompt.Serializer.fromJSON(content);
            } else if (absolutePromptPath.endsWith('.xml')) {
                prompt = RiotPrompt.Serializer.fromXML(content);
            } else {
                console.error('Error: Supported file formats are .json and .xml');
                process.exit(1);
            }
        }

        let output = '';

        if (options.format === 'json') {
            output = RiotPrompt.Serializer.toJSON(prompt);
        } else if (options.format === 'xml') {
            output = RiotPrompt.Serializer.toXML(prompt);
        } else {
            // Configure Model
            const model = modelName as RiotPrompt.Model;

            // Format
            const formatter = RiotPrompt.Formatter.create();
            const chatRequest = formatter.formatPrompt(model, prompt);

            // Simple representation of the chat request
            if (chatRequest.messages) {
                output = chatRequest.messages.map(m => `--- ROLE: ${m.role} ---\n${m.content}`).join('\n\n');
            } else {
                output = JSON.stringify(chatRequest, null, 2);
            }
        }

        if (options.output) {
            await fs.writeFile(options.output, output);
            console.log(`Output written to ${options.output}`);
        } else {
            console.log('\n--- Result ---\n');
            console.log(output);
        }

    } catch (error) {
        console.error('Error processing prompt:', error);
        process.exit(1);
    }
}

export async function executeAction(promptPath: string, options: any) {
    try {
        // Load configuration
        const config = await configManager.read(options);
        const modelName = options.model || config.defaultModel;

        console.log(`Executing prompt from: ${promptPath}`);
        console.log(`Using model: ${modelName}`);

        const absolutePromptPath = path.resolve(promptPath);
        
        if (!await fileExists(absolutePromptPath)) {
            console.error(`Error: Prompt path not found at ${absolutePromptPath}`);
            process.exit(1);
        }

        let prompt: RiotPrompt.Prompt;

        if (await isDirectory(absolutePromptPath)) {
            prompt = await loadPromptFromDirectory(absolutePromptPath);
        } else {
            // It's a file
            const content = await fs.readFile(absolutePromptPath, 'utf-8');
            if (absolutePromptPath.endsWith('.json')) {
                prompt = RiotPrompt.Serializer.fromJSON(content);
            } else if (absolutePromptPath.endsWith('.xml')) {
                prompt = RiotPrompt.Serializer.fromXML(content);
            } else {
                console.error('Error: Supported file formats are .json and .xml');
                process.exit(1);
            }
        }

        // Format the prompt for the model
        const formatter = RiotPrompt.Formatter.create();
        const chatRequest = formatter.formatPrompt(modelName as RiotPrompt.Model, prompt);

        // Execute
        const executionOptions: RiotPrompt.Execution.ExecutionOptions = {
            apiKey: options.key,
            model: modelName,
            temperature: options.temperature,
            maxTokens: options.maxTokens
        };

        const result = await RiotPrompt.Execution.execute(chatRequest, executionOptions);

        console.log('\n--- Response ---\n');
        console.log(result.content);
        
        if (result.usage) {
            console.log('\n--- Usage ---');
            console.log(`Input Tokens: ${result.usage.inputTokens}`);
            console.log(`Output Tokens: ${result.usage.outputTokens}`);
        }

    } catch (error: any) {
        console.error('Error executing prompt:', error.message || error);
        process.exit(1);
    }
}

// Integrate Cardigantime with Commander
export async function main() {
    await configManager.configure(program);

    program
        .command('create <promptName>')
        .description('Create a new prompt directory structure or import from file')
        .option('-p, --path <path>', 'Base path to create the prompt in', '.')
        .option('--persona <text>', 'Initial text for persona.md')
        .option('--instructions <text>', 'Initial text for instructions.md')
        .option('--context', 'Create context directory with placeholder', true)
        .option('--no-context', 'Do not create context directory')
        .option('--import <file>', 'Import prompt structure from a JSON or XML file')
        .action(createAction);

    program
        .command('process <promptPath>')
        .description('Process a prompt (directory, JSON, or XML) and output the formatted prompt')
        .option('-m, --model <model>', 'Model to format for (e.g., gpt-4, claude)')
        .option('-o, --output <file>', 'Output file path')
        .option('--format <format>', 'Output format (text, json, xml)', 'text')
        .action(processAction);

    program
        .command('execute <promptPath>')
        .description('Execute a prompt using an LLM provider')
        .option('-m, --model <model>', 'Model to use (e.g., gpt-4, claude-3-opus, gemini-1.5-pro)')
        .option('-k, --key <key>', 'API Key (overrides env vars)')
        .option('-t, --temperature <number>', 'Temperature (0-1)', parseFloat)
        .option('--max-tokens <number>', 'Max tokens', parseInt)
        .action(executeAction);

    await program.parseAsync();
}

/* v8 ignore start */
// ESM entry point - only run when executed directly, not when imported for testing
// Check if we're running as a CLI (process.argv[1] contains 'cli' and not 'vitest')
const isRunningAsCLI = process.argv[1] && 
    (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('cli.ts')) &&
    !process.argv[1].includes('vitest') &&
    !process.argv[1].includes('node_modules');

if (isRunningAsCLI) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
/* v8 ignore end */
