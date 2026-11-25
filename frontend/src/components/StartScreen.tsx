import { AgentAvatar } from "./Avatar";

export function StartScreen() {
  return (
    <div className="start">
      <div className="start-hero">
        <div className="start-avatar">
          <AgentAvatar id="pico" size={72} asleep />
        </div>
        <h1>Hi, I'm Pico.</h1>
      </div>
    </div>
  );
}
