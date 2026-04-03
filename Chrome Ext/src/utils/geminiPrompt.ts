import type { AIProjectAnalysis } from "../types/qa";

export function buildGeminiPromptFromAnalysis(analysis: AIProjectAnalysis): string {
  const m = (analysis as any).metricsSnapshot || {};
  const bullets: string[] = [];

  bullets.push(`Project: ${analysis.projectName || analysis.projectKey}`);
  bullets.push(`Window: ${analysis.timeRangeLabel}`);
  bullets.push(`Health score: ${analysis.projectHealthScore}`);
  bullets.push(`Headline (current): ${analysis.aiRecommendation?.headline ?? ""}`);
  bullets.push(`Top prioritized fixes:`);
  (analysis.prioritizedFixes || []).slice(0, 3).forEach((p, i) => {
    bullets.push(`${i + 1}. ${p.fix} — reason: ${p.reason} — impact: ${p.expectedImpact}`);
  });

  bullets.push(`Key metrics: total ${m.totalIssues}, open ${m.openIssues}, created ${m.createdInRange}, resolved ${m.resolvedInRange}, completionRate ${m.completionRate}%`);

  bullets.push(`Immediate actions (top 4):`);
  (analysis.aiInsightsPanel?.immediateActions || []).slice(0, 4).forEach((a, i) => {
    bullets.push(`${i + 1}. [${a.severity}] ${a.issue} -> ${a.action}`);
  });

  const prompt = `
You are an senior agile scrum master. Based on the data below, respond ONLY with valid JSON containing keys:
- "headline": a single short (<= 12 words) actionable headline suitable for a dashboard card.
- "summary": a short executive summary (2-3 sentences) highlighting the top risk and recommended next step.
- "actions": an array of up to 3 short bullet strings with the prioritized next steps and expected impact/confidence (if known).

Data:
${bullets.join("\n")}

Respond ONLY as valid JSON, no extra text, no markdown.
`;

  return prompt.trim();
}
