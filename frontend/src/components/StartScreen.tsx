import { HandCoins, Landmark, ScanFace, Smartphone } from "lucide-react";
import { SCENARIOS } from "../data/scenarios";
import { AgentAvatar } from "./Avatar";

const CHIPS = [
  { key: "finance", label: "Core ledger", Icon: Landmark },
  { key: "loan", label: "MSME loans", Icon: HandCoins },
  { key: "payments", label: "UPI payments", Icon: Smartphone },
  { key: "kyc", label: "KYC onboarding", Icon: ScanFace },
];

export function StartScreen({ onStart }: { onStart: (brief: string, label: string) => void }) {
  return (
    <div className="start">
      <div className="start-hero">
        <div className="start-avatar">
          <AgentAvatar id="pico" size={64} asleep />
        </div>
        <p className="start-hi">Hi, I'm Pico.</p>
        <h1>What are we building today?</h1>
      </div>
      <div className="start-chips">
        {CHIPS.map(({ key, label, Icon }) => {
          const s = SCENARIOS.find((x) => x.key === key)!;
          return (
            <button key={key} className="start-chip" title={s.brief} onClick={() => onStart(s.brief, s.label)}>
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
