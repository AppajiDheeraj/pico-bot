// Mock SDLC planner: a transparent weighted score over project traits.
// Stands in for the ADK "planner" agent until the backend exists.
import type { Traits } from "../data/scenarios";
import type { Level, Sdlc, Srs } from "./types";

const n = (l: Level) => (l === "High" ? 2 : l === "Medium" ? 1 : 0);
const clamp = (x: number) => Math.max(5, Math.min(97, Math.round(x)));

const LABEL: Record<keyof Traits, string> = {
  stability: "Requirement stability",
  regulatory: "Regulatory criticality",
  security: "Security risk",
  complexity: "Project complexity",
  change: "Expected change frequency",
  delivery: "Need for continuous delivery",
  formality: "Testing and documentation formality",
  failure: "Failure consequence",
};

// Same rule and the same seven models as backend/rules.py: score = base + Σ weight × level, capped to 5–97.
type Model = { model: string; base: number; weights: Partial<Record<keyof Traits, number>>; fit: string; miss: string };

const MODELS: Model[] = [
  { model: "V-Model", base: 50, weights: { stability: 8, regulatory: 8, formality: 7, failure: 5, change: -8, delivery: -6 },
    fit: "pairs every build phase with a test phase, so traceability and audit evidence come out of the process itself",
    miss: "rigid once a phase closes; late requirement changes are expensive" },
  { model: "Waterfall", base: 50, weights: { stability: 10, formality: 5, regulatory: 4, change: -10, delivery: -6, complexity: -3 },
    fit: "simple, document-driven phases suit fixed requirements",
    miss: "testing comes late, so verification evidence arrives after design decisions are locked" },
  { model: "Spiral", base: 57, weights: { failure: 7, complexity: 7, stability: -6, regulatory: 2, delivery: -3 },
    fit: "risk-driven loops handle uncertainty and high failure cost",
    miss: "heavy risk analysis each loop is costly when requirements are already clear" },
  { model: "Prototyping", base: 52, weights: { stability: -8, change: 4, formality: -5, regulatory: -4, failure: -3 },
    fit: "unclear requirements are settled by showing users working mock-ups early",
    miss: "prototypes are thrown away and skip the formal documentation audits need" },
  { model: "Iterative", base: 48, weights: { change: 5, complexity: 5, delivery: 3, regulatory: 2, stability: -2 },
    fit: "a large system is built and refined over repeated full cycles",
    miss: "early cycles deliver partial designs that a strict audit cannot sign off" },
  { model: "Agile", base: 60, weights: { change: 10, delivery: 8, formality: -5, regulatory: -6, stability: -3 },
    fit: "short sprints absorb changing requirements and get feedback early",
    miss: "light documentation clashes with formal audit and sign-off needs" },
  { model: "RAD", base: 52, weights: { change: 6, complexity: -6, failure: -6, regulatory: -6 },
    fit: "fast prototyping for small, low-risk systems",
    miss: "too little rigour for high-risk or regulated systems" },
];

export function planSdlc(srs: Srs, traits: Traits): Sdlc {
  const byCat = (re: RegExp) =>
    srs.requirements
      .filter((r) => re.test(r.category))
      .map((r) => r.id)
      .join(", ") || "—";
  const all = srs.requirements.map((r) => r.id);
  const range = all.length ? `${all[0]}–${all[all.length - 1]}` : "—";

  const ranking = MODELS.map(({ model, base, weights, fit, miss }) => {
    const drivers = (Object.entries(weights) as [keyof Traits, number][])
      .map(([k, w]) => ({ factor: LABEL[k], level: traits[k], points: w * n(traits[k]) }))
      .filter((d) => d.points)
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
    return { model, base, fit, miss, drivers, score: clamp(base + drivers.reduce((sum, d) => sum + d.points, 0)) };
  }).sort((a, b) => b.score - a.score);
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
    ranking,
    chosen: chosen.model,
    justification: `${chosen.model} scores highest (${chosen.score}/100) because it ${chosen.fit}. That matches this project's ${traits.regulatory.toLowerCase()} regulatory criticality, ${traits.stability.toLowerCase()} requirement stability and ${traits.change.toLowerCase()} expected change frequency.`,
  };
}
