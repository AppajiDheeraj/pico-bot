import { Check, ChevronsRight, Download, FileText, GitBranch } from "lucide-react";
import { CREW } from "../data/crew";
import { download, sdlcMarkdown, srsMarkdown } from "../lib/export";
import type { AgentId, Sdlc, Srs, Stage } from "../lib/types";
import { AgentAvatar } from "./Avatar";

const STEPS: { id: Stage; label: string }[] = [
  { id: "intake", label: "Read the brief" },
  { id: "clarify", label: "Clarify with you" },
  { id: "srs", label: "Write the SRS" },
  { id: "handoff", label: "Your approval" },
  { id: "sdlc", label: "Recommend an SDLC" },
  { id: "review", label: "Human review" },
];
const ORDER: Stage[] = ["idle", "intake", "clarify", "srs", "handoff", "sdlc", "review", "done"];

export function RightPanel({ stage, working, srs, sdlc, onClose }: { stage: Stage; working: AgentId[]; srs?: Srs; sdlc?: Sdlc; onClose: () => void }) {
  const at = ORDER.indexOf(stage);
  const picoBusy = stage !== "idle" && stage !== "done" && stage !== "clarify" && stage !== "handoff";
  return (
    <aside className="panel">
      <div className="panel-top">
        <button className="icon-btn" aria-label="Close panel" onClick={onClose}>
          <ChevronsRight size={18} />
        </button>
      </div>
      <div className="panel-hero">
        <AgentAvatar id="pico" size={80} working={picoBusy} asleep={stage === "idle"} />
        <div className="panel-name">Pico</div>
        <span className="tag">Lead</span>
        <div className="presence">
          <span className={`dot ${stage === "idle" ? "muted" : picoBusy ? "accent" : stage === "clarify" || stage === "handoff" ? "warn" : "success"}`} />
          {stage === "idle" ? "Asleep" : picoBusy ? "Working" : stage === "clarify" || stage === "handoff" ? "Waiting for you" : "Online"}
        </div>
        <p className="panel-blurb">{CREW.pico.blurb}</p>
      </div>

      <div className="panel-section">Crew</div>
      <div className="panel-group">
        {(["analyst", "planner"] as const).map((id) => {
          const busy = working.includes(id);
          return (
            <div key={id} className="crew-row">
              <AgentAvatar id={id} size={32} working={busy} />
              <div className="crew-main">
                <div className="crew-name">
                  {CREW[id].name} <span className="tag">{CREW[id].role}</span>
                </div>
                <div className="crew-blurb">{CREW[id].blurb}</div>
              </div>
              <span className={`crew-state ${busy ? "busy" : ""}`}>{busy ? "Working" : "Idle"}</span>
            </div>
          );
        })}
      </div>

      <div className="panel-section">Progress</div>
      <ol className="progress">
        {STEPS.map((s) => {
          const i = ORDER.indexOf(s.id);
          const state = stage === "done" || at > i ? "done" : at === i ? "now" : "todo";
          return (
            <li key={s.id} data-state={state}>
              <span className="progress-dot">{state === "done" ? <Check size={11} strokeWidth={3} /> : null}</span>
              {s.label}
            </li>
          );
        })}
      </ol>

      <div className="panel-section">Documents</div>
      <div className="panel-group">
        {!srs && !sdlc && <div className="panel-empty">Documents Pico writes will appear here.</div>}
        {srs && (
          <button className="doc-row" onClick={() => download(`SRS-${srs.title.replace(/\W+/g, "-")}.md`, srsMarkdown(srs))}>
            <FileText size={18} />
            <span className="doc-row-main">
              <span>Software Requirements Spec</span>
              <span className="muted">{srs.requirements.length} requirements · Markdown</span>
            </span>
            <Download size={15} className="doc-row-dl" />
          </button>
        )}
        {sdlc && (
          <button className="doc-row" onClick={() => download("SDLC-recommendation.md", sdlcMarkdown(sdlc))}>
            <GitBranch size={18} />
            <span className="doc-row-main">
              <span>SDLC recommendation</span>
              <span className="muted">{sdlc.chosen} · Markdown</span>
            </span>
            <Download size={15} className="doc-row-dl" />
          </button>
        )}
      </div>
    </aside>
  );
}
