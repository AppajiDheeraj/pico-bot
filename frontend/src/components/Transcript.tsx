import { ArrowRightLeft, ChevronDown, Clock, FileText, Moon, TriangleAlert, Wrench } from "lucide-react";
import { useState } from "react";
import { CREW } from "../data/crew";
import { Inline } from "../lib/inline";
import type { AgentId, Item } from "../lib/types";
import { AgentAvatar, FaceStack } from "./Avatar";
import { SdlcCard, SrsCard } from "./Cards";
import { TraceChip } from "./Trace";

type Props = {
  items: Item[];
  typing: AgentId | null;
};

const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function Transcript({ items, typing }: Props) {
  return (
    <div className="transcript">
      {items.length > 0 && <div className="time-sep">Today {fmtTime(items[0].at)}</div>}
      {items.map((it, i) => {
        const next = items[i + 1];
        const lastOfRun = it.kind === "bot" && !(next?.kind === "bot" && next.from === it.from) && !(typing === it.from && !next);
        return <Row key={it.id} item={it} showAvatar={lastOfRun} />;
      })}
      {typing && (
        <div className="row bot enter">
          <span className="row-avatar">
            <AgentAvatar id={typing} size={28} typing />
          </span>
          <div className="bubble bubble-bot typing" aria-label={`${CREW[typing].name} is typing`}>
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ item, showAvatar }: { item: Item; showAvatar: boolean }) {
  switch (item.kind) {
    case "user":
      return (
        <div className="row user enter">
          <div className="bubble bubble-user">{item.text}</div>
        </div>
      );
    case "bot":
      return (
        <div className="row bot enter">
          <span className="row-avatar">{showAvatar && <AgentAvatar id={item.from} size={28} />}</span>
          <div className="bubble bubble-bot">
            <Inline text={item.text} />
          </div>
        </div>
      );
    case "event":
      return <EventRow item={item} />;
    case "delegation":
      return <Delegation item={item} />;
    case "srs":
      return (
        <div className="row bot full enter">
          <span className="row-avatar" />
          <SrsCard srs={item.srs} />
        </div>
      );
    case "sdlc":
      return (
        <div className="row bot full enter">
          <span className="row-avatar" />
          <SdlcCard sdlc={item.sdlc} />
        </div>
      );
    case "notice":
      return (
        <div className="row bot wide enter">
          <span className="row-avatar" />
          <div className="card notice" role="note">
            <TriangleAlert size={18} />
            <div>
              <div className="notice-title">{item.title}</div>
              <div className="notice-text">{item.text}</div>
            </div>
          </div>
        </div>
      );
  }
}

function EventRow({ item }: { item: Extract<Item, { kind: "event" }> }) {
  const icon =
    item.icon === "wake" ? <Moon size={14} /> : item.icon === "handoff" ? <ArrowRightLeft size={14} /> : item.icon === "doc" ? <FileText size={14} /> : item.icon === "tool" ? <Wrench size={14} /> : <Clock size={14} />;
  if (item.icon === "wake")
    return (
      <div className="event wake enter">
        <span className="wake-face">
          <AgentAvatar id="pico" size={18} asleep />
        </span>
        <span className="shimmer">{item.text}</span>
      </div>
    );
  return (
    <div className="event enter">
      <span className="event-text">{item.text}</span>
      <span className="event-icon">{icon}</span>
      {item.strong && <strong>{item.strong}</strong>}
    </div>
  );
}

function Delegation({ item }: { item: Extract<Item, { kind: "delegation" }> }) {
  const [open, setOpen] = useState(false);
  const others = [...new Set(item.messages.flatMap((m) => [m.from, m.to]).filter((a) => a !== "pico"))] as AgentId[];
  const names = others.map((a) => CREW[a].name);
  const label = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "the crew";
  const n = item.messages.length;
  return (
    <div className="delegation enter" data-open={open || undefined}>
      <button className="event delegation-head" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={n === 0}>
        {n === 0 ? (
          <span className="shimmer">Briefing the crew…</span>
        ) : (
          <>
            <span className="event-text">
              {n} message{n > 1 ? "s" : ""} with
            </span>
            <FaceStack ids={others} size={18} />
            <strong>{label}</strong>
            <ChevronDown size={14} className="disclosure-chev" />
          </>
        )}
      </button>
      <TraceChip steps={item.steps ?? []} />
      {open && (
        <div className="thread">
          {item.messages.map((m, i) => (
            <div key={i} className="thread-msg">
              <AgentAvatar id={m.from} size={20} />
              <div>
                <div className="thread-who">
                  {CREW[m.from].name} <span>→ {CREW[m.to].name}</span>
                </div>
                <div className="thread-text">{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
