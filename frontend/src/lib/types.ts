// Shared shapes between the chat UI and the agent runtime.
// The future ADK backend should stream exactly these events (JSON over SSE / WebSocket).

export type AgentId = "pico" | "analyst" | "planner";

export type Priority = "High" | "Medium" | "Low";

export type Requirement = {
  id: string;
  statement: string;
  category: string;
  priority: Priority;
  acceptance: string;
  source: string;
};

export type Srs = {
  title: string;
  summary: string;
  assumptions: string[];
  stakeholders: string[];
  requirements: Requirement[];
  findings: { type: "Ambiguity" | "Incompleteness" | "Undefined term" | "Conflict"; text: string }[];
  traceability: { req: string; test: string; check: string }[];
  risks: { title: string; text: string }[];
  openIssues: string[];
};

export type Level = "Low" | "Medium" | "High";

export type Sdlc = {
  factors: { name: string; value: string; cites: string; implication: string; confidence: Level }[];
  ranking: { model: string; score: number; why: string }[];
  chosen: string;
  justification: string;
  rejected: { model: string; why: string }[];
  workflow: { phase: string; activities: string; roles: string; deliverables: string; gate: string; reqs: string }[];
};

export type Option = { label: string; recommended?: boolean };

export type Question = {
  id: string;
  text: string;
  why?: string;
  options: Option[];
};

export type Answer = { questionId: string; value: string | null };

/** One traced step: an agent model call or a retrieval. Times are epoch seconds. */
export type Step = { name: string; kind: "llm" | "tool"; start: number; end: number; tokens: number; input: string; output: string; error?: string };

export type DelegationMessage = { from: AgentId; to: AgentId; text: string };

export type Stage = "idle" | "intake" | "clarify" | "srs" | "handoff" | "sdlc" | "review" | "done";

export type Item =
  | { kind: "user"; id: string; text: string; at: number }
  | { kind: "bot"; id: string; from: AgentId; text: string; at: number }
  | { kind: "event"; id: string; icon: "wake" | "handoff" | "doc" | "check" | "tool"; text: string; strong?: string; at: number }
  | { kind: "delegation"; id: string; messages: DelegationMessage[]; steps?: Step[]; at: number }
  | { kind: "questions"; id: string; title: string; questions: Question[]; answers?: Answer[]; at: number }
  | {
      kind: "approval";
      id: string;
      from: AgentId;
      title: string;
      status: "pending" | "allowed" | "revise";
      at: number;
    }
  | { kind: "srs"; id: string; srs: Srs; at: number }
  | { kind: "sdlc"; id: string; sdlc: Sdlc; at: number }
  | { kind: "notice"; id: string; title: string; text: string; at: number };

export type AgentEvent =
  | { type: "push"; item: Item }
  | { type: "patch"; id: string; patch: Partial<Item> }
  | { type: "typing"; from: AgentId | null }
  | { type: "stage"; stage: Stage }
  | { type: "working"; agents: AgentId[] };

export interface AgentSession {
  /** Begin a run from the user's brief. Events stream to `emit`. */
  start(brief: string, emit: (e: AgentEvent) => void): void;
  /** User finished (or skipped) a question stack. */
  answer(itemId: string, answers: Answer[]): void;
  /** User allowed or asked to revise a hand-off. */
  decide(itemId: string, decision: "allowed" | "revise", note?: string): void;
  /** A free-text message mid-run (follow-ups after the run is done). */
  say(text: string): void;
  cancel(): void;
}
