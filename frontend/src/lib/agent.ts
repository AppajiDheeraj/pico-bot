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
  const waiters = new Map<string, (v: unknown) => void>();
  let pendingRevision: ((text: string) => void) | null = null;
  let done = false;

  const sleep = (ms: number) =>
    new Promise<void>((res, rej) => setTimeout(() => (cancelled ? rej(new Error("cancelled")) : res()), ms / speed));
  const push = (item: Item) => emit({ type: "push", item });
  const wait = <T,>(id: string) => new Promise<T>((res) => waiters.set(id, res as (v: unknown) => void));

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

  async function draftSrs(s: Scenario, answers: Answer[], extra: string[], version: number): Promise<{ srs: Srs; traits: Traits }> {
    const built = buildSrs(s, answers);
    extra.forEach((text) => {
      const id = `R${built.srs.requirements.length + 1}`;
      built.srs.requirements.push({ id, statement: text.replace(/^./, (c) => c.toUpperCase()).replace(/([^.])$/, "$1."), category: "User-requested", priority: "Medium", acceptance: "Acceptance criterion to be agreed with the product owner.", source: "chat:revision" });
      built.srs.traceability.push({ req: id, test: `TC${String(built.srs.requirements.length).padStart(3, "0")}`, check: "Pending acceptance criterion" });
    });
    emit({ type: "stage", stage: "srs" });
    push({ kind: "event", id: uid("e"), icon: "doc", text: version > 1 ? "Updated document" : "Created document", strong: `SRS v${version} · ${s.base.title}`, at: Date.now() });
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

    let extra: string[] = [];
    let version = 1;
    let built = await draftSrs(s, answers, extra, version);

    for (;;) {
      await say("pico", `Here's the SRS: **${built.srs.requirements.length} requirements**, each traced to a test. Shall I send it to the **SDLC Planner**?`);
      emit({ type: "stage", stage: "handoff" });
      const aid = uid("a");
      push({
        kind: "approval",
        id: aid,
        from: "pico",
        title: "Send it to the SDLC Planner for a lifecycle recommendation.",
        status: "pending",
        at: Date.now(),
      });
      const decision = await wait<"allowed" | "revise">(aid);
      emit({ type: "patch", id: aid, patch: { status: decision } as Partial<Item> });
      if (decision === "allowed") break;
      await say("pico", "Sure. Tell me what to add or change and I'll redo the draft.", 500);
      const text = await new Promise<string>((res) => (pendingRevision = res));
      pendingRevision = null;
      extra = [...extra, text];
      version += 1;
      emit({ type: "working", agents: ["analyst"] });
      await delegate([
        { from: "pico", to: "analyst", text: `Revision: “${text}”. Add it and refresh the matrix.` },
        { from: "analyst", to: "pico", text: "Done. Added as a user-requested requirement." },
      ]);
      emit({ type: "working", agents: [] });
      built = await draftSrs(s, answers, extra, version);
    }

    emit({ type: "stage", stage: "sdlc" });
    push({ kind: "event", id: uid("e"), icon: "handoff", text: "Handed off to", strong: "SDLC Planner", at: Date.now() });
    emit({ type: "working", agents: ["planner"] });
    const sdlc = planSdlc(built.srs, built.traits);
    await delegate(
      [
        { from: "pico", to: "planner", text: `SRS v${version} attached (${built.srs.requirements.length} requirements). Recommend a lifecycle and a project-specific workflow.` },
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
    answer(id, answers) {
      waiters.get(id)?.(answers);
      waiters.delete(id);
    },
    decide(id, decision) {
      waiters.get(id)?.(decision);
      waiters.delete(id);
    },
    say(text) {
      if (pendingRevision) return pendingRevision(text);
      const reply = done
        ? "Follow-up edits will work once the backend is connected. For now, start a new chat to run another brief."
        : waiters.size
          ? "Answer the card above first — I'll pick this up right after."
          : "Noted. I'll fold that in once I'm done with this step.";
      say("pico", reply, 500).catch(() => {});
    },
    cancel() {
      cancelled = true;
    },
  };
}
