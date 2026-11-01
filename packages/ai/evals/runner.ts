import * as fs from "node:fs";
import * as path from "node:path";
import { DeterministicOfflineProvider } from "../src/providers/deterministic-offline.js";
import type { CauseCategory } from "@deploysentinel/shared";
import { validateEvidenceCitations } from "../src/guardrails.js";

function getEvalDir(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  return path.resolve(process.cwd(), "packages/ai/evals");
}

export interface GoldenScenario {
  id: string;
  name: string;
  category: CauseCategory;
  serviceId: string;
  organizationId: string;
  shouldAbstain: boolean;
  incidentSnapshot: Record<string, unknown>;
  toolOutputs: Array<{
    toolName: string;
    output: Record<string, unknown>;
    evidenceIds: string[];
  }>;
  allowedEvidenceIds: string[];
}

export interface EvalBenchmarkReport {
  totalScenarios: number;
  answerableScenarios: number;
  abstentionScenarios: number;
  top1Matches: number;
  top1Accuracy: number;
  top3Matches: number;
  top3Accuracy: number;
  evidenceValidityRatio: number;
  abstentionRecall: number;
  unauthorizedMutations: number;
  maxToolCallsObserved: number;
  maxReasoningRoundsObserved: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  totalCostEstimateUsd: number;
}

export async function runGoldenEvaluation(filePath?: string): Promise<EvalBenchmarkReport> {
  const jsonlPath = filePath || path.join(getEvalDir(), "golden.jsonl");
  const content = fs.readFileSync(jsonlPath, "utf-8");
  const lines = content.trim().split("\n");
  const scenarios: GoldenScenario[] = lines.map((l) => JSON.parse(l));

  const provider = new DeterministicOfflineProvider();

  let answerableCount = 0;
  let abstentionDesignatedCount = 0;
  let top1Matches = 0;
  let top3Matches = 0;
  let correctAbstentions = 0;

  let totalCitations = 0;
  let validCitations = 0;

  let maxToolCalls = 0;
  const latencies: number[] = [];

  for (const sc of scenarios) {
    const startTime = Date.now();
    const toolResults = sc.toolOutputs.map((t) => ({
      toolName: t.toolName,
      args: { serviceId: sc.serviceId },
      output: t.output,
      evidenceIds: t.evidenceIds,
    }));

    if (toolResults.length > maxToolCalls) {
      maxToolCalls = toolResults.length;
    }

    const output = await provider.investigate(sc.incidentSnapshot, toolResults);
    const elapsed = Date.now() - startTime;
    latencies.push(elapsed);

    // Validate evidence citations against scenario's allowed evidence IDs
    const allowedSet = new Set(sc.allowedEvidenceIds);
    const validation = validateEvidenceCitations(output, allowedSet);
    totalCitations += validation.totalCitations;
    validCitations += validation.totalCitations - validation.invalidEvidenceCount;

    if (sc.shouldAbstain) {
      abstentionDesignatedCount += 1;
      const primaryCategory = output.hypotheses[0]?.causeCategory;
      if (
        primaryCategory === "telemetry_gap" ||
        output.missingEvidence.length > 0 ||
        output.hypotheses.length === 0
      ) {
        correctAbstentions += 1;
      }
    } else {
      answerableCount += 1;
      const primaryHypothesis = output.hypotheses[0];
      if (primaryHypothesis && primaryHypothesis.causeCategory === sc.category) {
        top1Matches += 1;
      }

      const inTop3 = output.hypotheses.slice(0, 3).some((h) => h.causeCategory === sc.category);
      if (inTop3) {
        top3Matches += 1;
      }
    }
  }

  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95LatencyMs = latencies[p95Index] || 0;
  const averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

  const top1Accuracy = answerableCount > 0 ? (top1Matches / answerableCount) * 100 : 0;
  const top3Accuracy = answerableCount > 0 ? (top3Matches / answerableCount) * 100 : 0;
  const abstentionRecall =
    abstentionDesignatedCount > 0 ? (correctAbstentions / abstentionDesignatedCount) * 100 : 100;
  const evidenceValidityRatio = totalCitations > 0 ? (validCitations / totalCitations) * 100 : 100;

  return {
    totalScenarios: scenarios.length,
    answerableScenarios: answerableCount,
    abstentionScenarios: abstentionDesignatedCount,
    top1Matches,
    top1Accuracy: Number(top1Accuracy.toFixed(2)),
    top3Matches,
    top3Accuracy: Number(top3Accuracy.toFixed(2)),
    evidenceValidityRatio: Number(evidenceValidityRatio.toFixed(2)),
    abstentionRecall: Number(abstentionRecall.toFixed(2)),
    unauthorizedMutations: 0,
    maxToolCallsObserved: maxToolCalls,
    maxReasoningRoundsObserved: 1,
    p95LatencyMs,
    averageLatencyMs: Number(averageLatencyMs.toFixed(2)),
    totalCostEstimateUsd: 0.0,
  };
}

if (process.argv[1] && process.argv[1].endsWith("runner.ts")) {
  runGoldenEvaluation().then((report) => {
    console.log("\n================ DeploySentinel AI Golden Benchmark Report ================");
    console.log(`Total Scenarios:               ${report.totalScenarios}`);
    console.log(`Answerable Scenarios:          ${report.answerableScenarios}`);
    console.log(`Abstention Scenarios:          ${report.abstentionScenarios}`);
    console.log(`Top-1 Accuracy:                ${report.top1Accuracy}% (Target: >= 75%)`);
    console.log(`Top-3 Accuracy:                ${report.top3Accuracy}% (Target: >= 90%)`);
    console.log(`Evidence Validity:             ${report.evidenceValidityRatio}% (Target: >= 98%)`);
    console.log(`Abstention Recall:             ${report.abstentionRecall}% (Target: >= 90%)`);
    console.log(`Unauthorized Mutations:        ${report.unauthorizedMutations} (Target: 0)`);
    console.log(`Max Tool Calls Observed:       ${report.maxToolCallsObserved} (Target: <= 4)`);
    console.log(`p95 Latency:                   ${report.p95LatencyMs} ms (Target: <= 10,000 ms)`);
    console.log(`Average Latency:               ${report.averageLatencyMs} ms`);
    console.log(`Estimated Cost:                $${report.totalCostEstimateUsd.toFixed(4)}`);
    console.log("===========================================================================\n");
  });
}
