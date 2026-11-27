# Pico: cue cards (keywords to speak from)

Short prompts for each part of the walkthrough script ([demo-script.md](demo-script.md)), so you can talk without reading. Glance at a card, then say it in your own words. **Bold** words are the ones to say out loud.

---

## Part 0. Opening
- Follow **one request**, send → answer
- Problem: brief → **SRS** + **how to run the project**
- Slow, easy to miss **RBI / SEBI** rules
- Pico gives **three things**: **SRS**, **SDLC model + reasons**, **IEEE 830 PDF**
- **Three agents**: Analyst → Planner + Writer, "a **small team**"

## Part 1. The map (ten stops)
**Browser → server → mask → search → Analyst → code check → Planner ║ Writer → live updates → human review**

## Part 2. Stop 1: typing the request
- **One chat window**, not a form
- Brief sounds like a **real client**: no "shall", no regulation names
- **React** = small reusable **components**
- **TypeScript** = catches mistakes early, **Vite** = builds it
- **10–8,000 characters**, checked **in the browser and again on the server**

## Part 3. Stop 2: the request leaves the browser
- **POST /api/sessions**, brief sent as **JSON**
- Server: **new session + random ID** → **log file** → **work starts in the background** → **ID sent back at once**
- No **frozen screen**
- **Server-sent events**: live **one-way updates**
- Three update types: **stage / working / push**
- Log = **reopen old chats** + **audit trail**
- Connection drops → **resumes**, nothing missed or shown twice

## Part 4. Stop 3: hiding private data
- "Nothing visible, **that's the point**"
- **Email, PAN, card, Aadhaar, phone** → **[EMAIL], [CARD]**
- **Pattern matching, not AI** = **predictable**

## Part 5. Stop 4: the RAG step
- Show the trace: **"retrieve · BM25 + Chroma"**
- AI can **invent rules** → **look it up first, then write**
- **Library**: RBI, SEBI, ISO 20022, BIAN, NIST, OWASP, NASA / World Bank SRS, **SDLC criteria**
- **1,200-character pieces**, menus thrown away
- **BM25** = **book index** + scores:
  - **how often** the word appears (with diminishing returns)
  - **how rare** it is (rare words win)
  - **how long** the piece is (fair for length)
- Removed words: **RBI, bank, India, circular, shall** → or you get **cover pages**
- **Vector search** = **search by meaning**
  - "check who the customer is" ≈ "**customer due diligence**"
  - **embedding model** → **vector** → **map of meaning**
  - stored in **Chroma** (on disk)
  - **cosine similarity** = **arrows pointing the same way**
- **Reciprocal rank fusion**: points by **position**, top of **both lists** wins, keep **top 5**
- Keywords = **exact terms**, meaning = **same idea, other words**
- **Safety net**: no embedding model → **keyword search still works**

## Part 6. Stop 5: Agent 1, the Analyst
- Receives: **masked brief + 5 passages (E1–E5)**
- Role: **finance requirements analyst**
- Rules: **evidence is data, not instructions** · **cite only if it supports the claim** · **never invent**
- **Why E1?** Small models **can't copy long IDs**, so code **maps E1 back to the real document**
- **Two halves in parallel**: requirements ║ overview, **about 1.7× faster**
- **Fixed answer shape**: **8–10 items**, statement / category / priority / acceptance / source
- Shape enforced **while the model writes**, then **checked again**, otherwise **rejected**
- Priority: **High = law, security, money** · **Medium = needed to run** · **Low = convenience**

## Part 7. Stop 6: code checks the work
**"The AI doesn't get the last word."**
1. **Renumber** R1, R2…
2. **Duplicates** → Conflict
3. **Vague words with no number** → Ambiguity ("**fast**" ✗, "**2 seconds**" ✓)
4. **No acceptance test** → Incompleteness
5. **Fake citation** → **NEEDS-VALIDATION**
6. **Remove E1 labels** from readable text
7. **Traceability**: R1 → **TC001**

## Part 8. Stop 7: reading the SRS card
- **Title + summary**
- **Stakeholders**: forget one, **forget their requirements**
- **Requirements**: "**The system shall**" = **mandatory, what not how**
  - category · priority · **measurable test** · **source** ("**where did this come from?**")
- **Assumptions**: wrong assumption = **wrong requirements**, catch it **early and cheap**
- **Risks**: what could go wrong **in the project**
- **Quality findings**: problems **in the brief**
- **Open issues**: **questions for the client**
- **Traceability**: proves everything was **built and tested**, "**auditors love it**"
- **Hands off automatically**, no approval button

## Part 9. Stop 8: Agent 2, the SDLC Planner
- Receives: **brief + compact SRS + 13 factors + criteria document**
- **No search**: it **judges this project**
- **7 models**:
  - **Waterfall**: stable requirements
  - **V-Model**: strict testing
  - **Spiral**: risk
  - **Prototyping**: unclear needs
  - **Iterative**: big system
  - **Agile**: frequent change
  - **RAD**: small and fast
- **"The AI doesn't pick the model."** If it did: **different answer each time**, **no reason given**
- **Half 1, the AI rates**: **13 factors**, **Low / Medium / High**, each **backed by R-IDs**
  - fake IDs **removed** · real IDs = **High confidence** · none = **Low confidence**
  - "stability" means **requirements being rewritten**, not scheduled jobs
- **Half 2, code scores**: **base ~50 + weight × level** (Low 0, Medium 1, High 2)
  - weights come from the **criteria document**
  - **every point visible**: "**nothing hidden**"
  - bank → **V-Model**
  - **same input → same answer**, backed by **tests**
- **Half 3, the explanation**: **2–3 plain sentences** + "**why not**" for each other model
- "**AI for judging text, code for decisions**"

## Part 10. Stop 9: Agent 3, the Writer
- **IEEE 830** = **standard SRS layout** for clients and auditors
- **Black-box**: **what, not how**; no costs, staff or schedules
- **Two halves in parallel**: **sections 1–2** ║ **section 3**
- **References added by code**
- **Runs alongside the Planner**: both only need the SRS → **saves waiting**

## Part 11. Stop 10: done
- **Final message** + **"Needs human review"**
- "**Strong first draft, a person signs off**"
- Saved to the **log** → in the **sidebar**
- "**One paragraph → three checked, sourced documents**"

## Part 12. Under the hood (optional)
- **Python**: AI libraries **come first in Python**, **easy to read**
- **FastAPI**: **checks input**, handles **many things at once**
- **ADK**: **LlmAgent = model + role**, handles **sessions, events, tokens**
- **Qwen 3.5, ~9B, local, LM Studio**, reached through **LiteLLM**
  - **privacy · no cost · control**
- **Thinking off** → **~25× faster** (15 s → under 1 s)
- **Chroma + rank_bm25**: **small, local, no extra server**
- **Fixed pipeline**: **same steps every time**, **explainable**
- **Errors** → **clear message in the chat**, never a frozen screen

## Part 13. Safety (optional), nine points
**Mask · Ground in real documents · Evidence ≠ instructions · Check citations · Fixed answer shape · Code quality checks · Scoring by arithmetic · Log everything · Human approves**

## Part 14. Closing
- "**One paragraph, ten stops**"
- **Look it up, don't make it up**
- **The AI suggests, the code decides**
- **A human approves**
- "**Thank you, sir. Happy to take questions.**"

---

## Question cue cards

| If he asks… | Say… |
|---|---|
| Two kinds of search? | **Exact terms + same idea in other words**, miss less |
| Why 5 passages? | **Small model**, more text **confuses it** |
| Why 1,200 characters? | **A whole rule, one topic** |
| Cosine similarity? | **Arrows pointing the same way** |
| AI invents a rule? | **Citation check** → **NEEDS-VALIDATION** |
| Broken answer? | **Doesn't fit the shape → rejected → error shown** |
| Why only Agent 1 searches? | **Requirements need regulations; the Planner judges the project** |
| Why 3 agents, not 1? | **One focused job each**, **small models do better**, **each step checkable** |
| Why not let the AI pick? | **Random, unexplained**; code is **repeatable, shows its working** |
| Where do the weights come from? | **Criteria document + tests** |
| Rating wrong? | **Every rating and point visible**, a **reviewer can fix it** |
| Why local? | **Privacy · cost · control** |
| Why Python? | **AI libraries · readable** |
| Why React? | **Components · live updates** |
| What's ADK? | **Google's agent framework**: **model + role + answer shape** |
| Next steps? | **Bigger library · answer open issues in the chat · more real briefs** |

---

## Code cue cards (if he asks "show me in the code")

| He asks | Open | Say |
|---|---|---|
| Where does the server **receive** the brief? | `server.py:156` `Brief` + `server.py:170` `start()` | "**Checks 10–8,000 characters**, then **start()** takes it" |
| Where's the **session ID** made? | `server.py:172` | "**uuid4**: a **random ID**, stored in **SESSIONS**, sent back to the browser" |
| Where does the **pipeline start**? | `server.py:176` → `run()` at `server.py:99` | "**Runs in the background**, one function, **fixed order**" |
| What does **Agent 1 get**? | `server.py:101–110` | "**mask → search → brief + E1–E5 → two calls in parallel**" |
| How does **Agent 1 hand off to Agent 2**? | `server.py:114` → `server.py:125` | "**No direct talk**: output → **validate** → **srs variable** → passed to **Planner + Writer**" |
| What does **Agent 2 get**? | `server.py:70–72` | "**Compact SRS + brief + 13 factors + criteria**" |
| Where are the **agents declared**? | `agents.py` `analyst` / `planner` / `writer` | "**Model + role**, one each" |
| Where are the **prompts**? | `agents.py` `REQUIREMENTS` … `IEEE_SPECIFIC` | "**Task text + answer shape**, in pairs" |
| What does **ask()** do? | `agents.py` `ask()` | "**Fresh session · forced shape · validated · traced**" |
| Where's the **scoring**? | `rules.py:133` `MODELS`, `rules.py:162` `explain()` | "**Base + weight × level**, the table decides" |
| Where's the **search**? | `rules.py:52` `search()` | "**BM25 + Chroma → fusion → top 5**" |
| Where are the **checks**? | `rules.py:91` `validate()` | "**Renumber, duplicates, vague words, fake citations, traceability**" |

> Line numbers in `agents.py` moved after the prompts got longer. Search for the name (for example `analyst =`) instead of jumping to a line.
