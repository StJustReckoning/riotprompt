import { ConversationBuilder, type ConversationMessage, type ToolCall } from "./conversation";
import { ToolRegistry, type Tool } from "./tools";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { MetricsCollector, ReflectionReportGenerator, type ReflectionReport, type ReflectionConfig } from "./reflection";

// ===== TYPE DEFINITIONS =====

/**
 * Tool usage policy for a phase
 */
export type ToolUsagePolicy = 'required' | 'encouraged' | 'optional' | 'forbidden';

/**
 * LLM client interface (generic, provider-agnostic)
 */
export interface LLMClient {
    complete(messages: ConversationMessage[], tools?: any[]): Promise<{
        content: string | null;
        tool_calls?: ToolCall[];
    }>;
}

/**
 * Context provided to strategy execution
 */
export interface StrategyContext {
    conversation: ConversationBuilder;
    tools: ToolRegistry;
    llm: LLMClient;
    state: StrategyState;
}

/**
 * Current state of strategy execution
 */
export interface StrategyState {
    phase: string | number;
    iteration: number;
    toolCallsExecuted: number;
    startTime: number;
    insights: Insight[];
    findings: any[];
    errors: Error[];
    toolFailures: Map<string, number>;  // Track consecutive failures per tool
    [key: string]: any;
}

/**
 * Insight discovered during execution
 */
export interface Insight {
    source: string;
    content: string;
    confidence: number;
    relatedTo?: string[];
}

/**
 * Result of tool execution
 */
export interface ToolResult {
    callId: string;
    toolName: string;
    result: any;
    error?: Error;
    duration: number;
}

/**
 * Action to take after iteration
 */
export type IterationAction = 'continue' | 'stop' | 'next-phase';

/**
 * Action to take for tool call
 */
export type ToolCallAction = 'execute' | 'skip' | 'defer';

/**
 * Result of a phase
 */
export interface PhaseResult {
    name: string;
    iterations: number;
    toolCalls: number;
    success: boolean;
    insights?: Insight[];
}

/**
 * Final strategy result
 */
export interface StrategyResult {
    finalMessage: ConversationMessage | undefined;
    phases: PhaseResult[];
    totalIterations: number;
    toolCallsExecuted: number;
    duration: number;
    success: boolean;
    conversation: ConversationBuilder;
    reflection?: ReflectionReport;
}

/**
 * Configuration for a strategy phase
 */
export interface StrategyPhase {
    name: string;
    maxIterations: number;
    toolUsage: ToolUsagePolicy;
    allowedTools?: string[];
    minToolCalls?: number;
    maxToolCalls?: number;
    instructions?: string;
    earlyExit?: boolean;
    requireFinalAnswer?: boolean;
    adaptiveDepth?: boolean;
    maxConsecutiveToolFailures?: number;  // Circuit breaker threshold (default: 3)
    continueIf?: (state: StrategyState) => boolean;
    skipIf?: (state: StrategyState) => boolean;
}

/**
 * Iteration strategy interface
 */
export interface IterationStrategy {
    name: string;
    description: string;
    maxIterations: number;
    maxToolCalls?: number;
    timeoutMs?: number;
    phases?: StrategyPhase[];

    // Lifecycle hooks
    onStart?: (context: StrategyContext) => Promise<void>;
    onIteration?: (iteration: number, state: StrategyState) => Promise<IterationAction>;
    onToolCall?: (toolCall: ToolCall, state: StrategyState) => Promise<ToolCallAction>;
    onToolResult?: (result: ToolResult, state: StrategyState) => Promise<void>;
    onPhaseComplete?: (phase: PhaseResult, state: StrategyState) => Promise<void>;
    onComplete?: (result: StrategyResult) => Promise<void>;

    // Decision logic
    shouldContinue?: (state: StrategyState) => boolean;
    shouldCallTool?: (tool: Tool, state: StrategyState) => boolean;
    selectTools?: (available: Tool[], state: StrategyState) => Tool[];
}

// ===== STRATEGY EXECUTOR =====

/**
 * StrategyExecutor executes iteration strategies.
 *
 * Features:
 * - Execute multi-phase strategies
 * - Manage tool calls and results
 * - Track state and metrics
 * - Handle timeouts and errors
 * - Provide lifecycle hooks
 *
 * @example
 * ```typescript
 * const executor = new StrategyExecutor(llmClient);
 *
 * const result = await executor.execute(
 *   conversation,
 *   toolRegistry,
 *   strategy
 * );
 *
 * console.log('Completed in', result.totalIterations, 'iterations');
 * console.log('Used', result.toolCallsExecuted, 'tools');
 * ```
 */
export class StrategyExecutor {
    private llm: LLMClient;
    private logger: any;
    private metricsCollector?: MetricsCollector;
    private reflectionConfig?: ReflectionConfig;

    constructor(llm: LLMClient, logger?: any) {
        this.llm = llm;
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'StrategyExecutor');
    }

    /**
     * Enable reflection generation
     */
    withReflection(config: ReflectionConfig): this {
        this.reflectionConfig = config;
        return this;
    }

    /**
     * Execute a strategy
     */
    async execute(
        conversation: ConversationBuilder,
        tools: ToolRegistry,
        strategy: IterationStrategy
    ): Promise<StrategyResult> {
        const startTime = Date.now();

        // Initialize metrics collector if reflection enabled
        if (this.reflectionConfig?.enabled) {
            this.metricsCollector = new MetricsCollector(this.logger);
        }

        const state: StrategyState = {
            phase: 0,
            iteration: 0,
            toolCallsExecuted: 0,
            startTime,
            insights: [],
            findings: [],
            errors: [],
            toolFailures: new Map<string, number>(),
        };

        this.logger.info('Starting strategy execution', { strategy: strategy.name });

        const context: StrategyContext = { conversation, tools, llm: this.llm, state };

        try {
            // Initialize
            await strategy.onStart?.(context);

            // Execute phases or single loop
            const phases = strategy.phases || [
                {
                    name: 'default',
                    maxIterations: strategy.maxIterations,
                    toolUsage: 'encouraged' as ToolUsagePolicy,
                }
            ];

            const phaseResults: PhaseResult[] = [];

            for (const phase of phases) {
                // Check if should skip phase
                if (phase.skipIf?.(state)) {
                    this.logger.debug('Skipping phase', { phase: phase.name });
                    continue;
                }

                state.phase = phase.name;
                state.iteration = 0;

                this.logger.debug('Starting phase', { phase: phase.name });

                const phaseResult = await this.executePhase(
                    conversation,
                    tools,
                    phase,
                    state,
                    strategy
                );

                phaseResults.push(phaseResult);

                await strategy.onPhaseComplete?.(phaseResult, state);

                // Check if should continue
                if (strategy.shouldContinue && !strategy.shouldContinue(state)) {
                    this.logger.debug('Strategy decided to stop');
                    break;
                }
            }

            const duration = Date.now() - startTime;

            const result: StrategyResult = {
                finalMessage: conversation.getLastMessage(),
                phases: phaseResults,
                totalIterations: state.iteration,
                toolCallsExecuted: state.toolCallsExecuted,
                duration,
                success: true,
                conversation,
            };

            // Generate reflection if enabled
            if (this.metricsCollector && this.reflectionConfig?.enabled) {
                const metrics = this.metricsCollector.getMetrics(
                    conversation.getMessages(),
                    conversation.getMetadata().model
                );

                const generator = new ReflectionReportGenerator(this.logger);
                result.reflection = generator.generate(metrics, result);

                // Save reflection if output path specified
                if (this.reflectionConfig.outputPath && result.reflection) {
                    await this.saveReflection(result.reflection, this.reflectionConfig);
                }
            }

            await strategy.onComplete?.(result);

            this.logger.info('Strategy execution complete', {
                iterations: result.totalIterations,
                toolCalls: result.toolCallsExecuted,
                duration
            });

            return result;

        } catch (error) {
            this.logger.error('Strategy execution failed', { error });

            return {
                finalMessage: conversation.getLastMessage(),
                phases: [],
                totalIterations: state.iteration,
                toolCallsExecuted: state.toolCallsExecuted,
                duration: Date.now() - startTime,
                success: false,
                conversation,
            };
        }
    }

    /**
     * Save reflection report
     */
    private async saveReflection(
        reflection: ReflectionReport,
        config: ReflectionConfig
    ): Promise<void> {
        if (!config.outputPath) {
            return;
        }

        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `reflection-${timestamp}.${config.format === 'json' ? 'json' : 'md'}`;
            const fullPath = path.join(config.outputPath, filename);

            // Ensure directory exists
            await fs.mkdir(config.outputPath, { recursive: true });

            // Save based on format
            if (config.format === 'json') {
                await fs.writeFile(fullPath, JSON.stringify(reflection, null, 2), 'utf-8');
            } else {
                const generator = new ReflectionReportGenerator(this.logger);
                const markdown = generator.formatMarkdown(reflection);
                await fs.writeFile(fullPath, markdown, 'utf-8');
            }

            this.logger.info('Reflection saved', { path: fullPath });
        } catch (error) {
            this.logger.error('Failed to save reflection', { error });
        }
    }

    /**
     * Execute a single phase
     */
    private async executePhase(
        conversation: ConversationBuilder,
        tools: ToolRegistry,
        phase: StrategyPhase,
        state: StrategyState,
        strategy: IterationStrategy
    ): Promise<PhaseResult> {
        const phaseStartTools = state.toolCallsExecuted;

        // Add phase instructions if provided
        if (phase.instructions) {
            conversation.asUser(phase.instructions);
        }

        // Iteration loop for this phase
        for (let i = 0; i < phase.maxIterations; i++) {
            state.iteration++;

            // Track iteration for metrics
            if (this.metricsCollector) {
                this.metricsCollector.incrementIteration();
            }

            this.logger.debug('Iteration', { phase: phase.name, iteration: i + 1 });

            // Check iteration hook
            const action = await strategy.onIteration?.(i, state);
            if (action === 'stop') {
                break;
            }
            if (action === 'next-phase') {
                break;
            }

            // Get LLM response
            const toolsToProvide = phase.toolUsage !== 'forbidden' ? tools.toOpenAIFormat() : undefined;
            const response = await this.llm.complete(
                conversation.toMessages(),
                toolsToProvide
            );

            // Handle tool calls
            if (response.tool_calls && response.tool_calls.length > 0) {
                if (phase.toolUsage === 'forbidden') {
                    this.logger.warn('Tool calls requested but forbidden in this phase');
                    conversation.asAssistant(response.content);
                    continue;
                }

                conversation.asAssistant(response.content, response.tool_calls);

                // Execute tools
                for (const toolCall of response.tool_calls) {
                    // Check if tool is allowed in this phase
                    if (phase.allowedTools && !phase.allowedTools.includes(toolCall.function.name)) {
                        this.logger.debug('Tool not allowed in phase', { tool: toolCall.function.name });
                        continue;
                    }

                    // Circuit breaker: Check if tool has exceeded failure threshold
                    const maxFailures = phase.maxConsecutiveToolFailures ?? 3;
                    const consecutiveFailures = state.toolFailures.get(toolCall.function.name) || 0;
                    if (consecutiveFailures >= maxFailures) {
                        this.logger.warn('Tool circuit breaker triggered', {
                            tool: toolCall.function.name,
                            failures: consecutiveFailures
                        });
                        conversation.asTool(toolCall.id, {
                            error: `Tool temporarily disabled due to ${consecutiveFailures} consecutive failures`
                        }, {
                            success: false,
                            circuitBreakerTriggered: true
                        });
                        continue;
                    }

                    // Check tool call hook
                    const toolAction = await strategy.onToolCall?.(toolCall, state);
                    if (toolAction === 'skip') {
                        continue;
                    }

                    // Execute tool
                    const toolStart = Date.now();
                    try {
                        // Parse tool arguments with error handling
                        let toolArgs: any;
                        try {
                            toolArgs = JSON.parse(toolCall.function.arguments);
                        } catch (parseError) {
                            const error = new Error(
                                `Invalid JSON in tool arguments for ${toolCall.function.name}: ${
                                    parseError instanceof Error ? parseError.message : String(parseError)
                                }`
                            );
                            if (parseError instanceof Error) {
                                (error as any).cause = parseError; // Preserve original error
                            }
                            throw error;
                        }

                        const result = await tools.execute(
                            toolCall.function.name,
                            toolArgs
                        );

                        const toolDuration = Date.now() - toolStart;

                        const toolResult: ToolResult = {
                            callId: toolCall.id,
                            toolName: toolCall.function.name,
                            result,
                            duration: toolDuration,
                        };

                        conversation.asTool(toolCall.id, result, {
                            duration: toolDuration,
                            success: true
                        });

                        state.toolCallsExecuted++;

                        // Reset failure counter on success
                        state.toolFailures.set(toolCall.function.name, 0);

                        // Record metrics
                        if (this.metricsCollector) {
                            this.metricsCollector.recordToolCall(
                                toolCall.function.name,
                                state.iteration,
                                toolDuration,
                                true
                            );
                        }

                        await strategy.onToolResult?.(toolResult, state);

                    } catch (error) {
                        this.logger.error('Tool execution failed', { tool: toolCall.function.name, error });

                        const toolDuration = Date.now() - toolStart;

                        const toolResult: ToolResult = {
                            callId: toolCall.id,
                            toolName: toolCall.function.name,
                            result: null,
                            error: error as Error,
                            duration: toolDuration,
                        };

                        conversation.asTool(toolCall.id, {
                            error: (error as Error).message
                        }, {
                            success: false,
                            errorName: (error as Error).name
                        });

                        state.errors.push(error as Error);

                        // Increment failure counter for circuit breaker
                        const failures = (state.toolFailures.get(toolCall.function.name) || 0) + 1;
                        state.toolFailures.set(toolCall.function.name, failures);

                        // Record metrics
                        if (this.metricsCollector) {
                            this.metricsCollector.recordToolCall(
                                toolCall.function.name,
                                state.iteration,
                                toolDuration,
                                false,
                                (error as Error).message
                            );
                        }

                        await strategy.onToolResult?.(toolResult, state);
                    }
                }

            } else {
                // No tool calls - add response and potentially end phase
                conversation.asAssistant(response.content);

                // Check if this phase requires tool calls
                if (phase.toolUsage === 'required' && state.toolCallsExecuted === phaseStartTools) {
                    this.logger.warn('No tools used but required in phase');
                    // Continue to try again
                } else if (phase.earlyExit !== false) {
                    // Exit phase early if we got a response without tools
                    break;
                }
            }

            // Check phase completion conditions
            const toolCallsInPhase = state.toolCallsExecuted - phaseStartTools;

            if (phase.minToolCalls && toolCallsInPhase < phase.minToolCalls) {
                continue;  // Need more tool calls
            }

            if (phase.maxToolCalls && toolCallsInPhase >= phase.maxToolCalls) {
                break;  // Hit max tool calls for phase
            }

            if (phase.continueIf && !phase.continueIf(state)) {
                break;  // Condition not met
            }
        }

        return {
            name: phase.name,
            iterations: state.iteration,
            toolCalls: state.toolCallsExecuted - phaseStartTools,
            success: true,
            insights: state.insights,
        };
    }
}

// ===== PRE-BUILT STRATEGIES =====

/**
 * Factory for creating iteration strategies
 */
export class IterationStrategyFactory {
    /**
     * Investigate then respond strategy
     * Phase 1: Use tools to gather information
     * Phase 2: Synthesize into final answer
     */
    static investigateThenRespond(config: {
        maxInvestigationSteps?: number;
        requireMinimumTools?: number;
        finalSynthesis?: boolean;
    } = {}): IterationStrategy {
        const {
            maxInvestigationSteps = 5,
            requireMinimumTools = 1,
            finalSynthesis = true,
        } = config;

        return {
            name: 'investigate-then-respond',
            description: 'Investigate using tools, then synthesize findings',
            maxIterations: maxInvestigationSteps + (finalSynthesis ? 1 : 0),
            phases: [
                {
                    name: 'investigate',
                    maxIterations: maxInvestigationSteps,
                    toolUsage: 'encouraged',
                    minToolCalls: requireMinimumTools,
                    earlyExit: false,
                },
                ...(finalSynthesis ? [{
                    name: 'respond',
                    maxIterations: 1,
                    toolUsage: 'forbidden' as ToolUsagePolicy,
                    instructions: 'Based on your investigation, provide a comprehensive answer.',
                    requireFinalAnswer: true,
                }] : []),
            ],
        };
    }

    /**
     * Multi-pass refinement strategy
     * Generate, critique, refine repeatedly
     */
    static multiPassRefinement(config: {
        passes?: number;
        critiqueBetweenPasses?: boolean;
        improvementThreshold?: number;
    } = {}): IterationStrategy {
        const {
            passes = 3,
            critiqueBetweenPasses = true,
        } = config;

        const phases: StrategyPhase[] = [];

        for (let i = 0; i < passes; i++) {
            phases.push({
                name: `pass-${i + 1}`,
                maxIterations: 1,
                toolUsage: 'optional',
                instructions: i === 0
                    ? 'Generate your best response'
                    : 'Refine your previous response based on the critique',
            });

            if (critiqueBetweenPasses && i < passes - 1) {
                phases.push({
                    name: `critique-${i + 1}`,
                    maxIterations: 1,
                    toolUsage: 'forbidden',
                    instructions: 'Critique the previous response. What can be improved?',
                });
            }
        }

        return {
            name: 'multi-pass-refinement',
            description: 'Iteratively refine response through multiple passes',
            maxIterations: passes * 2,
            phases,
        };
    }

    /**
     * Breadth-first investigation
     * Explore broadly before going deep
     */
    static breadthFirst(config: {
        levelsDeep?: number;
        toolsPerLevel?: number;
    } = {}): IterationStrategy {
        const {
            levelsDeep = 3,
            toolsPerLevel = 4,
        } = config;

        const phases: StrategyPhase[] = [];

        for (let level = 0; level < levelsDeep; level++) {
            phases.push({
                name: `level-${level + 1}`,
                maxIterations: toolsPerLevel,
                toolUsage: 'encouraged',
                minToolCalls: 1,
                maxToolCalls: toolsPerLevel,
                instructions: level === 0
                    ? 'Get a broad overview'
                    : `Dive deeper into areas discovered in level ${level}`,
            });
        }

        return {
            name: 'breadth-first',
            description: 'Explore broadly at each level before going deeper',
            maxIterations: levelsDeep * toolsPerLevel,
            phases,
        };
    }

    /**
     * Depth-first investigation
     * Deep dive immediately
     */
    static depthFirst(config: {
        maxDepth?: number;
        backtrackOnFailure?: boolean;
    } = {}): IterationStrategy {
        const {
            maxDepth = 5,
            backtrackOnFailure = true,
        } = config;

        return {
            name: 'depth-first',
            description: 'Deep dive investigation path',
            maxIterations: maxDepth,
            phases: [{
                name: 'deep-dive',
                maxIterations: maxDepth,
                toolUsage: 'encouraged',
                adaptiveDepth: true,
            }],
            shouldContinue: (state) => {
                // Continue if making progress
                if (backtrackOnFailure && state.errors.length > 2) {
                    return false;
                }
                return true;
            },
        };
    }

    /**
     * Adaptive strategy
     * Changes behavior based on progress
     */
    static adaptive(_config: {
        strategies?: IterationStrategy[];
        switchConditions?: Array<{
            when: (state: StrategyState) => boolean;
            switchTo: number;
        }>;
    } = {}): IterationStrategy {
        return {
            name: 'adaptive',
            description: 'Adapts strategy based on progress',
            maxIterations: 20,
            onIteration: async (iteration, state) => {
                // Change behavior based on iteration count
                if (iteration < 5) {
                    // Early: broad exploration
                    return 'continue';
                } else if (iteration < 15) {
                    // Mid: focused investigation
                    return 'continue';
                } else {
                    // Late: wrap up
                    return state.toolCallsExecuted > 0 ? 'continue' : 'stop';
                }
            },
        };
    }

    /**
     * Simple iteration (basic tool-use loop)
     */
    static simple(config: {
        maxIterations?: number;
        allowTools?: boolean;
    } = {}): IterationStrategy {
        const {
            maxIterations = 10,
            allowTools = true,
        } = config;

        return {
            name: 'simple',
            description: 'Simple iteration loop',
            maxIterations,
            phases: [{
                name: 'main',
                maxIterations,
                toolUsage: allowTools ? 'encouraged' : 'forbidden',
                earlyExit: true,
            }],
        };
    }
}

export default IterationStrategyFactory;

