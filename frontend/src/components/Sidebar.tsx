import { Monitor, Moon, Search, SquarePen, Sun } from "lucide-react";
import { useState } from "react";
import type { ThemePref } from "../lib/theme";
import type { Stage } from "../lib/types";
import { AgentAvatar } from "./Avatar";

export type SessionRow = { id: string; title: string; preview: string; at: number; stage: Stage; unread?: boolean };

const STAGE_DOT: Partial<Record<Stage, string>> = { clarify: "warn", handoff: "warn", done: "success" };

export function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  theme,
  onTheme,
  demo,
}: {
  sessions: SessionRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
  demo: boolean;
}) {
  const [q, setQ] = useState("");
  const shown = sessions.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <label className="search">
          <Search size={16} />
          <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chats" />
        </label>
        <button className="icon-btn round" aria-label="New chat" title="New chat" onClick={onNew}>
          <SquarePen size={17} />
        </button>
      </div>
      <div className="sidebar-section">Chats</div>
      <nav className="session-list">
        {shown.length === 0 && <div className="session-empty">{sessions.length ? "No matches" : "Your chats with Pico show up here."}</div>}
        {shown.map((s) => (
          <button key={s.id} className="session" aria-current={s.id === activeId || undefined} onClick={() => onSelect(s.id)}>
            <AgentAvatar id="pico" size={36} />
            <span className="session-main">
              <span className="session-top">
                <span className="session-title">{s.title}</span>
                <span className="session-time">{new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </span>
              <span className="session-bottom">
                <span className="session-preview">{s.preview}</span>
                {STAGE_DOT[s.stage] && <span className={`dot ${STAGE_DOT[s.stage]}`} />}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <span className="backend-pill" title={demo ? "Scripted demo: no backend or model needed." : "Google ADK backend with LM Studio."}>
          <span className={`dot ${demo ? "warn" : "success"}`} /> {demo ? "Demo mode" : "Live · LM Studio"}
        </span>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {(
            [
              ["system", <Monitor size={14} key="m" />],
              ["light", <Sun size={14} key="s" />],
              ["dark", <Moon size={14} key="d" />],
            ] as const
          ).map(([v, icon]) => (
            <button key={v} role="radio" aria-checked={theme === v} aria-label={`${v} theme`} onClick={() => onTheme(v)}>
              {icon}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
