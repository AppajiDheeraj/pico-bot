// Agent mascots rendered with the bloub engine (src/bloub/, MIT, github.com/jeremy-prt/bloub).
// The engine is clock-free: engine.sample(t) returns the SVG paths for time t; this file only draws them.
import { useEffect, useId, useRef, useState } from "react";
import { CREW } from "../data/crew";
import { mixHex, COLOR_BY_ID, SHAPE_BY_ID } from "../bloub/skins";
import { EXPRESSION_BY_ID } from "../bloub/expressions";
import { NOTIF_BLUE } from "../bloub/decor";
import { BotEngine, type BotFrame } from "../bloub/engine";
import { RAYON } from "../bloub/repere";
import type { StateId } from "../bloub/states";
import { useIsDark } from "../lib/theme";
import type { AgentId } from "../lib/types";

// bloub's viewBox is ±158 to leave room for orbit rings; avatars crop tighter so the body fills the circle,
// and rings simply spill over (the svg has overflow: visible).
const VB = 112;
const PAPER = { light: "#fcfcfc", dark: "#121212" }; // --pai-bg-chrome: what the eye holes show

// One shared 30 fps clock for every mascot on screen instead of one requestAnimationFrame loop each.
const subscribers = new Set<(t: number) => void>();
let raf = 0;
let last = 0;
function loop(ms: number) {
  raf = subscribers.size ? requestAnimationFrame(loop) : 0;
  if (ms - last < 33) return;
  last = ms;
  subscribers.forEach((f) => f(ms / 1000));
}
function subscribe(f: (t: number) => void) {
  subscribers.add(f);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => void subscribers.delete(f);
}
const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = { id: AgentId; size: number; working?: boolean; asleep?: boolean; typing?: boolean };

export function AgentAvatar({ id, size, working, asleep, typing }: Props) {
  const crew = CREW[id];
  const dark = useIsDark();
  const paper = dark ? PAPER.dark : PAPER.light;
  const ink = COLOR_BY_ID.get(dark && crew.color === "encre" ? "creme" : crew.color)?.hex ?? "#0a0a0c";
  const uid = useId().replace(/[^\w-]/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState(false);
  const want: StateId = hover ? "wink" : typing ? "thinking" : working ? "orbit" : "idle";

  const engine = useRef<BotEngine>(null);
  engine.current ??= new BotEngine(RAYON, want, SHAPE_BY_ID.get(crew.shape)?.radii ?? null, EXPRESSION_BY_ID.get(asleep ? "somnolent" : "neutre") ?? null);
  const [frame, setFrame] = useState<BotFrame>(() => engine.current!.sample(0));
  const clock = useRef(0);

  useEffect(() => {
    engine.current!.setState(want, clock.current);
  }, [want]);
  useEffect(() => {
    engine.current!.setExpression(EXPRESSION_BY_ID.get(asleep ? "somnolent" : "neutre") ?? null, clock.current);
  }, [asleep]);

  // Animate only while visible on screen.
  useEffect(() => {
    if (still || !svg.current) return;
    let stop = () => {};
    const start = performance.now() / 1000;
    const io = new IntersectionObserver(([e]) => {
      stop();
      if (e.isIntersecting)
        stop = subscribe((t) => {
          clock.current = t - start;
          setFrame(engine.current!.sample(clock.current));
        });
    });
    io.observe(svg.current);
    return () => (io.disconnect(), stop());
  }, []);

  const dot = (d: BotFrame["dots"][number], key: string) => {
    const fill = d.color ?? (d.depth === undefined ? ink : mixHex(paper, ink, d.depth));
    return d.d ? (
      <path key={key} d={d.d} fill={fill} opacity={d.opacity} transform={`translate(${d.x} ${d.y}) rotate(${d.rot ?? 0}) scale(${RAYON})`} />
    ) : (
      <circle key={key} cx={d.x} cy={d.y} r={d.r} fill={fill} opacity={d.opacity} />
    );
  };
  const arcs = (side: "back" | "front") => (
    <g fill="none" strokeLinecap="round">
      {frame.arcs.map((a) => (
        <path key={side + a.id} d={a[side]} stroke={`url(#${uid}-${a.id})`} strokeWidth={a.width} opacity={a.opacity} />
      ))}
    </g>
  );

  return (
    <svg
      ref={svg}
      className="face"
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      aria-hidden
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <defs>
        {/* The eyes are holes punched in the body, so they clip at the silhouette edge (as in bloub). */}
        <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-158} y={-158} width={316} height={316}>
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((e, i) => (
            <path key={i} d={e.d} transform={e.matrix} opacity={e.alpha} fill="#000" />
          ))}
          {frame.notch && <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />}
        </mask>
        {frame.arcs.map((a) => (
          <linearGradient key={a.id} id={`${uid}-${a.id}`} gradientUnits="userSpaceOnUse" x1={a.grad.x1} y1={a.grad.y1} x2={a.grad.x2} y2={a.grad.y2}>
            {a.grad.stops.map((c, i) => (
              <stop key={i} offset={i / (a.grad.stops.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        ))}
      </defs>
      {arcs("back")}
      {frame.dotsBehind && <g>{frame.dots.map((d, i) => dot(d, `b${i}`))}</g>}
      <g opacity={frame.bodyAlpha}>
        <path d={frame.bodyPath} fill={paper} />
        <rect x={-158} y={-158} width={316} height={316} fill={ink} mask={`url(#${uid}-m)`} />
      </g>
      {!frame.dotsBehind && <g>{frame.dots.map((d, i) => dot(d, `f${i}`))}</g>}
      {frame.notif && <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />}
      {arcs("front")}
    </svg>
  );
}

/** Overlapping mini faces, like "6 messages with ●●●". */
export function FaceStack({ ids, size = 18 }: { ids: AgentId[]; size?: number }) {
  return (
    <span className="face-stack">
      {ids.map((id) => (
        <span key={id} className="face-stack-item">
          <AgentAvatar id={id} size={size} />
        </span>
      ))}
    </span>
  );
}
