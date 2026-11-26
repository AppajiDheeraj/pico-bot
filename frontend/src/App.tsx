import { Activity, PanelLeft, PanelRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentAvatar } from "./components/Avatar";
import { Composer } from "./components/Composer";
import { RightPanel } from "./components/RightPanel";
import { Sidebar, type SessionRow } from "./components/Sidebar";
import { StartScreen } from "./components/StartScreen";
import { TraceModal } from "./components/Trace";
import { Transcript } from "./components/Transcript";
import { createMockSession } from "./lib/agent";
import { createHttpSession } from "./lib/http";
import { useThemePref } from "./lib/theme";
import type { AgentEvent, AgentId, AgentSession, Item, Stage } from "./lib/types";

// VITE_AGENT=mock runs the scripted demo (no backend or GPU needed); default is the real backend.
const DEMO = import.meta.env.VITE_AGENT === "mock";

type Session = { id: string; title: string; items: Item[]; typing: AgentId | null; stage: Stage; working: AgentId[]; at: number };

const STAGE_LABEL: Record<Stage, string> = {
  idle: "Asleep",
  intake: "Reading the brief",
  srs: "Writing the SRS",
  sdlc: "Planning the SDLC",
  review: "Wrapping up",
  done: "Done",
};

function apply(s: Session, e: AgentEvent): Session {
  switch (e.type) {
    case "push":
      return { ...s, items: [...s.items, e.item] };
    case "patch":
      return { ...s, items: s.items.map((it) => (it.id === e.id ? ({ ...it, ...e.patch } as Item) : it)) };
    case "typing":
      return { ...s, typing: e.from };
    case "stage":
      return { ...s, stage: e.stage };
    case "working":
      return { ...s, working: e.agents };
  }
}

function preview(s: Session): string {
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    if (it.kind === "bot" || it.kind === "user") return it.text.replace(/\*\*/g, "");
  }
  return "";
}

export default function App() {
  const [theme, setTheme] = useThemePref();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 1180);
  const [navOpen, setNavOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const agents = useRef(new Map<string, AgentSession>());
  const scroller = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeId) ?? null;

  const start = useCallback((brief: string, label: string) => {
    const id = `s-${Date.now().toString(36)}`;
    const title = label.length > 48 ? label.slice(0, 46) + "…" : label;
    const at = Date.now();
    setSessions((all) => [{ id, title, items: [{ kind: "user", id: `${id}-u`, text: brief, at }], typing: null, stage: "intake", working: [], at }, ...all]);
    setActiveId(id);
    setNavOpen(false);
    const agent = DEMO ? createMockSession() : createHttpSession();
    agents.current.set(id, agent);
    agent.start(brief, (e) => setSessions((all) => all.map((s) => (s.id === id ? apply(s, e) : s))));
  }, []);

  const send = (text: string) => {
    if (!active) return start(text, text);
    setSessions((all) => all.map((s) => (s.id === active.id ? { ...s, items: [...s.items, { kind: "user", id: `u-${Date.now()}`, text, at: Date.now() }] } : s)));
    agents.current.get(active.id)?.say(text);
  };

  // Keep the newest message in view unless the user scrolled up to read.
  const pinned = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (!active) el.scrollTo({ top: 0 });
    else if (pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active?.items, active?.typing]);

  useEffect(() => () => agents.current.forEach((a) => a.cancel()), []);

  const srs = active?.items.findLast((i) => i.kind === "srs");
  const sdlc = active?.items.findLast((i) => i.kind === "sdlc");
  const steps = active?.items.flatMap((i) => (i.kind === "delegation" ? i.steps ?? [] : [])) ?? [];
  const rows: SessionRow[] = sessions.map((s) => ({ id: s.id, title: s.title, preview: preview(s), at: s.at, stage: s.stage }));

  return (
    <div className="app" data-panel={panelOpen || undefined} data-nav={navOpen || undefined}>
      <Sidebar
        sessions={rows}
        activeId={activeId}
        onSelect={(id) => (setActiveId(id), setNavOpen(false))}
        onNew={() => (setActiveId(null), setNavOpen(false))}
        theme={theme}
        onTheme={setTheme}
        demo={DEMO}
      />
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <main className="chat">
        <header className="chat-header">
          <button className="icon-btn nav-toggle" aria-label="Open chats" onClick={() => setNavOpen(true)}>
            <PanelLeft size={18} />
          </button>
          <AgentAvatar id="pico" size={24} working={!!active && active.working.length > 0} />
          <span className="chat-title">{active ? active.title : "Pico"}</span>
          {active && <span className="tag">{STAGE_LABEL[active.stage]}</span>}
          <span className="spacer" />
          {steps.length > 0 && (
            <button className="icon-btn round" aria-label="Show run trace" title="Run trace" onClick={() => setTraceOpen(true)}>
              <Activity size={18} />
            </button>
          )}
          <button className="icon-btn round" aria-label={panelOpen ? "Hide details" : "Show details"} aria-pressed={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
            <PanelRight size={18} />
          </button>
        </header>
        <div
          className="chat-scroll"
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
        >
          {active ? (
            <Transcript
              items={active.items}
              typing={active.typing}
            />
          ) : (
            <StartScreen onStart={start} />
          )}
        </div>
        <Composer placeholder={active ? "Message Pico" : "Describe the system you want specified…"} onSend={send} />
      </main>
      {traceOpen && steps.length > 0 && <TraceModal steps={steps} onClose={() => setTraceOpen(false)} />}
      {panelOpen && <div className="panel-scrim" onClick={() => setPanelOpen(false)} />}
      {panelOpen && (
        <RightPanel
          stage={active?.stage ?? "idle"}
          working={active?.working ?? []}
          srs={srs?.kind === "srs" ? srs.srs : undefined}
          sdlc={sdlc?.kind === "sdlc" ? sdlc.sdlc : undefined}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
