import type { Sdlc, Srs } from "./types";

const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
const table = (head: string[], rows: string[][]) => [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");

export function srsMarkdown(s: Srs) {
  return [
    `# Software Requirements Specification — ${s.title}`,
    `## Summary\n${s.summary}`,
    `## Assumptions\n${s.assumptions.map((a) => `- ${a}`).join("\n")}`,
    `## Stakeholders\n${s.stakeholders.map((a) => `- ${a}`).join("\n")}`,
    `## Requirements\n${table(["ID", "Statement", "Category", "Acceptance criteria", "Evidence"], s.requirements.map((r) => [r.id, r.statement, r.category, r.acceptance, r.source]))}`,
    `## Quality findings\n${s.findings.map((f) => `- **${f.type}**: ${f.text}`).join("\n")}`,
    `## Traceability\n${table(["Requirement", "Test case", "Checks"], s.traceability.map((t) => [t.req, t.test, t.check]))}`,
    `## Risks\n${s.risks.map((r) => `- **${r.title}**: ${r.text}`).join("\n")}`,
    `## Open issues\n${s.openIssues.length ? s.openIssues.map((o) => `- ${o}`).join("\n") : "- None"}`,
    `> **Human review required.** Regulatory interpretation must be approved by a qualified person.`,
  ].join("\n\n");
}

export function sdlcMarkdown(d: Sdlc) {
  const top = d.ranking[0];
  return [
    `# SDLC Recommendation`,
    `**Recommended: ${d.chosen} (${top.score}/100)**\n\n${d.justification}`,
    `## Ranking\n${table(["Model", "Score", "Good at", "Why not chosen"], d.ranking.map((r, i) => [r.model, String(r.score), r.fit, i === 0 ? "— (chosen)" : r.miss]))}`,
    `## Decision factors\n${table(["Factor", "Level", "Based on", "Implication"], d.factors.map((f) => [f.name, f.value, f.cites, f.implication]))}`,
    `> **Human review required** before adopting this lifecycle.`,
  ].join("\n\n");
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
