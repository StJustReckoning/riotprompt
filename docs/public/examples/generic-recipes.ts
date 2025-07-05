/**
 * Generic Recipes System Examples
 * 
 * This demonstrates how to use the new generic recipes system
 * to create any type of prompt without hardcoded assumptions.
 */

import { cook, registerTemplates, recipe } from '../src/riotprompt';
import path from 'path';

const basePath = path.join(__dirname, '../examples');

// ===== EXAMPLE 1: Simple Prompt Creation =====

export const createSimplePrompt = async () => {
    const prompt = await cook({
        basePath,
        persona: { content: 'You are a helpful AI assistant' },
        instructions: [
            { content: 'Analyze the provided information carefully' },
            { content: 'Provide clear, actionable insights' },
        ],
        content: [
            { content: 'Sample data to analyze', title: 'Data', weight: 1.0 },
        ],
        context: [
            { content: 'This is a demonstration example', title: 'Context' },
        ],
    });

    return prompt;
};

// ===== EXAMPLE 2: Template-Based Approach =====

export const createTemplatedPrompts = async () => {
    // First, register some templates
    registerTemplates({
        'dataAnalysis': {
            persona: { content: 'You are a data scientist with expertise in statistical analysis' },
            instructions: [
                { content: 'Examine the dataset for patterns, trends, and anomalies' },
                { content: 'Provide statistical summaries and visualizations' },
                { content: 'Suggest actionable insights based on your findings' },
            ],
        },
        'codeReview': {
            persona: { content: 'You are a senior software engineer' },
            instructions: [
                { content: 'Review the code for quality, performance, and maintainability' },
                { content: 'Identify potential bugs or security issues' },
                { content: 'Suggest improvements with specific examples' },
            ],
        },
        'contentCreation': {
            persona: { content: 'You are a professional writer and content strategist' },
            instructions: [
                { content: 'Create engaging, well-structured content' },
                { content: 'Adapt tone and style to the target audience' },
                { content: 'Ensure content is informative and actionable' },
            ],
        },
    });

    // Use the templates
    const dataAnalysisPrompt = await cook({
        basePath,
        template: 'dataAnalysis',
        content: [
            { content: 'CSV data with sales figures', title: 'Sales Data', weight: 1.0 },
            { content: 'Q1 2024 performance metrics', title: 'Metrics', weight: 0.8 },
        ],
    });

    const codeReviewPrompt = await cook({
        basePath,
        template: 'codeReview',
        content: [
            { content: 'function calculateTotal(items) { ... }', title: 'Source Code' },
        ],
        context: [
            { content: 'E-commerce checkout system', title: 'System Context' },
        ],
    });

    return { dataAnalysisPrompt, codeReviewPrompt };
};

// ===== EXAMPLE 3: Fluent Builder Pattern =====

export const createFluentPrompts = async () => {
    // Using template with fluent builder
    const analysisPrompt = await recipe(basePath)
        .template('dataAnalysis')
        .with({
            content: [
                { content: 'Sample dataset', title: 'Dataset' },
            ],
            context: [
                { content: 'Business context', title: 'Context' },
            ],
        });

    // Building from scratch with fluent builder
    const customPrompt = await recipe(basePath)
        .persona({ content: 'You are an expert consultant' })
        .instructions(
            'Analyze the business problem thoroughly',
            'Provide strategic recommendations',
            'Consider both short-term and long-term implications'
        )
        .content({ content: 'Business problem description', title: 'Problem' })
        .context({ content: 'Market conditions and constraints', title: 'Context' })
        .cook();

    return { analysisPrompt, customPrompt };
};

// ===== EXAMPLE 4: File-Based Content =====

export const createFileBasedPrompt = async () => {
    const prompt = await cook({
        basePath,
        persona: { path: 'personas/expert-advisor.md' },
        instructions: [
            { path: 'instructions/analysis-guidelines.md' },
            { content: 'Focus on practical recommendations' },
        ],
        content: [
            { path: 'data/sample-report.txt', title: 'Report', weight: 1.0 },
            { directories: ['examples/'], title: 'Examples', weight: 0.5 },
        ],
        context: [
            { path: 'context/industry-background.md', title: 'Industry Context' },
        ],
    });

    return prompt;
};

// ===== EXAMPLE 5: Override System =====

export const createPromptWithOverrides = async () => {
    const prompt = await cook({
        basePath,
        overridePaths: [
            './project-overrides',    // Project-specific overrides
            '~/personal-overrides',   // Personal customizations
            './global-overrides'      // Global defaults
        ],
        overrides: true,
        template: 'dataAnalysis',
        content: [
            { content: 'Production dataset', title: 'Data' },
        ],
    });

    return prompt;
};

// ===== EXAMPLE 6: Domain-Specific Workflow =====

export const createDomainSpecificWorkflow = async () => {
    // You can create your own domain-specific templates
    registerTemplates({
        'legalReview': {
            persona: { content: 'You are a legal expert specializing in contract review' },
            instructions: [
                { content: 'Review all clauses for potential legal issues' },
                { content: 'Identify areas of concern or ambiguity' },
                { content: 'Suggest specific language improvements' },
            ],
        },
        'medicalConsultation': {
            persona: { content: 'You are a medical professional providing consultation' },
            instructions: [
                { content: 'Analyze symptoms and medical history carefully' },
                { content: 'Consider differential diagnoses' },
                { content: 'Recommend appropriate next steps' },
            ],
        },
        'financialAnalysis': {
            persona: { content: 'You are a financial analyst' },
            instructions: [
                { content: 'Analyze financial statements and ratios' },
                { content: 'Identify trends and potential risks' },
                { content: 'Provide investment recommendations' },
            ],
        },
    });

    // Use domain-specific templates
    const legalPrompt = await cook({
        basePath,
        template: 'legalReview',
        content: [
            { content: 'Contract terms and conditions', title: 'Contract' },
        ],
    });

    return legalPrompt;
};

// ===== EXAMPLE 7: Dynamic Template Generation =====

export const createDynamicTemplates = async () => {
    // Templates can be generated dynamically based on user input
    const createAnalysisTemplate = (domain: string, expertise: string) => {
        return {
            persona: { content: `You are an expert in ${domain} with ${expertise}` },
            instructions: [
                { content: `Analyze the ${domain} data thoroughly` },
                { content: `Apply ${expertise} principles to your analysis` },
                { content: 'Provide actionable recommendations' },
            ],
        };
    };

    // Register dynamic templates
    registerTemplates({
        'marketingAnalysis': createAnalysisTemplate('marketing', 'consumer behavior and analytics'),
        'techAnalysis': createAnalysisTemplate('technology', 'software architecture and performance'),
        'hrAnalysis': createAnalysisTemplate('human resources', 'organizational psychology'),
    });

    const marketingPrompt = await cook({
        basePath,
        template: 'marketingAnalysis',
        content: [
            { content: 'Campaign performance data', title: 'Campaign Data' },
        ],
    });

    return marketingPrompt;
};

// ===== USAGE EXAMPLE =====

export const demonstrateGenericRecipes = async () => {
    console.log('=== Generic Recipes System Demo ===\n');

    // Simple prompt
    const simple = await createSimplePrompt();
    console.log('Simple prompt created:', simple.instructions.items.length, 'instructions');

    // Template-based prompts
    const templated = await createTemplatedPrompts();
    console.log('Template-based prompts created');

    // Fluent builder prompts
    const fluent = await createFluentPrompts();
    console.log('Fluent builder prompts created');

    // File-based prompt (would work if files exist)
    try {
        const fileBased = await createFileBasedPrompt();
        console.log('File-based prompt created');
    } catch (error) {
        console.log('File-based prompt failed (expected - files may not exist)');
    }

    // Domain-specific workflow
    const domainSpecific = await createDomainSpecificWorkflow();
    console.log('Domain-specific prompt created');

    // Dynamic templates
    const dynamic = await createDynamicTemplates();
    console.log('Dynamic template prompt created');

    console.log('\n=== Demo Complete ===');
};

// Run the demo if this file is executed directly
if (require.main === module) {
    demonstrateGenericRecipes().catch(console.error);
} 