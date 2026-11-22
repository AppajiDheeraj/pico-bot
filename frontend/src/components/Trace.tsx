// Agent trace: a "N steps · 12s ›" chip under a delegation row, opening a timeline of every model call and retrieval.
import { ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Step } from "../lib/types";

const secs = (s: number) => (s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`);
const span = (steps: Step[]) => (steps.length ? Math.max(...steps.map((s) => s.end)) - Math.min(...steps.map((s) => s.start)) : 0);

export function TraceChip({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <>
      <button className="trace-chip" onClick={() => setOpen(true)}>
        {steps.length} step{steps.length > 1 ? "s" : ""} <span>{secs(span(steps))}</span>
        <ChevronRight size={14} />
      </button>
      {open && createPortal(<TraceModal steps={steps} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

export function TraceModal({ steps, onClose }: { steps: Step[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const t0 = Math.min(...steps.map((s) => s.start));
  const total = Math.max(span(steps), 0.1);
  const slowest = steps.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const ticks = useMemo(() => {
    const every = [1, 2, 5, 10, 15, 30, 60].find((x) => total / x <= 6) ?? 120;
    return Array.from({ length: Math.floor(total / every) + 1 }, (_, i) => i * every);
  }, [total]);
  const shown = steps.map((s, i) => [s, i] as const).filter(([s]) => (s.name + s.input + s.output).toLowerCase().includes(query.toLowerCase()));
  const llm = steps.filter((s) => s.kind === "llm");
  const stats: [string, string][] = [
    ["Duration", secs(total)],
    ["Cost", "$0 · local"],
    ["Tokens", llm.reduce((n, s) => n + s.tokens, 0).toLocaleString()],
    ["LLM calls", String(llm.length)],
    ["Tool calls", String(steps.length - llm.length)],
    ["Errors", String(steps.filter((s) => s.error).length)],
  ];

  return (
    <div className="trace-scrim" onClick={onClose}>
      <div className="trace" role="dialog" aria-label="Trace" onClick={(e) => e.stopPropagation()}>
        <header className="trace-head">
          <strong>Trace</strong>
          <label className="trace-search">
            <Search size={14} />
            <input autoFocus placeholder="Search steps" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className="icon-btn" aria-label="Close trace" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="trace-stats">
          {stats.map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <div className="trace-grid">
          <div className="trace-axis">
            <span>Steps</span>
            <div className="trace-lane">
              {ticks.map((t) => (
                <span key={t} style={{ left: `${(t / total) * 100}%` }}>
                  {t}s
                </span>
              ))}
            </div>
          </div>
          {shown.map(([s, i]) => {
            const d = s.end - s.start;
            return (
              <div key={i} className="trace-step">
                <button className="trace-row" data-open={picked === i || undefined} onClick={() => setPicked(picked === i ? null : i)}>
                  <span className="trace-name">
                    <i className={`trace-dot ${s.error ? "failed" : s.kind}`} />
                    {s.name}
                  </span>
                  <div className="trace-lane">
                    <div className={`trace-bar ${s.error ? "failed" : s.kind}`} style={{ left: `${((s.start - t0) / total) * 100}%`, width: `max(${(d / total) * 100}%, 3px)` }} />
                    <span className="trace-dur" style={{ left: `${((s.end - t0) / total) * 100}%` }}>
                      {secs(d)}
                      {s.tokens > 0 && ` · ${s.tokens.toLocaleString()} tok`}
                      {s === slowest && steps.length > 1 && <em>Slowest</em>}
                    </span>
                  </div>
                </button>
                {picked === i && (
                  <div className="trace-detail">
                    {s.error && <p className="trace-error">{s.error}</p>}
                    <h4>Input</h4>
                    <pre>{s.input}</pre>
                    <h4>{s.kind === "tool" ? "Retrieved chunks" : "Output"}</h4>
                    <pre>{pretty(s.output)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <footer className="trace-legend">
          <span><i className="trace-dot llm" />Model call</span>
          <span><i className="trace-dot tool" />Tool call</span>
          <span><i className="trace-dot failed" />Failed</span>
        </footer>
      </div>
    </div>
  );
}

function pretty(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text || "—";
  }
}
