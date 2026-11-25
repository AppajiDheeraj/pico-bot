import { SCENARIOS } from "../data/scenarios";
import type { Question } from "../lib/types";
import { AgentAvatar, FaceStack } from "./Avatar";
import { QuestionStack } from "./QuestionStack";

const START: Question = {
  id: "start",
  text: "What should I specify first?",
  options: SCENARIOS.map((s) => ({ label: s.label })),
};

export function StartScreen({ onStart }: { onStart: (brief: string, label: string) => void }) {
  return (
    <div className="start">
      <div className="start-hero">
        <div className="start-avatar">
          <AgentAvatar id="pico" size={72} asleep />
        </div>
        <h1>Hi, I'm Pico.</h1>
        <p>
          Give me a system to build. I'll pull out the requirements, write the SRS, then hand it to my planner for an SDLC
          recommendation.
        </p>
        <div className="start-crew">
          <FaceStack ids={["pico", "analyst", "planner"]} size={20} />
          <span>Pico · Analyst · SDLC Planner</span>
        </div>
      </div>
      <div className="start-card">
        <QuestionStack
          questions={[START]}
          review={false}
          placeholder="Or describe your own system…"
          onSubmit={([a]) => {
            const s = SCENARIOS.find((x) => x.label === a.value);
            if (s) onStart(s.brief, s.label);
            else if (a.value) onStart(a.value, a.value);
          }}
        />
        <div className="start-briefs">
          {SCENARIOS.map((s, i) => (
            <div key={s.key} className="start-brief">
              <span className="qopt-key">{"ABCD"[i]}</span>
              <span>
                <strong>{s.short}.</strong> {s.brief}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
