import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, ReflectionReportGenerator } from '../src/reflection';
import { ConversationBuilder } from '../src/conversation';
import type { StrategyResult } from '../src/iteration-strategy';

describe('Self-Reflection & Observability', () => {
    describe('MetricsCollector', () => {
        let collector: MetricsCollector;

        beforeEach(() => {
            collector = new MetricsCollector();
        });

        it('should record tool calls', () => {
            collector.recordToolCall('test_tool', 1, 100, true);
            collector.recordToolCall('another_tool', 1, 200, false, 'Error occurred');

            const conv = ConversationBuilder.create();
            conv.asUser('test');

            const metrics = collector.getMetrics(conv.getMessages());

            expect(metrics.toolMetrics).toHaveLength(2);
            expect(metrics.toolMetrics[0].name).toBe('test_tool');
            expect(metrics.toolMetrics[0].success).toBe(true);
            expect(metrics.toolMetrics[1].success).toBe(false);
        });

        it('should increment iteration count', () => {
            collector.incrementIteration();
            collector.incrementIteration();

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            expect(metrics.iterations).toBe(2);
        });

        it('should calculate tool statistics', () => {
            collector.recordToolCall('tool1', 1, 100, true);
            collector.recordToolCall('tool1', 2, 150, true);
            collector.recordToolCall('tool1', 3, 200, false, 'Error');

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            const tool1Stats = metrics.toolStats.get('tool1');
            expect(tool1Stats?.total).toBe(3);
            expect(tool1Stats?.success).toBe(2);
            expect(tool1Stats?.failures).toBe(1);
            expect(tool1Stats?.successRate).toBeCloseTo(2/3, 2);
        });

        it('should calculate investigation depth', () => {
            const conv = ConversationBuilder.create();
            conv.asUser('test');

            // Shallow
            const shallow = collector.getMetrics(conv.getMessages());
            expect(shallow.investigationDepth).toBe('shallow');

            // Moderate
            for (let i = 0; i < 5; i++) {
                collector.recordToolCall('tool', i, 100, true);
            }
            const moderate = collector.getMetrics(conv.getMessages());
            expect(moderate.investigationDepth).toBe('moderate');

            // Deep
            for (let i = 5; i < 10; i++) {
                collector.recordToolCall('tool', i, 100, true);
            }
            const deep = collector.getMetrics(conv.getMessages());
            expect(deep.investigationDepth).toBe('deep');
        });

        it('should calculate tool diversity', () => {
            collector.recordToolCall('tool1', 1, 100, true);
            collector.recordToolCall('tool2', 1, 100, true);
            collector.recordToolCall('tool3', 1, 100, true);
            collector.recordToolCall('tool1', 2, 100, true);  // Repeat

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            expect(metrics.toolDiversity).toBe(3);  // 3 unique tools
        });

        it('should calculate iteration efficiency', () => {
            collector.incrementIteration();
            collector.incrementIteration();

            collector.recordToolCall('tool1', 1, 100, true);
            collector.recordToolCall('tool2', 1, 100, true);
            collector.recordToolCall('tool3', 2, 100, true);
            collector.recordToolCall('tool4', 2, 100, true);

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            expect(metrics.iterationEfficiency).toBe(2);  // 4 tools / 2 iterations
        });
    });

    describe('ReflectionReportGenerator', () => {
        let generator: ReflectionReportGenerator;

        beforeEach(() => {
            generator = new ReflectionReportGenerator();
        });

        it('should generate reflection report', () => {
            const collector = new MetricsCollector();
            collector.recordToolCall('tool1', 1, 100, true);
            collector.recordToolCall('tool2', 2, 200, false, 'Error');
            collector.incrementIteration();
            collector.incrementIteration();

            const conv = ConversationBuilder.create();
            conv.asUser('Test');

            const metrics = collector.getMetrics(conv.getMessages());

            const mockResult: StrategyResult = {
                finalMessage: conv.getLastMessage(),
                phases: [],
                totalIterations: 2,
                toolCallsExecuted: 2,
                duration: 1000,
                success: true,
                conversation: conv,
            };

            const report = generator.generate(metrics, mockResult);

            expect(report).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.toolEffectiveness).toBeDefined();
            expect(report.recommendations).toBeDefined();
        });

        it('should identify failed tools', () => {
            const collector = new MetricsCollector();
            collector.recordToolCall('failing_tool', 1, 100, false, 'Failed');
            collector.recordToolCall('working_tool', 2, 100, true);

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            const mockResult: StrategyResult = {
                finalMessage: undefined,
                phases: [],
                totalIterations: 2,
                toolCallsExecuted: 2,
                duration: 1000,
                success: true,
                conversation: conv,
            };

            const report = generator.generate(metrics, mockResult);

            expect(report.toolEffectiveness.failedTools.length).toBeGreaterThan(0);
            expect(report.toolEffectiveness.failedTools[0].name).toBe('failing_tool');
        });

        it('should identify slow tools', () => {
            const collector = new MetricsCollector();
            collector.recordToolCall('slow_tool', 1, 2000, true);  // >1s
            collector.recordToolCall('fast_tool', 2, 50, true);

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            const mockResult: StrategyResult = {
                finalMessage: undefined,
                phases: [],
                totalIterations: 2,
                toolCallsExecuted: 2,
                duration: 3000,
                success: true,
                conversation: conv,
            };

            const report = generator.generate(metrics, mockResult);

            expect(report.toolEffectiveness.slowTools.length).toBeGreaterThan(0);
            expect(report.toolEffectiveness.slowTools[0].name).toBe('slow_tool');
        });

        it('should generate recommendations for shallow investigation', () => {
            const collector = new MetricsCollector();
            collector.recordToolCall('tool1', 1, 100, true);  // Only 1 tool = shallow

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            const mockResult: StrategyResult = {
                finalMessage: undefined,
                phases: [],
                totalIterations: 1,
                toolCallsExecuted: 1,
                duration: 1000,
                success: true,
                conversation: conv,
            };

            const report = generator.generate(metrics, mockResult);

            const shallowRec = report.recommendations.find(r =>
                r.type === 'investigation-depth'
            );

            expect(shallowRec).toBeDefined();
            expect(shallowRec?.severity).toBe('medium');
        });

        it('should format report as markdown', () => {
            const collector = new MetricsCollector();
            collector.recordToolCall('tool1', 1, 100, true);
            collector.incrementIteration();

            const conv = ConversationBuilder.create();
            conv.asUser('Test');
            conv.asAssistant('Response');

            const metrics = collector.getMetrics(conv.getMessages());

            const mockResult: StrategyResult = {
                finalMessage: conv.getLastMessage(),
                phases: [],
                totalIterations: 1,
                toolCallsExecuted: 1,
                duration: 1000,
                success: true,
                conversation: conv,
            };

            const report = generator.generate(metrics, mockResult);
            const markdown = generator.formatMarkdown(report);

            expect(markdown).toContain('# Agentic Execution - Self-Reflection Report');
            expect(markdown).toContain('## Execution Summary');
            expect(markdown).toContain('Tool Effectiveness Analysis');
        });

        it('should calculate quality assessment', () => {
            const collector = new MetricsCollector();

            // Add many tools for deep investigation
            for (let i = 0; i < 10; i++) {
                collector.recordToolCall(`tool${i}`, i, 100, true);
                collector.incrementIteration();
            }

            const conv = ConversationBuilder.create();
            const metrics = collector.getMetrics(conv.getMessages());

            const mockResult: StrategyResult = {
                finalMessage: undefined,
                phases: [],
                totalIterations: 10,
                toolCallsExecuted: 10,
                duration: 5000,
                success: true,
                conversation: conv,
            };

            const report = generator.generate(metrics, mockResult);

            expect(report.qualityAssessment.investigationDepth).toBe('deep');
            expect(report.qualityAssessment.toolDiversity).toBe(10);
            expect(report.qualityAssessment.overall).toBeGreaterThan(0);
        });
    });
});

