import { ChevronDown, Download, FileText, GitBranch, Trophy } from "lucide-react";
import { useState } from "react";
import { download, sdlcMarkdown, srsMarkdown } from "../lib/export";
import type { Sdlc, Srs } from "../lib/types";

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
  const [tab, setTab] = useState<"ranking" | "factors">("ranking");
  const [openModel, setOpenModel] = useState<string | null>(sdlc.ranking[0].model);
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
          { id: "ranking", label: "Why this model" },
          { id: "factors", label: "Decision factors", count: sdlc.factors.length },
        ]}
      />
      <div className="doc-body">
        {tab === "ranking" && (
          <div className="bars">
            <p className="doc-note">Click a model to see why it was or wasn’t chosen.</p>
            {sdlc.ranking.map((r, i) => (
              <div key={r.model}>
                <button className="bar-row" data-top={i === 0 || undefined} aria-expanded={openModel === r.model} onClick={() => setOpenModel((m) => (m === r.model ? null : r.model))}>
                  <span className="bar-name">{r.model}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${r.score}%`, animationDelay: `${i * 60}ms` }} />
                  </span>
                  <span className="bar-score">{r.score}</span>
                </button>
                {openModel === r.model && (
                  <div className="bar-detail">
                    <div>
                      <strong>Good at:</strong> {r.fit}.
                    </div>
                    <div>
                      <strong>{i === 0 ? "Watch out:" : "Not chosen:"}</strong> {r.miss}.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
      </div>
    </div>
  );
}
