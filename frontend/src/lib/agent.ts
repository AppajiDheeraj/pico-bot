// Scripted mock of the agent runtime. Emits the same AgentEvent stream the ADK backend will.
import { SCENARIOS, buildSrs, customScenario, type Scenario, type Traits } from "../data/scenarios";
import { planSdlc } from "./sdlc";
import type { AgentEvent, AgentId, AgentSession, Answer, DelegationMessage, Item, Srs } from "./types";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function pickScenario(brief: string): Scenario {
  return SCENARIOS.find((s) => s.brief === brief || s.label.toLowerCase() === brief.trim().toLowerCase()) ?? customScenario(brief);
}

export function createMockSession(speed = 1): AgentSession {
  let emit: (e: AgentEvent) => void = () => {};
  let cancelled = false;
  let done = false;

  const sleep = (ms: number) =>
    new Promise<void>((res, rej) => setTimeout(() => (cancelled ? rej(new Error("cancelled")) : res()), ms / speed));
  const push = (item: Item) => emit({ type: "push", item });

  async function say(from: AgentId, text: string, think = 700) {
    emit({ type: "typing", from });
    await sleep(think);
    emit({ type: "typing", from: null });
    push({ kind: "bot", id: uid("m"), from, text, at: Date.now() });
  }

  async function delegate(messages: DelegationMessage[], gap = 650) {
    const id = uid("d");
    const shown: DelegationMessage[] = [];
    push({ kind: "delegation", id, messages: shown.slice(), at: Date.now() });
    for (const m of messages) {
      await sleep(gap);
      shown.push(m);
      emit({ type: "patch", id, patch: { messages: shown.slice() } as Partial<Item> });
    }
  }

  async function draftSrs(s: Scenario, answers: Answer[]): Promise<{ srs: Srs; traits: Traits }> {
    const built = buildSrs(s, answers);
    emit({ type: "stage", stage: "srs" });
    push({ kind: "event", id: uid("e"), icon: "doc", text: "Created document", strong: `SRS · ${s.base.title}`, at: Date.now() });
    await sleep(300);
    push({ kind: "srs", id: uid("srs"), srs: built.srs, at: Date.now() });
    return built;
  }

  async function run(brief: string) {
    const s = pickScenario(brief);
    emit({ type: "stage", stage: "intake" });
    push({ kind: "event", id: uid("e"), icon: "wake", text: "Pico is waking up", at: Date.now() });
    await sleep(1100);
    await say("pico", `On it. Reading your brief now — I'll have the **Analyst** pull out the requirements first.`, 900);

    // No clarifying questions: the scripted demo assumes each question's recommended option.
    const answers: Answer[] = s.questions.map((q) => ({ questionId: q.id, value: q.options.find((o) => o.recommended)?.label ?? q.options[0]?.label ?? null }));
    emit({ type: "working", agents: ["analyst"] });
    await delegate([
      { from: "pico", to: "analyst", text: `Brief attached: “${s.label}”. Draft the SRS.` },
      { from: "analyst", to: "pico", text: "Draft ready. Every requirement has an acceptance criterion and a test case." },
    ]);
    emit({ type: "working", agents: [] });

    const built = await draftSrs(s, answers);
    await say("pico", `Here's the SRS: **${built.srs.requirements.length} requirements**, each traced to a test. Sending it to the **SDLC Planner** now.`);

    emit({ type: "stage", stage: "sdlc" });
    push({ kind: "event", id: uid("e"), icon: "handoff", text: "Handed off to", strong: "SDLC Planner", at: Date.now() });
    emit({ type: "working", agents: ["planner"] });
    const sdlc = planSdlc(built.srs, built.traits);
    await delegate(
      [
        { from: "pico", to: "planner", text: `SRS attached (${built.srs.requirements.length} requirements). Recommend a lifecycle and a project-specific workflow.` },
        { from: "planner", to: "pico", text: `Scored ${sdlc.ranking.length} lifecycle models against ${sdlc.factors.length} decision factors from the SRS.` },
        { from: "planner", to: "pico", text: `${sdlc.chosen} leads at ${sdlc.ranking[0].score}/100; ${sdlc.ranking[1].model} is next at ${sdlc.ranking[1].score}.` },
      ],
      800,
    );
    emit({ type: "working", agents: [] });
    push({ kind: "event", id: uid("e"), icon: "doc", text: "Created document", strong: "SDLC recommendation", at: Date.now() });
    await sleep(300);
    push({ kind: "sdlc", id: uid("s"), sdlc, at: Date.now() });

    emit({ type: "stage", stage: "review" });
    await say("pico", `Done. **${sdlc.chosen}** fits best: ${sdlc.workflow.length} phases, each with an entry/exit gate tied to the requirement IDs. Both documents are in the panel on the right if you want to export them.`, 900);
    push({
      kind: "notice",
      id: uid("n"),
      title: "Needs human review",
      text: "Regulatory interpretation and the final SDLC choice must be checked and approved by a qualified person before this is used. Treat it as a draft.",
      at: Date.now(),
    });
    emit({ type: "stage", stage: "done" });
    done = true;
  }

  return {
    start(brief, e) {
      emit = e;
      run(brief).catch(() => {});
    },
    say() {
      const reply = done ? "This run is finished. Start a new chat for another brief." : "Got it. I'm still working on this brief.";
      say("pico", reply, 500).catch(() => {});
    },
    cancel() {
      cancelled = true;
    },
  };
}
