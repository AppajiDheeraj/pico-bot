import { ArrowLeft, Check, CornerDownLeft, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Answer, Question } from "../lib/types";

const KEYS = "ABCDEFGH";

type Props = {
  questions: Question[];
  /** Present once submitted: the card collapses into a read-only summary. */
  answers?: Answer[];
  onSubmit: (answers: Answer[]) => void;
  /** Ends with a review screen and a final Submit. Off for single-question pickers. */
  review?: boolean;
  submitLabel?: string;
  placeholder?: string;
  onClose?: () => void;
};

export function QuestionStack({ questions, answers, onSubmit, review = true, submitLabel = "Submit", placeholder = "Type your own answer", onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [custom, setCustom] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewing = review && index >= questions.length;
  const q = questions[Math.min(index, questions.length - 1)];

  // Restore the previous answer when stepping back to a question.
  useEffect(() => {
    if (reviewing || !q) return;
    const prev = draft[q.id];
    const opt = q.options.findIndex((o) => o.label === prev);
    setPicked(opt >= 0 ? opt : null);
    setCustom(prev != null && opt < 0 ? prev : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function commit(value: string | null) {
    const next = { ...draft, [q.id]: value };
    setDraft(next);
    setDir("fwd");
    if (!review && index === questions.length - 1) {
      onSubmit(questions.map((qq) => ({ questionId: qq.id, value: next[qq.id] ?? null })));
      return;
    }
    setIndex((i) => i + 1);
  }

  function choose(i: number) {
    setPicked(i);
    setCustom("");
    window.setTimeout(() => commit(q.options[i].label), 170);
  }

  // Letter keys pick an option while the card is the active one.
  useEffect(() => {
    if (answers || reviewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("textarea, input")) return;
      const k = KEYS.indexOf(e.key.toUpperCase());
      if (k >= 0 && k < q.options.length) {
        e.preventDefault();
        choose(k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (answers) return <AnsweredSummary questions={questions} answers={answers} />;

  const remaining = Math.max(0, Math.min(3, questions.length - index - (reviewing ? 0 : 1)));
  const answeredCount = Object.values(draft).filter((v) => v != null).length;

  return (
    <div className="qstack" data-behind={remaining}>
      {Array.from({ length: remaining }).map((_, i) => (
        <div key={i} className="qstack-ghost" style={{ ["--i" as string]: i + 1 }} aria-hidden />
      ))}
      <div className="qcard" key={reviewing ? "review" : q.id} data-dir={dir}>
        {reviewing ? (
          <>
            <div className="qcard-head">
              <div className="qcard-title">Ready to send?</div>
              <span className="qcard-count">
                {answeredCount} of {questions.length} answered
              </span>
            </div>
            <ul className="qreview">
              {questions.map((qq, i) => (
                <li key={qq.id}>
                  <div className="qreview-q">{qq.text}</div>
                  <div className="qreview-a" data-skipped={draft[qq.id] == null || undefined}>
                    {draft[qq.id] ?? "Skipped"}
                  </div>
                  <button
                    className="icon-btn sm"
                    aria-label={`Edit answer to: ${qq.text}`}
                    onClick={() => {
                      setDir("back");
                      setIndex(i);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="qcard-foot">
              <button
                className="btn ghost"
                onClick={() => {
                  setDir("back");
                  setIndex(questions.length - 1);
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <span className="spacer" />
              <button className="btn primary" onClick={() => onSubmit(questions.map((qq) => ({ questionId: qq.id, value: draft[qq.id] ?? null })))}>
                {submitLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="qcard-head">
              <div className="qcard-title">{q.text}</div>
              {questions.length > 1 && (
                <span className="qcard-count">
                  {index + 1} of {questions.length}
                </span>
              )}
              {onClose && (
                <button className="icon-btn sm" aria-label="Close" onClick={onClose}>
                  ×
                </button>
              )}
            </div>
            {q.why && <div className="qcard-why">{q.why}</div>}
            <div className="qopts" role="listbox" aria-label={q.text}>
              {q.options.map((o, i) => (
                <button key={o.label} role="option" aria-selected={picked === i} className="qopt" data-picked={picked === i || undefined} onClick={() => choose(i)}>
                  <span className="qopt-key">{KEYS[i]}</span>
                  <span className="qopt-label">{o.label}</span>
                  {o.recommended && <span className="qopt-tag">Suggested</span>}
                  <span className="qopt-check">{picked === i && <Check size={14} strokeWidth={2.5} />}</span>
                </button>
              ))}
            </div>
            <form
              className="qcustom"
              onSubmit={(e) => {
                e.preventDefault();
                const v = custom.trim();
                if (v) commit(v);
                else if (picked != null) commit(q.options[picked].label);
              }}
            >
              <input ref={inputRef} value={custom} onChange={(e) => (setCustom(e.target.value), setPicked(null))} placeholder={placeholder} aria-label="Your own answer" />
              <button className="btn light" type="submit" disabled={!custom.trim() && picked == null}>
                {custom.trim() ? (
                  <>
                    Submit <CornerDownLeft size={13} />
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </form>
            {(index > 0 || review) && (
              <div className="qcard-foot">
                {index > 0 ? (
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setDir("back");
                      setIndex((i) => i - 1);
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                ) : (
                  <span className="qcard-hint">Press A–{KEYS[q.options.length - 1]} to pick</span>
                )}
                <span className="spacer" />
                {review && (
                  <button className="btn ghost" onClick={() => commit(null)}>
                    Skip
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AnsweredSummary({ questions, answers }: { questions: Question[]; answers: Answer[] }) {
  const [open, setOpen] = useState(false);
  const answered = answers.filter((a) => a.value != null).length;
  return (
    <div className="card answered">
      <button className="answered-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="status-pill success">
          <Check size={12} strokeWidth={3} /> Answered
        </span>
        <span className="answered-title">
          {answered} of {questions.length} questions
        </span>
        <span className="answered-toggle">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="qreview">
          {questions.map((q) => {
            const v = answers.find((a) => a.questionId === q.id)?.value ?? null;
            return (
              <li key={q.id}>
                <div className="qreview-q">{q.text}</div>
                <div className="qreview-a" data-skipped={v == null || undefined}>
                  {v ?? "Skipped"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
