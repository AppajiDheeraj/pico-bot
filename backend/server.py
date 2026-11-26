"""Pico: the API the chat UI talks to, and the fixed pipeline that runs the two agents.

Run:  uvicorn server:app --port 8000
"""
import asyncio
import json
import re
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import rules
from agents import OVERVIEW, PLAN, RATE, REQUIREMENTS, analyst, ask, planner

app = FastAPI(title="Pico")
LOGS = Path(__file__).parent / "runs"
LOGS.mkdir(exist_ok=True)


class Session:
    def __init__(self, sid: str):
        self.id, self.events, self.changed = sid, [], asyncio.Condition()
        self.trace, self.shown = [], 0  # spans (agent calls, retrievals); how many are already attached to a delegation row

    async def emit(self, type: str, **data):
        """Send one event to the UI and append it to runs/<id>.jsonl (the audit trail)."""
        event = {"type": type, **data}
        with open(LOGS / f"{self.id}.jsonl", "a") as log:
            log.write(json.dumps({"t": time.time(), **event}) + "\n")
        async with self.changed:
            self.events.append(event)
            self.changed.notify_all()

    async def push(self, kind: str, **item) -> str:
        item_id = f"{kind}-{uuid.uuid4().hex[:8]}"
        await self.emit("push", item={"kind": kind, "id": item_id, "at": int(time.time() * 1000), **item})
        return item_id

    async def delegate(self, *messages: tuple[str, str, str]):
        """A collapsed "messages with agents" row, carrying the trace steps since the previous one."""
        steps, self.shown = self.trace[self.shown :], len(self.trace)
        await self.push("delegation", messages=[{"from": f, "to": t, "text": x} for f, t, x in messages], steps=steps)
        await self.emit("working", agents=[])  # the agents reported back, so nobody is busy

    def search(self, query: str, k: int) -> dict[str, str]:
        start = time.time()
        hits = rules.search(query, k)
        self.trace.append({"name": "retrieve · BM25 + Chroma", "kind": "tool", "start": start, "end": time.time(), "tokens": 0,
                           "input": query[:500], "output": "\n".join(hits)})
        return hits

    async def say(self, text: str):
        await self.push("bot", **{"from": "pico", "text": text})


SESSIONS: dict[str, Session] = {}


def evidence_block(hits: dict[str, str]) -> str:
    """Passages labelled E1, E2, …; the model cites labels (it can't copy long ids reliably), code maps them back."""
    return "\n".join(f'<evidence id="E{i}">{text}</evidence>' for i, text in enumerate(hits.values(), 1))


async def plan_sdlc(brief: str, srs: dict, trace: list) -> dict:
    """Agent (ii): rate the decision factors; rules.rank scores the models; the planner explains and plans."""
    compact = json.dumps([{k: r[k] for k in ("id", "statement", "category", "priority")} for r in srs["requirements"]])
    criteria = f'<evidence id="criteria">{rules.CHUNKS["product/sdlc-selection-criteria.txt#chunk-1"]}</evidence>'
    rated = await ask(planner, RATE, trace=trace, context=f"Decision factors: {rules.FACTORS}\n\nBrief:\n{brief}\n\nSRS requirements: {compact}\n\n{criteria}")
    ids = {r["id"] for r in srs["requirements"]}
    for f in rated["factors"]:
        f["cites"] = ", ".join(c for c in re.findall(r"R\d+", f["cites"]) if c in ids) or "—"  # only real requirement IDs
        f["implication"] = rules.clip(rules.plain(f["implication"]))
        f["confidence"] = "High" if f["cites"] != "—" else "Low"  # a rating backed by requirement IDs is trusted more
    ranking = rules.explain({f["name"]: f["value"] for f in rated["factors"]})
    top = ranking[0]
    drivers = ", ".join(f"{d['factor']} {d['level']} ({d['points']:+})" for d in top["drivers"])
    others = ", ".join(f"{r['model']} {r['score']}" for r in ranking[1:])
    plan = await ask(planner, PLAN, trace=trace, context=f"Chosen SDLC: {top['model']} ({top['score']}/100). Score drivers: {drivers}. Others: {others}\nFactors: {json.dumps(rated['factors'])}\nSRS requirements: {compact}\n\n{criteria}")
    plan["justification"] = rules.plain(plan["justification"][: plan["justification"].rfind(".") + 1] or plan["justification"])  # length cap may cut mid-sentence
    return {
        "factors": rated["factors"], "chosen": top["model"], **plan, "ranking": ranking,
    }


async def run(s: Session, brief: str):
    """Intake → SRS → SDLC → human review."""
    brief = rules.mask(brief)
    await s.emit("stage", stage="intake")
    await s.push("event", icon="wake", text="Pico is waking up")
    await s.say("On it. I'll have the **Analyst** read your brief against the regulations library first.")

    # Agent (i): write the SRS; rules.validate checks it.
    await s.emit("working", agents=["analyst"])
    hits = s.search(brief, k=5)
    context = f"Brief:\n{brief}\n\n{evidence_block(hits)}"
    reqs, overview = await asyncio.gather(ask(analyst, REQUIREMENTS, context, s.trace), ask(analyst, OVERVIEW, context, s.trace))
    labels = dict(zip((f"E{i}" for i in range(1, len(hits) + 1)), hits))
    for r in reqs["requirements"]:
        r["source"] = labels.get(r["source"], r["source"])
    srs = rules.validate(overview | reqs, set(hits))
    await s.delegate(("pico", "analyst", "Brief attached. Write the SRS."),
                     ("analyst", "pico", f"{len(srs['requirements'])} requirements from {len(hits)} passages; {len(srs['findings'])} quality findings."))
    await s.emit("stage", stage="srs")
    await s.push("event", icon="doc", text="Created document", strong=f"SRS · {srs['title']}")
    await s.push("srs", srs=srs)
    await s.say(f"Here's the SRS: **{len(srs['requirements'])} requirements**, each traced to a test. Sending it to the **SDLC Planner** now.")

    await s.emit("stage", stage="sdlc")
    await s.push("event", icon="handoff", text="Handed off to", strong="SDLC Planner")
    await s.emit("working", agents=["planner"])
    sdlc = await plan_sdlc(brief, srs, s.trace)
    chosen, ranking = sdlc["chosen"], sdlc["ranking"]
    await s.delegate(("pico", "planner", f"SRS attached ({len(srs['requirements'])} requirements). Recommend a lifecycle."),
                     ("planner", "pico", f"Rated {len(sdlc['factors'])} decision factors; scored {len(ranking)} models."),
                     ("planner", "pico", f"{chosen} leads at {ranking[0]['score']}/100; {ranking[1]['model']} next at {ranking[1]['score']}."))
    await s.push("event", icon="doc", text="Created document", strong="SDLC recommendation")
    await s.push("sdlc", sdlc=sdlc)

    await s.emit("stage", stage="review")
    await s.say(f"Done. **{chosen}** fits best. Open a model in the ranking to see why it was or wasn't chosen.")
    await s.push("notice", title="Needs human review", text="Regulatory interpretation, the requirements baseline and the SDLC choice must be approved by a qualified person. Treat this as a draft.")
    await s.emit("stage", stage="done")


async def guarded(s: Session, brief: str):
    try:
        await run(s, brief)
    except Exception as e:  # model offline, bad JSON, … — tell the user instead of hanging
        await s.emit("working", agents=[])
        if len(s.trace) > s.shown:
            await s.delegate(("pico", "pico", "This step failed; open the trace for details."))
        await s.push("bot", **{"from": "pico"}, text=f"Something went wrong: `{type(e).__name__}: {str(e)[:200]}`. Is LM Studio running with the model loaded?")
        await s.emit("stage", stage="done")


# ---------- HTTP API ----------

class Brief(BaseModel):
    brief: str = Field(min_length=10, max_length=8000)


class Reply(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def session(sid: str) -> Session:
    if sid not in SESSIONS:
        raise HTTPException(404, "No such session")
    return SESSIONS[sid]


@app.post("/api/sessions")
async def start(body: Brief):
    s = Session(uuid.uuid4().hex)
    SESSIONS[s.id] = s
    s.task = asyncio.create_task(guarded(s, body.brief))  # keep a reference so the task isn't garbage-collected
    return {"id": s.id}


@app.get("/api/sessions/{sid}/events")
async def events(sid: str, request: Request):
    """Server-sent events. On reconnect the browser sends Last-Event-ID, so nothing is replayed twice."""
    s = session(sid)

    async def stream():
        i = int(request.headers.get("last-event-id", -1)) + 1
        while True:
            async with s.changed:
                await s.changed.wait_for(lambda: len(s.events) > i)
            for event in s.events[i:]:
                yield f"id: {i}\ndata: {json.dumps(event)}\n\n"
                i += 1

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/sessions/{sid}/reply")
async def reply(sid: str, body: Reply):
    """A chat message mid-run. The pipeline needs no input, so Pico only acknowledges it."""
    s = session(sid)
    await s.say("This run is finished. Start a new chat for another brief." if s.task.done() else "Got it. I'm still working on this brief.")
    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"chunks": len(rules.CHUNKS), "model": analyst.model.model}
