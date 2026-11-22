import { Check, ChevronDown, Download, FileText, GitBranch, Loader, RotateCcw, ShieldAlert, Trophy } from "lucide-react";
import { useState } from "react";
import { download, sdlcMarkdown, srsMarkdown } from "../lib/export";
import type { Item, Requirement, Sdlc, Srs } from "../lib/types";

type Approval = Extract<Item, { kind: "approval" }>;

export function ApprovalCard({ item, onDecide }: { item: Approval; onDecide: (d: "allowed" | "revise") => void }) {
  const [open, setOpen] = useState(true);
  const pending = item.status === "pending";
  return (
    <div className="stacked" data-active={pending || undefined}>
      {pending && (
        <>
          <div className="qstack-ghost" style={{ ["--i" as string]: 1 }} aria-hidden />
          <div className="qstack-ghost" style={{ ["--i" as string]: 2 }} aria-hidden />
        </>
      )}
      <div className="card approval">
        <div className="approval-head">
          <div className="approval-title">{item.title}</div>
          {pending ? (
            <span className="status-pill warn">
              <Loader size={13} className="spin" /> Approval needed
            </span>
          ) : item.status === "allowed" ? (
            <span className="status-pill success">
              <Check size={12} strokeWidth={3} /> Allowed
            </span>
          ) : (
            <span className="status-pill neutral">
              <RotateCcw size={12} /> Revision requested
            </span>
          )}
        </div>
        <div className="approval-sub">{item.subtitle}</div>
        <button className="disclosure" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <ChevronDown size={14} className="disclosure-chev" /> {open ? "Hide the breakdown" : "Show the breakdown"}
        </button>
        {open && (
          <div className="breakdown">
            {item.breakdown.map(([k, v], i) => (
              <div key={k} className="breakdown-row" data-total={i === item.breakdown.length - 1 || undefined}>
                <span>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="approval-foot">{item.footnote}</div>
        {pending && (
          <div className="approval-actions">
            <button className="btn light" onClick={() => onDecide("allowed")}>
              Allow
            </button>
            <button className="btn secondary" onClick={() => onDecide("revise")}>
              Revise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className="tab" onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function PriorityBadge({ p }: { p: Requirement["priority"] }) {
  return <span className={`badge prio-${p.toLowerCase()}`}>{p}</span>;
}

function DocHead({ icon, title, meta, onExport }: { icon: React.ReactNode; title: string; meta: string; onExport: () => void }) {
  return (
    <div className="doc-head">
      <span className="doc-icon">{icon}</span>
      <div className="doc-title-wrap">
        <div className="doc-title">{title}</div>
        <div className="doc-meta">{meta}</div>
      </div>
      <button className="btn secondary sm" onClick={onExport}>
        <Download size={14} /> Export
      </button>
    </div>
  );
}

export function SrsCard({ srs }: { srs: Srs }) {
  const [tab, setTab] = useState<"reqs" | "quality" | "trace" | "risks" | "overview">("reqs");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const rows = all ? srs.requirements : srs.requirements.slice(0, 6);
  return (
    <div className="card doc">
      <DocHead
        icon={<FileText size={18} />}
        title={`SRS · ${srs.title}`}
        meta={`${srs.requirements.length} requirements · ${srs.findings.length} findings · ${srs.openIssues.length} open issues`}
        onExport={() => download(`SRS-${srs.title.replace(/\W+/g, "-")}.md`, srsMarkdown(srs))}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "reqs", label: "Requirements", count: srs.requirements.length },
          { id: "quality", label: "Quality", count: srs.findings.length },
          { id: "trace", label: "Traceability" },
          { id: "risks", label: "Risks & issues" },
          { id: "overview", label: "Overview" },
        ]}
      />
      <div className="doc-body">
        {tab === "reqs" && (
          <>
            <div className="req-list">
              {rows.map((r) => (
                <div key={r.id} className="req" data-open={openRow === r.id || undefined}>
                  <button className="req-row" onClick={() => setOpenRow(openRow === r.id ? null : r.id)} aria-expanded={openRow === r.id}>
                    <span className="req-id">{r.id}</span>
                    <span className="req-text">{r.statement}</span>
                    <span className="req-cat">{r.category}</span>
                    <PriorityBadge p={r.priority} />
                    <ChevronDown size={14} className="req-chev" />
                  </button>
                  {openRow === r.id && (
                    <div className="req-detail">
                      <div>
                        <span className="label">Acceptance</span>
                        {r.acceptance}
                      </div>
                      <div>
                        <span className="label">Evidence</span>
                        <code>{r.source}</code>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {srs.requirements.length > 6 && (
              <button className="show-more" onClick={() => setAll((a) => !a)}>
                {all ? "Show fewer" : `Show all ${srs.requirements.length}`}
              </button>
            )}
          </>
        )}
        {tab === "quality" && (
          <ul className="finding-list">
            {srs.findings.map((f, i) => (
              <li key={i}>
                <span className={`badge find-${f.type.split(" ")[0].toLowerCase()}`}>{f.type}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "trace" && (
          <table className="grid">
            <thead>
              <tr>
                <th>Req</th>
                <th>Test</th>
                <th>Checks</th>
              </tr>
            </thead>
            <tbody>
              {srs.traceability.map((t) => (
                <tr key={t.req}>
                  <td>
                    <span className="req-id">{t.req}</span>
                  </td>
                  <td className="mono">{t.test}</td>
                  <td>{t.check}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "risks" && (
          <div className="two-col">
            <div>
              <div className="section-label">Risks</div>
              <ul className="plain-list">
                {srs.risks.map((r) => (
                  <li key={r.title}>
                    <strong>{r.title}.</strong> {r.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="section-label">Open issues</div>
              <ul className="plain-list">{srs.openIssues.length ? srs.openIssues.map((o) => <li key={o}>{o}</li>) : <li className="muted">None</li>}</ul>
            </div>
          </div>
        )}
        {tab === "overview" && (
          <div className="overview">
            <p>{srs.summary}</p>
            <div className="two-col">
              <div>
                <div className="section-label">Stakeholders</div>
                <div className="chips">
                  {srs.stakeholders.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-label">Assumptions</div>
                <ul className="plain-list">
                  {srs.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SdlcCard({ sdlc }: { sdlc: Sdlc }) {
  const [tab, setTab] = useState<"ranking" | "workflow" | "factors" | "rejected">("ranking");
  const top = sdlc.ranking[0];
  return (
    <div className="card doc">
      <DocHead
        icon={<GitBranch size={18} />}
        title="SDLC recommendation"
        meta={`${sdlc.ranking.length} models scored · ${sdlc.factors.length} decision factors`}
        onExport={() => download("SDLC-recommendation.md", sdlcMarkdown(sdlc))}
      />
      <div className="verdict">
        <div className="score-ring" style={{ ["--p" as string]: top.score }}>
          <span>{top.score}</span>
        </div>
        <div className="verdict-text">
          <div className="verdict-label">
            <Trophy size={13} /> Recommended lifecycle
          </div>
          <div className="verdict-model">{sdlc.chosen}</div>
          <p>{sdlc.justification}</p>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "ranking", label: "Ranking" },
          { id: "workflow", label: "Workflow", count: sdlc.workflow.length },
          { id: "factors", label: "Decision factors", count: sdlc.factors.length },
          { id: "rejected", label: "Rejected" },
        ]}
      />
      <div className="doc-body">
        {tab === "ranking" && (
          <div className="bars">
            {sdlc.ranking.map((r, i) => (
              <div key={r.model} className="bar-row" data-top={i === 0 || undefined}>
                <span className="bar-name">{r.model}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${r.score}%`, animationDelay: `${i * 60}ms` }} />
                </span>
                <span className="bar-score">{r.score}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "workflow" && (
          <ol className="steps">
            {sdlc.workflow.map((w, i) => (
              <li key={w.phase} className="step">
                <span className="step-dot">{i + 1}</span>
                <div className="step-body">
                  <div className="step-title">{w.phase}</div>
                  <div className="step-text">{w.activities}</div>
                  <div className="step-meta">
                    <span>
                      <span className="label">Roles</span>
                      {w.roles}
                    </span>
                    <span>
                      <span className="label">Delivers</span>
                      {w.deliverables}
                    </span>
                    <span>
                      <span className="label">Reqs</span>
                      {w.reqs}
                    </span>
                  </div>
                  <div className="gate">
                    <ShieldAlert size={12} /> Exit gate: {w.gate}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        {tab === "factors" && (
          <table className="grid">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Value</th>
                <th>Cites</th>
                <th>Implication</th>
              </tr>
            </thead>
            <tbody>
              {sdlc.factors.map((f) => (
                <tr key={f.name}>
                  <td>{f.name}</td>
                  <td>
                    <span className={`badge level-${f.value.toLowerCase()}`}>{f.value}</span>
                  </td>
                  <td className="mono">{f.cites}</td>
                  <td>{f.implication}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "rejected" && (
          <ul className="plain-list">
            {sdlc.rejected.map((r) => (
              <li key={r.model}>
                <strong>{r.model}:</strong> {r.why}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
