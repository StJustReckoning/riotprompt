import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import type { ConversationMessage } from "./conversation";
import type { StrategyResult } from "./iteration-strategy";
import { TokenCounter } from "./token-budget";
import { Model } from "./chat";

// ===== TYPE DEFINITIONS =====

/**
 * Tool execution metric for a single call
 */
export interface ToolExecutionMetric {
    name: string;
    iteration: number;
    timestamp: string;
    duration: number;
    success: boolean;
    error?: string;
    inputSize?: number;
    outputSize?: number;
}

/**
 * Aggregated statistics for a tool
 */
export interface ToolStats {
    name: string;
    total: number;
    success: number;
    failures: number;
    totalDuration: number;
    avgDuration: number;
    successRate: number;
}

/**
 * Token usage metrics
 */
export interface TokenUsageMetrics {
    total: number;
    systemPrompt: number;
    userContent: number;
    toolResults: number;
    conversation: number;
    percentage?: number;
    budget?: number;
}

/**
 * Complete execution metrics
 */
export interface AgenticExecutionMetrics {
    startTime: Date;
    endTime?: Date;
    totalDuration: number;
    iterations: number;
    toolCallsExecuted: number;
    toolMetrics: ToolExecutionMetric[];
    toolStats: Map<string, ToolStats>;
    messageCount: number;
    tokenUsage?: TokenUsageMetrics;
    investigationDepth: 'shallow' | 'moderate' | 'deep';
    toolDiversity: number;
    iterationEfficiency: number;
}

/**
 * Recommendation type
 */
export type RecommendationType =
    | 'tool-failure'
    | 'performance'
    | 'investigation-depth'
    | 'token-budget'
    | 'strategy-adjustment'
    | 'quality-issue';

/**
 * Recommendation from analysis
 */
export interface Recommendation {
    type: RecommendationType;
    severity: 'high' | 'medium' | 'low';
    message: string;
    suggestion?: string;
    relatedTools?: string[];
    relatedMetrics?: any;
}

/**
 * Tool effectiveness analysis
 */
export interface ToolEffectivenessAnalysis {
    overallSuccessRate: number;
    toolStats: Map<string, ToolStats>;
    failedTools: Array<{ name: string; failures: number; rate: number }>;
    slowTools: Array<{ name: string; avgDuration: number }>;
    mostUsedTools: Array<{ name: string; count: number }>;
}

/**
 * Performance insights
 */
export interface PerformanceInsights {
    totalDuration: number;
    avgIterationDuration: number;
    slowestTool?: { name: string; duration: number };
    fastestTool?: { name: string; duration: number };
    bottlenecks: string[];
}

/**
 * Timeline event
 */
export interface TimelineEvent {
    timestamp: string;
    iteration: number;
    type: 'message' | 'tool-call' | 'tool-result';
    description: string;
    duration?: number;
    success?: boolean;
}

/**
 * Quality assessment
 */
export interface QualityAssessment {
    investigationDepth: 'shallow' | 'moderate' | 'deep';
    toolDiversity: number;
    iterationEfficiency: number;
    coverage: number;
    overall: number;  // 0-1
}

/**
 * Complete reflection report
 */
export interface ReflectionReport {
    id: string;
    generated: Date;
    summary: {
        startTime: Date;
        endTime: Date;
        totalDuration: number;
        iterations: number;
        toolCallsExecuted: number;
        uniqueToolsUsed: number;
        successRate: number;
    };
    toolEffectiveness: ToolEffectivenessAnalysis;
    performanceInsights: PerformanceInsights;
    timeline: TimelineEvent[];
    tokenUsage?: TokenUsageMetrics;
    qualityAssessment: QualityAssessment;
    recommendations: Recommendation[];
    conversationHistory?: ConversationMessage[];
    output?: string;
}

/**
 * Reflection configuration
 */
export interface ReflectionConfig {
    enabled: boolean;
    outputPath?: string;
    format?: 'markdown' | 'json' | 'html';
    includeConversation?: boolean;
    includeRecommendations?: boolean;
    sections?: ReflectionSection[];
}

export type ReflectionSection =
    | 'summary'
    | 'tool-effectiveness'
    | 'performance'
    | 'timeline'
    | 'token-usage'
    | 'quality-assessment'
    | 'recommendations'
    | 'conversation'
    | 'output';

// ===== METRICS COLLECTOR =====

/**
 * MetricsCollector gathers execution metrics during agentic execution.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 *
 * collector.recordToolCall('read_file', iteration, duration, true);
 * collector.recordToolCall('search_code', iteration, duration, false, error);
 *
 * const metrics = collector.getMetrics(messages);
 * ```
 */
export class MetricsCollector {
    private startTime: Date;
    private toolMetrics: ToolExecutionMetric[];
    private iterationCount: number;
    private logger: any;

    constructor(logger?: any) {
        this.startTime = new Date();
        this.toolMetrics = [];
        this.iterationCount = 0;
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'MetricsCollector');
    }

    /**
     * Record a tool execution
     */
    recordToolCall(
        name: string,
        iteration: number,
        duration: number,
        success: boolean,
        error?: string,
        inputSize?: number,
        outputSize?: number
    ): void {
        this.toolMetrics.push({
            name,
            iteration,
            timestamp: new Date().toISOString(),
            duration,
            success,
            error,
            inputSize,
            outputSize,
        });
    }

    /**
     * Increment iteration count
     */
    incrementIteration(): void {
        this.iterationCount++;
    }

    /**
     * Get complete metrics
     */
    getMetrics(messages: ConversationMessage[], model?: Model): AgenticExecutionMetrics {
        const endTime = new Date();
        const totalDuration = endTime.getTime() - this.startTime.getTime();

        // Calculate tool statistics
        const toolStats = this.calculateToolStats();

        // Count unique tools
        const uniqueTools = new Set(this.toolMetrics.map(m => m.name));

        // Calculate investigation depth
        const totalTools = this.toolMetrics.length;
        const investigationDepth: 'shallow' | 'moderate' | 'deep' =
            totalTools < 3 ? 'shallow' :
                totalTools < 8 ? 'moderate' : 'deep';

        // Calculate iteration efficiency
        const iterationEfficiency = this.iterationCount > 0
            ? totalTools / this.iterationCount
            : 0;

        // Calculate token usage if model provided
        let tokenUsage: TokenUsageMetrics | undefined;
        if (model) {
            let counter: TokenCounter | undefined;
            try {
                counter = new TokenCounter(model);
                const total = counter.countConversation(messages);

                tokenUsage = {
                    total,
                    systemPrompt: 0,  // Could be calculated by filtering messages
                    userContent: 0,
                    toolResults: 0,
                    conversation: total,
                };
            } catch (error) {
                this.logger.warn('Could not calculate token usage', { error });
            } finally {
                // Always dispose of the counter to prevent resource leaks
                counter?.dispose();
            }
        }

        return {
            startTime: this.startTime,
            endTime,
            totalDuration,
            iterations: this.iterationCount,
            toolCallsExecuted: this.toolMetrics.length,
            toolMetrics: this.toolMetrics,
            toolStats,
            messageCount: messages.length,
            tokenUsage,
            investigationDepth,
            toolDiversity: uniqueTools.size,
            iterationEfficiency,
        };
    }

    /**
     * Calculate aggregated tool statistics
     */
    private calculateToolStats(): Map<string, ToolStats> {
        const stats = new Map<string, ToolStats>();

        // Group by tool name
        const byTool = new Map<string, ToolExecutionMetric[]>();
        for (const metric of this.toolMetrics) {
            if (!byTool.has(metric.name)) {
                byTool.set(metric.name, []);
            }
            byTool.get(metric.name)!.push(metric);
        }

        // Calculate stats for each tool
        for (const [name, metrics] of byTool) {
            const total = metrics.length;
            const success = metrics.filter(m => m.success).length;
            const failures = total - success;
            const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
            const avgDuration = totalDuration / total;
            const successRate = total > 0 ? success / total : 0;

            stats.set(name, {
                name,
                total,
                success,
                failures,
                totalDuration,
                avgDuration,
                successRate,
            });
        }

        return stats;
    }
}

// ===== REFLECTION REPORT GENERATOR =====

/**
 * ReflectionReportGenerator generates analysis reports from execution metrics.
 *
 * @example
 * ```typescript
 * const generator = new ReflectionReportGenerator();
 * const report = generator.generate(metrics, result);
 *
 * console.log('Success rate:', report.toolEffectiveness.overallSuccessRate);
 * console.log('Recommendations:', report.recommendations.length);
 * ```
 */
export class ReflectionReportGenerator {
    private logger: any;

    constructor(logger?: any) {
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'ReflectionReportGenerator');
    }

    /**
     * Generate reflection report
     */
    generate(
        metrics: AgenticExecutionMetrics,
        result: StrategyResult
    ): ReflectionReport {
        this.logger.debug('Generating reflection report');

        const report: ReflectionReport = {
            id: `reflection-${Date.now()}`,
            generated: new Date(),
            summary: this.generateSummary(metrics),
            toolEffectiveness: this.analyzeToolEffectiveness(metrics),
            performanceInsights: this.analyzePerformance(metrics),
            timeline: this.buildTimeline(metrics),
            tokenUsage: metrics.tokenUsage,
            qualityAssessment: this.assessQuality(metrics),
            recommendations: this.generateRecommendations(metrics, result),
            conversationHistory: result.conversation.getMessages(),
            output: result.finalMessage?.content || undefined,
        };

        this.logger.info('Generated reflection report', {
            recommendations: report.recommendations.length,
            toolsAnalyzed: metrics.toolStats.size
        });

        return report;
    }

    /**
     * Generate execution summary
     */
    private generateSummary(metrics: AgenticExecutionMetrics) {
        const successfulTools = metrics.toolMetrics.filter(m => m.success).length;
        const successRate = metrics.toolMetrics.length > 0
            ? successfulTools / metrics.toolMetrics.length
            : 0;

        return {
            startTime: metrics.startTime,
            endTime: metrics.endTime || new Date(),
            totalDuration: metrics.totalDuration,
            iterations: metrics.iterations,
            toolCallsExecuted: metrics.toolCallsExecuted,
            uniqueToolsUsed: metrics.toolDiversity,
            successRate,
        };
    }

    /**
     * Analyze tool effectiveness
     */
    private analyzeToolEffectiveness(metrics: AgenticExecutionMetrics): ToolEffectivenessAnalysis {
        const successfulTools = metrics.toolMetrics.filter(m => m.success).length;
        const overallSuccessRate = metrics.toolMetrics.length > 0
            ? successfulTools / metrics.toolMetrics.length
            : 1;

        // Find failed tools
        const failedTools = Array.from(metrics.toolStats.values())
            .filter(stats => stats.failures > 0)
            .map(stats => ({
                name: stats.name,
                failures: stats.failures,
                rate: stats.successRate
            }))
            .sort((a, b) => b.failures - a.failures);

        // Find slow tools (>1s average)
        const slowTools = Array.from(metrics.toolStats.values())
            .filter(stats => stats.avgDuration > 1000)
            .map(stats => ({
                name: stats.name,
                avgDuration: stats.avgDuration
            }))
            .sort((a, b) => b.avgDuration - a.avgDuration);

        // Most used tools
        const mostUsedTools = Array.from(metrics.toolStats.values())
            .map(stats => ({
                name: stats.name,
                count: stats.total
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            overallSuccessRate,
            toolStats: metrics.toolStats,
            failedTools,
            slowTools,
            mostUsedTools,
        };
    }

    /**
     * Analyze performance
     */
    private analyzePerformance(metrics: AgenticExecutionMetrics): PerformanceInsights {
        const avgIterationDuration = metrics.iterations > 0
            ? metrics.totalDuration / metrics.iterations
            : 0;

        // Find slowest and fastest tools
        const toolsBySpeed = Array.from(metrics.toolStats.values())
            .sort((a, b) => b.avgDuration - a.avgDuration);

        const slowestTool = toolsBySpeed[0]
            ? { name: toolsBySpeed[0].name, duration: toolsBySpeed[0].avgDuration }
            : undefined;

        const fastestTool = toolsBySpeed[toolsBySpeed.length - 1]
            ? { name: toolsBySpeed[toolsBySpeed.length - 1].name, duration: toolsBySpeed[toolsBySpeed.length - 1].avgDuration }
            : undefined;

        // Identify bottlenecks
        const bottlenecks: string[] = [];
        if (slowestTool && slowestTool.duration > 1000) {
            bottlenecks.push(`${slowestTool.name} averaging ${slowestTool.duration}ms`);
        }
        if (avgIterationDuration > 10000) {
            bottlenecks.push(`Slow iterations averaging ${avgIterationDuration.toFixed(0)}ms`);
        }

        return {
            totalDuration: metrics.totalDuration,
            avgIterationDuration,
            slowestTool,
            fastestTool,
            bottlenecks,
        };
    }

    /**
     * Build execution timeline
     */
    private buildTimeline(metrics: AgenticExecutionMetrics): TimelineEvent[] {
        const events: TimelineEvent[] = [];

        for (const metric of metrics.toolMetrics) {
            events.push({
                timestamp: metric.timestamp,
                iteration: metric.iteration,
                type: 'tool-call',
                description: `${metric.name}(${metric.success ? 'success' : 'failure'})`,
                duration: metric.duration,
                success: metric.success,
            });
        }

        return events.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    /**
     * Assess investigation quality
     */
    private assessQuality(metrics: AgenticExecutionMetrics): QualityAssessment {
        const toolDiversity = metrics.toolDiversity;
        const iterationEfficiency = metrics.iterationEfficiency;

        // Calculate coverage (tools / iterations - aim for 1-2)
        const coverage = metrics.iterations > 0
            ? Math.min(1, metrics.toolCallsExecuted / (metrics.iterations * 2))
            : 0;

        // Overall quality score (0-1)
        const depthScore = metrics.investigationDepth === 'deep' ? 1 :
            metrics.investigationDepth === 'moderate' ? 0.7 : 0.3;
        const diversityScore = Math.min(1, toolDiversity / 5);  // 5+ tools = max score
        const efficiencyScore = Math.min(1, iterationEfficiency / 2);  // 2 tools/iteration = max

        const overall = (depthScore + diversityScore + efficiencyScore) / 3;

        return {
            investigationDepth: metrics.investigationDepth,
            toolDiversity,
            iterationEfficiency,
            coverage,
            overall,
        };
    }

    /**
     * Generate recommendations
     */
    private generateRecommendations(
        metrics: AgenticExecutionMetrics,
        _result: StrategyResult
    ): Recommendation[] {
        const recommendations: Recommendation[] = [];

        // Check for tool failures
        const failedTools = Array.from(metrics.toolStats.values())
            .filter(stats => stats.failures > 0);

        if (failedTools.length > 0) {
            recommendations.push({
                type: 'tool-failure',
                severity: 'high',
                message: `${failedTools.length} tool(s) had failures. Review tool implementations.`,
                suggestion: 'Check error logs and validate tool parameters',
                relatedTools: failedTools.map(t => t.name),
            });
        }

        // Check for shallow investigation
        if (metrics.investigationDepth === 'shallow' && metrics.toolCallsExecuted < 2) {
            recommendations.push({
                type: 'investigation-depth',
                severity: 'medium',
                message: 'Investigation was shallow. Consider adjusting strategy to encourage more tool usage.',
                suggestion: 'Use investigateThenRespond strategy with requireMinimumTools',
            });
        }

        // Check for slow tools
        const slowTools = Array.from(metrics.toolStats.values())
            .filter(stats => stats.avgDuration > 1000);

        if (slowTools.length > 0) {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: `${slowTools.length} tool(s) taking >1s. Consider optimization.`,
                suggestion: 'Add caching, reduce scope, or optimize implementations',
                relatedTools: slowTools.map(t => t.name),
            });
        }

        // Check token usage
        if (metrics.tokenUsage) {
            if (metrics.tokenUsage.percentage && metrics.tokenUsage.percentage > 80) {
                recommendations.push({
                    type: 'token-budget',
                    severity: 'high',
                    message: `Token usage at ${metrics.tokenUsage.percentage.toFixed(1)}%. Increase budget or enable compression.`,
                    suggestion: 'Increase max tokens or use priority-based compression',
                });
            }
        }

        return recommendations;
    }

    /**
     * Format report as markdown
     */
    formatMarkdown(report: ReflectionReport): string {
        let markdown = `# Agentic Execution - Self-Reflection Report\n\n`;
        markdown += `**Generated:** ${report.generated.toISOString()}\n`;
        markdown += `**Duration:** ${(report.summary.totalDuration / 1000).toFixed(1)}s\n\n`;

        markdown += `## Execution Summary\n\n`;
        markdown += `- **Iterations**: ${report.summary.iterations}\n`;
        markdown += `- **Tool Calls**: ${report.summary.toolCallsExecuted}\n`;
        markdown += `- **Unique Tools**: ${report.summary.uniqueToolsUsed}\n`;
        markdown += `- **Investigation Depth**: ${report.qualityAssessment.investigationDepth}\n`;
        markdown += `- **Success Rate**: ${(report.summary.successRate * 100).toFixed(1)}%\n\n`;

        markdown += `## Tool Effectiveness Analysis\n\n`;
        markdown += `| Tool | Calls | Success | Failures | Success Rate | Avg Duration |\n`;
        markdown += `|------|-------|---------|----------|--------------|---------------|\n`;

        for (const [name, stats] of report.toolEffectiveness.toolStats) {
            markdown += `| ${name} | ${stats.total} | ${stats.success} | ${stats.failures} | `;
            markdown += `${(stats.successRate * 100).toFixed(1)}% | ${stats.avgDuration.toFixed(0)}ms |\n`;
        }

        if (report.toolEffectiveness.failedTools.length > 0) {
            markdown += `\n### Tools with Failures\n\n`;
            for (const tool of report.toolEffectiveness.failedTools) {
                markdown += `- **${tool.name}**: ${tool.failures} failures (${(tool.rate * 100).toFixed(1)}% success)\n`;
            }
        }

        if (report.toolEffectiveness.slowTools.length > 0) {
            markdown += `\n### Slow Tools (>1s average)\n\n`;
            for (const tool of report.toolEffectiveness.slowTools) {
                markdown += `- **${tool.name}**: ${(tool.avgDuration / 1000).toFixed(2)}s average\n`;
            }
        }

        markdown += `\n## Quality Assessment\n\n`;
        markdown += `- **Overall Score**: ${(report.qualityAssessment.overall * 100).toFixed(0)}%\n`;
        markdown += `- **Investigation Depth**: ${report.qualityAssessment.investigationDepth}\n`;
        markdown += `- **Tool Diversity**: ${report.qualityAssessment.toolDiversity} unique tools\n`;
        markdown += `- **Efficiency**: ${report.qualityAssessment.iterationEfficiency.toFixed(2)} tools per iteration\n\n`;

        if (report.recommendations.length > 0) {
            markdown += `## Recommendations\n\n`;

            const byPriority = {
                high: report.recommendations.filter(r => r.severity === 'high'),
                medium: report.recommendations.filter(r => r.severity === 'medium'),
                low: report.recommendations.filter(r => r.severity === 'low'),
            };

            if (byPriority.high.length > 0) {
                markdown += `### 🔴 High Priority\n\n`;
                byPriority.high.forEach((rec, i) => {
                    markdown += `${i + 1}. **${rec.message}**\n`;
                    if (rec.suggestion) {
                        markdown += `   - Suggestion: ${rec.suggestion}\n`;
                    }
                    markdown += `\n`;
                });
            }

            if (byPriority.medium.length > 0) {
                markdown += `### 🟡 Medium Priority\n\n`;
                byPriority.medium.forEach((rec, i) => {
                    markdown += `${i + 1}. **${rec.message}**\n`;
                    if (rec.suggestion) {
                        markdown += `   - Suggestion: ${rec.suggestion}\n`;
                    }
                    markdown += `\n`;
                });
            }
        }

        if (report.output) {
            markdown += `## Final Output\n\n`;
            markdown += `\`\`\`\n${report.output}\n\`\`\`\n\n`;
        }

        markdown += `---\n\n`;
        markdown += `*Report generated by RiotPrompt Agentic Reflection System*\n`;

        return markdown;
    }
}

export default ReflectionReportGenerator;

