import type { AgentId } from "../lib/types";

export type CrewMember = { id: AgentId; name: string; role: string; /** bloub shape and colour ids (src/bloub/skins.ts) */ shape: string; color: string; blurb: string };

export const CREW: Record<AgentId, CrewMember> = {
  pico: { id: "pico", name: "Pico", role: "Lead", shape: "cercle", color: "encre", blurb: "Your one point of contact. Runs the crew and only brings you what needs a decision." },
  analyst: { id: "analyst", name: "Analyst", role: "Requirements", shape: "goutte", color: "bleu", blurb: "Extracts requirements, spots gaps and writes the SRS." },
  planner: { id: "planner", name: "SDLC Planner", role: "Lifecycle", shape: "triangle", color: "rose", blurb: "Reads the SRS and recommends a lifecycle with gates." },
};
