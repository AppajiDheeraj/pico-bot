// Mock SDLC planner: a transparent weighted score over project traits.
// Stands in for the ADK "planner" agent until the backend exists.
import type { Traits } from "../data/scenarios";
import type { Level, Sdlc, Srs } from "./types";

const n = (l: Level) => (l === "High" ? 2 : l === "Medium" ? 1 : 0);
const clamp = (x: number) => Math.max(5, Math.min(97, Math.round(x)));

type Model = { model: string; score: (t: Record<keyof Traits, number>) => number; fit: string; miss: string };

const MODELS: Model[] = [
  {
    model: "V-Model",
    score: (t) => 50 + t.stability * 8 + t.regulatory * 8 + t.formality * 7 + t.failure * 5 - t.change * 8 - t.delivery * 6,
    fit: "pairs every build phase with a test phase, so traceability and audit evidence come out of the process itself",
    miss: "rigid once a phase closes; late requirement changes are expensive",
  },
  {
    model: "Waterfall",
    score: (t) => 50 + t.stability * 10 + t.formality * 5 + t.regulatory * 4 - t.change * 10 - t.delivery * 6 - t.complexity * 3,
    fit: "simple, document-driven phases suit fixed requirements",
    miss: "testing comes late, so verification evidence arrives after design decisions are locked",
  },
  {
    model: "Spiral",
    score: (t) => 45 + t.failure * 7 + t.complexity * 7 + (2 - t.stability) * 6 + t.regulatory * 2 - t.delivery * 3,
    fit: "risk-driven loops handle uncertainty and high failure cost",
    miss: "heavy risk analysis each loop is costly when requirements are already clear",
  },
  {
    model: "Agile (Scrum)",
    score: (t) => 50 + t.change * 10 + t.delivery * 8 + (2 - t.formality) * 5 - t.regulatory * 6 - t.stability * 3,
    fit: "short sprints absorb changing requirements and get feedback early",
    miss: "light documentation clashes with formal audit and sign-off needs",
  },
  {
    model: "DevSecOps",
    score: (t) => 40 + t.delivery * 10 + t.security * 7 + t.change * 5 - t.formality * 3,
    fit: "automated pipelines with security checks support frequent, safe releases",
    miss: "its value is continuous delivery, which this project does not need",
  },
  {
    model: "Incremental",
    score: (t) => 48 + t.complexity * 5 + t.change * 4 + t.regulatory * 3 + t.stability * 2,
    fit: "delivers the system in usable slices, each fully specified",
    miss: "needs a stable overall architecture up front",
  },
  {
    model: "Agile–V-Model hybrid",
    score: (t) => 46 + t.regulatory * 6 + t.change * 6 + t.formality * 3 + t.delivery * 2 - t.stability * 2,
    fit: "combines short iterations with V-Model verification gates, the course rule for high regulation with evolving requirements",
    miss: "two processes to run; only pays off when requirements keep changing",
  },
  {
    model: "RAD",
    score: (t) => 40 + t.change * 6 + (2 - t.complexity) * 6 - t.failure * 6 - t.regulatory * 6,
    fit: "fast prototyping for small, low-risk systems",
    miss: "too little rigour for high-risk or regulated systems",
  },
];

const WORKFLOWS: Record<string, [string, string, string, string, string][]> = {
  "V-Model": [
    ["Requirements analysis", "Elicit, classify and baseline requirements", "Analyst, stakeholders", "Signed SRS", "SRS approved by compliance"],
    ["System design ↔ System test plan", "Architecture; write system tests from SRS", "Architect, QA lead", "Design doc, system test plan", "Every requirement has a system test"],
    ["Detailed design ↔ Integration test plan", "Module interfaces; integration tests", "Developers, QA", "Module specs, integration tests", "Interfaces reviewed"],
    ["Implementation", "Code, unit tests, peer review", "Developers", "Code, unit test results", "Unit coverage ≥ 85%, review done"],
    ["Verification", "Run integration → system tests", "QA", "Test reports", "Zero open critical defects"],
    ["Validation & sign-off", "UAT, audit review, release", "Users, auditors, ops", "UAT report, sign-off record", "Formal sign-off recorded"],
  ],
  Waterfall: [
    ["Requirements", "Gather and baseline requirements", "Analyst, stakeholders", "SRS", "SRS approved"],
    ["Design", "Architecture and detailed design", "Architect", "Design document", "Design review passed"],
    ["Implementation", "Build the modules", "Developers", "Codebase", "Code complete"],
    ["Testing", "System and acceptance testing", "QA", "Test reports", "Exit criteria met"],
    ["Deployment", "Release to production", "Ops", "Release package", "Go-live approved"],
    ["Maintenance", "Monitor and fix", "Ops", "Maintenance log", "—"],
  ],
  Spiral: [
    ["Objectives", "Set goals and constraints for the loop", "Product owner", "Loop plan", "Objectives agreed"],
    ["Risk analysis", "Identify and resolve top risks; prototype", "Architect, QA", "Risk register, prototype", "Top risks mitigated"],
    ["Engineering", "Build and test this loop's increment", "Developers, QA", "Increment, test results", "Tests pass"],
    ["Evaluation", "Review with stakeholders; plan next loop", "Stakeholders", "Review notes", "Go / no-go"],
  ],
  "Agile (Scrum)": [
    ["Backlog", "Turn SRS into user stories with acceptance criteria", "Product owner", "Product backlog", "Stories meet Definition of Ready"],
    ["Sprint planning", "Pick stories for a 2-week sprint", "Team", "Sprint backlog", "Sprint goal set"],
    ["Sprint", "Build, test and review daily", "Developers, QA", "Working increment", "Definition of Done met"],
    ["Review & retro", "Demo to stakeholders, improve process", "Team, stakeholders", "Feedback, actions", "Increment accepted"],
  ],
  DevSecOps: [
    ["Plan", "Threat model and backlog", "Team, security", "Backlog, threat model", "Risks logged"],
    ["Code & build", "Trunk-based dev with SAST", "Developers", "Builds", "Scans clean"],
    ["Test", "Automated unit, integration, DAST", "QA, pipeline", "Test reports", "Quality gate green"],
    ["Release & operate", "Progressive delivery, monitoring", "Ops", "Release, dashboards", "SLOs healthy"],
  ],
  Incremental: [
    ["Requirements & architecture", "Baseline SRS and overall design", "Analyst, architect", "SRS, architecture", "Approved"],
    ["Increment build", "Specify, build and test one slice", "Team", "Increment", "Slice accepted"],
    ["Integration", "Merge slice into the whole", "QA", "Integrated build", "Regression green"],
    ["Release", "Ship increment", "Ops", "Release notes", "Go-live"],
  ],
  RAD: [
    ["Requirements workshop", "Quick joint planning", "Users, team", "Feature list", "Scope agreed"],
    ["Prototype cycles", "Build, show, refine", "Team, users", "Prototypes", "Users accept"],
    ["Cutover", "Harden and deploy", "Team, ops", "Release", "Go-live"],
  ],
};

export function planSdlc(srs: Srs, traits: Traits): Sdlc {
  const t = Object.fromEntries(Object.entries(traits).map(([k, v]) => [k, n(v)])) as Record<keyof Traits, number>;
  const byCat = (re: RegExp) =>
    srs.requirements
      .filter((r) => re.test(r.category))
      .map((r) => r.id)
      .join(", ") || "—";
  const all = srs.requirements.map((r) => r.id);
  const range = all.length ? `${all[0]}–${all[all.length - 1]}` : "—";

  const ranking = MODELS.map((m) => ({ model: m.model, score: clamp(m.score(t)), why: m.fit, miss: m.miss })).sort((a, b) => b.score - a.score);
  const chosen = ranking[0];

  const factors: Sdlc["factors"] = [
    { name: "Requirement stability", value: traits.stability, cites: range, implication: traits.stability === "High" ? "Plan-driven phases are safe" : "Expect requirement churn", confidence: "High" },
    { name: "Regulatory criticality", value: traits.regulatory, cites: byCat(/Regulatory|Compliance/), implication: traits.regulatory === "High" ? "Needs formal verification and evidence" : "Normal review is enough", confidence: "High" },
    { name: "Security / privacy risk", value: traits.security, cites: byCat(/Security/), implication: "Security checks at every gate", confidence: "High" },
    { name: "Complexity", value: traits.complexity, cites: byCat(/Integration|Performance/), implication: traits.complexity === "High" ? "Integration testing is a phase of its own" : "Manageable in one team", confidence: "Medium" },
    { name: "Expected change frequency", value: traits.change, cites: range, implication: traits.change === "High" ? "Favour iterative delivery" : "Few changes after baseline", confidence: "Medium" },
    { name: "Need for continuous delivery", value: traits.delivery, cites: "—", implication: traits.delivery === "High" ? "Automate the release pipeline" : "Scheduled releases are fine", confidence: "Medium" },
    { name: "Testing / documentation formality", value: traits.formality, cites: byCat(/Compliance/), implication: traits.formality === "High" ? "Test plans must be written up front" : "Lightweight docs acceptable", confidence: "High" },
    { name: "Failure consequence", value: traits.failure, cites: byCat(/Functional/).split(", ").slice(0, 3).join(", "), implication: traits.failure === "High" ? "Defects have legal or financial cost" : "Defects are recoverable", confidence: "High" },
  ];

  return {
    factors,
    ranking: ranking.map(({ model, score, why }) => ({ model, score, why })),
    chosen: chosen.model,
    justification: `${chosen.model} scores highest (${chosen.score}/100) because it ${chosen.why}. That matches this project's ${traits.regulatory.toLowerCase()} regulatory criticality, ${traits.stability.toLowerCase()} requirement stability and ${traits.change.toLowerCase()} expected change frequency.`,
    rejected: ranking.slice(1).map((r) => ({ model: r.model, why: MODELS.find((m) => m.model === r.model)!.miss })),
    workflow: (WORKFLOWS[chosen.model] ?? WORKFLOWS.Waterfall).map(([phase, activities, roles, deliverables, gate], i, arr) => ({
      phase,
      activities,
      roles,
      deliverables,
      gate,
      reqs: i === 0 || i === arr.length - 1 ? "All" : i === 1 ? byCat(/Functional|Regulatory/) : byCat(/Security|Compliance|Integration|Performance/),
    })),
  };
}
