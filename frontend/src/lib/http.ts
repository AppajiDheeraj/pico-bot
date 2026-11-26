// Real backend client: same AgentSession interface as the mock, over HTTP + server-sent events.
import type { AgentSession } from "./types";

export function createHttpSession(): AgentSession {
  let id = "";
  let source: EventSource | null = null;
  let fail: (why: string) => void = () => {};
  const reply = (body: object) =>
    fetch(`/api/sessions/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.ok || fail(`the server answered ${r.status}`))
      .catch(() => fail("the backend is not reachable"));

  return {
    start(brief, emit) {
      fail = (why) => {
        emit({ type: "working", agents: [] });
        emit({ type: "push", item: { kind: "bot", id: `err-${Date.now()}`, from: "pico", at: Date.now(), text: `I can't continue: ${why}. Start the backend (\`uvicorn server:app\` in backend/) and LM Studio, then try again.` } });
        emit({ type: "stage", stage: "done" });
      };
      fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief }) })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((r: { id: string }) => {
          id = r.id;
          source = new EventSource(`/api/sessions/${id}/events`);
          source.onmessage = (m) => emit(JSON.parse(m.data));
        })
        .catch(() => fail("the backend is not reachable"));
    },
    say: (text) => void reply({ text }),
    cancel: () => source?.close(),
  };
}
