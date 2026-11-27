import type { Ieee, Sdlc, Srs } from "./types";

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

// ---------- IEEE 830-1998 SRS as a printable page (the browser's "Save as PDF" makes the file) ----------

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`); // model text goes into HTML
const id = (p: string, i: number) => `${p}-${String(i + 1).padStart(3, "0")}`;
const list = (xs: string[], p?: string) => (xs.length ? `<ul>${xs.map((x, i) => `<li>${p ? `<b>${id(p, i)}:</b> ` : ""}${esc(x)}</li>`).join("")}</ul>` : "<p><i>None identified.</i></p>");
const grid = (head: string[], rows: string[][]) =>
  `<table><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;

function useCaseSvg(actors: Ieee["actors"]) {
  const cases = [...new Set(actors.flatMap((a) => a.useCases))];
  const h = Math.max(cases.length, actors.length) * 46 + 30;
  const ay = (i: number) => ((i + 0.5) * h) / actors.length;
  const cy = (i: number) => 30 + i * 46;
  return `<svg viewBox="-40 0 600 ${h}" width="100%" style="max-width:600px" font-size="12" font-family="inherit">
    <rect x="190" y="5" width="360" height="${h - 10}" fill="none" stroke="#555"/>
    ${actors.map((a, i) => `<g><circle cx="60" cy="${ay(i) - 22}" r="8" fill="none" stroke="#000"/><path d="M60 ${ay(i) - 14}v18m-12-10h24M60 ${ay(i) + 4}l-9 14M60 ${ay(i) + 4}l9 14" stroke="#000" fill="none"/><text x="60" y="${ay(i) + 32}" text-anchor="middle">${esc(a.actor)}</text></g>`).join("")}
    ${actors.flatMap((a, i) => a.useCases.map((u) => `<line x1="75" y1="${ay(i) - 6}" x2="${220}" y2="${cy(cases.indexOf(u))}" stroke="#888"/>`)).join("")}
    ${cases.map((u, i) => `<ellipse cx="370" cy="${cy(i)}" rx="150" ry="17" fill="#fff" stroke="#000"/><text x="370" y="${cy(i) + 4}" text-anchor="middle">${esc(u.length > 40 ? u.slice(0, 38) + "…" : u)}</text>`).join("")}
  </svg>`;
}

export function ieeeHtml(title: string, d: Ieee, srs?: Srs) {
  const f = d.interfaces;
  return `<!doctype html><html><head><meta charset="utf-8"><title>SRS-IEEE-830-${esc(title.replace(/\W+/g, "-"))}</title><style>
  @page { size: A4; margin: 20mm 18mm; }
  body { font: 11pt/1.45 "Times New Roman", Times, serif; color: #000; max-width: 780px; margin: 24px auto; }
  h1 { font-size: 20pt; text-align: center; margin: 0 } h2 { font-size: 14pt; border-bottom: 1px solid #000; margin-top: 22px; break-after: avoid }
  h3 { font-size: 12pt; margin: 14px 0 4px; break-after: avoid } h4 { font-size: 11pt; margin: 10px 0 2px }
  .cover { text-align: center; margin-bottom: 28px } .cover p { margin: 4px 0 }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; break-inside: avoid } th, td { border: 1px solid #000; padding: 3px 6px; text-align: left; vertical-align: top } th { background: #eee }
  ul, ol { margin: 4px 0 } .toc li { list-style: none } .fn { break-inside: avoid } .note { border: 1px solid #000; padding: 6px 10px; margin-top: 18px }
  </style></head><body>
  <div class="cover"><h1>Software Requirements Specification</h1><p style="font-size:14pt">for</p><p style="font-size:16pt"><b>${esc(title)}</b></p>
  <p>Version 1.0 · Prepared in accordance with IEEE Std 830-1998 · ${new Date().toLocaleDateString()}</p></div>

  <h2>Table of Contents</h2><ol class="toc"><li>1. Introduction (1.1–1.5)</li><li>2. Overall Description (2.1–2.5)</li><li>3. Specific Requirements (3.1–3.7)</li><li>Appendices</li><li>Index</li></ol>

  <h2>1. Introduction</h2>
  <h3>1.1 Purpose</h3><p>${esc(d.purpose)}</p>
  <h3>1.2 Scope</h3><p><b>Included:</b></p>${list(d.included)}<p><b>Excluded:</b></p>${list(d.excluded)}
  <h3>1.3 Definitions, Acronyms and Abbreviations</h3>${grid(["Term", "Definition"], [["SRS", "Software Requirements Specification"], ...d.definitions.map((t) => [t.term, t.definition])])}
  <h3>1.4 References</h3>${list(d.references)}
  <h3>1.5 Overview</h3><p>Section 2 describes the product, its users, constraints and assumptions in general terms. Section 3 specifies the detailed, verifiable requirements: external interfaces, functions, performance, logical database, design constraints, quality attributes and object-oriented models. The appendices list business rules and the requirements baseline.</p>

  <h2>2. Overall Description</h2>
  <h3>2.1 Product Perspective</h3><p>${esc(d.perspective)}</p>
  <h3>2.2 Product Functions</h3><ol>${d.productFunctions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
  <h3>2.3 User Characteristics</h3>${grid(["User", "Characteristics"], d.users.map((u) => [u.user, u.characteristics]))}
  <h3>2.4 Constraints</h3>${list(d.constraints)}
  <h3>2.5 Assumptions and Dependencies</h3>${list([...(srs?.assumptions ?? []), ...d.dependencies])}

  <h2>3. Specific Requirements</h2>
  <h3>3.1 External Interfaces</h3>
  <h4>3.1.1 User Interface</h4>${list(f.user, "UI")}<h4>3.1.2 Hardware Interface</h4>${list(f.hardware, "HI")}
  <h4>3.1.3 Software Interface</h4>${list(f.software, "SI")}<h4>3.1.4 Communication Interface</h4>${list(f.communication, "CI")}
  <h4>3.1.5 File Interface</h4>${list(f.file, "FI")}
  <h3>3.2 Functions</h3>${d.functions.map((fn, i) => `<div class="fn"><h4>${id("F", i)}: ${esc(fn.name)}</h4><ul><li><b>Input:</b> ${esc(fn.input)}</li><li><b>Processing:</b><ol>${fn.processing.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></li><li><b>Output:</b> ${esc(fn.output)}</li></ul><p><b>Requirement:</b> ${esc(fn.requirement)}</p></div>`).join("")}
  <h3>3.3 Performance Requirements</h3>${list(d.performance, "P")}
  <h3>3.4 Logical Database Requirements</h3>${grid(["Entity", "Attributes"], d.entities.map((e) => [e.entity, e.attributes]))}<p><b>Relationships:</b></p>${list(d.relationships)}
  <h3>3.5 Design Constraints</h3>${list(d.designConstraints, "C")}
  <h3>3.6 Software System Quality Attributes</h3>${grid(["Attribute", "Requirement"], d.quality.map((q, i) => [q.attribute, `${id("Q", i)}: ${q.requirement}`]))}
  <h3>3.7 Object-Oriented Models</h3><h4>Use-Case Diagram</h4>${useCaseSvg(d.actors)}
  <h4>Class Model (from the logical entities)</h4>${grid(["Class", "Attributes"], d.entities.map((e) => [e.entity, e.attributes]))}

  <h2>Appendices</h2>
  <h3>Appendix A — Business Rules</h3>${list(d.businessRules, "BR")}
  ${srs ? `<h3>Appendix B — Requirements Baseline and Traceability</h3>${grid(["ID", "Requirement", "Priority", "Acceptance criterion"], srs.requirements.map((r) => [r.id, r.statement, r.priority, r.acceptance]))}` : ""}

  <h2>Index</h2>${grid(["Term", "Section"], [["Assumptions", "2.5"], ["Business rules", "Appendix A"], ["Constraints", "2.4, 3.5"], ["Database", "3.4"], ["Functions", "2.2, 3.2"], ["Interfaces", "3.1"], ["Performance", "3.3"], ["Quality attributes", "3.6"], ["Scope", "1.2"], ["Use cases", "3.7"], ["Users", "2.3"]])}
  <p class="note"><b>Human review required.</b> Drafted by AI agents; regulatory interpretation and the requirements baseline must be approved by a qualified person.</p>
  </body></html>`;
}

/** Opens the document in a new tab and the print dialog, where "Save as PDF" writes the file. */
export function printPdf(html: string) {
  const w = window.open("", "_blank");
  if (!w) return alert("Allow pop-ups for this page to download the PDF.");
  w.document.write(html);
  w.document.close();
  let printed = false;
  const go = () => !printed && ((printed = true), w.print());
  w.onload = go;
  setTimeout(go, 600); // document.write may not fire load in every browser
}
