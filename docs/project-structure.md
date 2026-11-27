# Pico: project structure walkthrough

Pico turns a plain-English project brief into an SRS, an SDLC recommendation and an IEEE 830 SRS.
The repo has two halves: a **Python backend** that runs the AI agents and a **React frontend** that shows the chat.

```
pico_bot/
├── backend/      Python: the agents, the rules and the API
├── frontend/     React + TypeScript: the chat UI
├── docs/         demo scripts, diagrams, screenshots
├── README.md     project overview and how to run everything
├── LICENSE       MIT licence for the project
└── .gitignore    files git must never commit (secrets, generated data, node_modules)
```

How the two halves talk: the browser opens the frontend on `http://localhost:5190`. Every request to `/api/...` is forwarded (proxied) to the backend on port `8000`. The backend streams results back as server-sent events, so the chat fills in live.

---

## Backend (`backend/`): every file

The whole backend is **three Python files**. Everything else is config, data or generated output.

```
backend/
├── server.py          the API + the pipeline (the "boss")
├── agents.py          the three AI agents and their prompts
├── rules.py           plain Python logic, no AI
├── requirements.txt   Python libraries to install
├── .env.example       sample settings file
├── README.md          backend notes
├── corpus/            the reference library the agents read
├── chroma/            vector database (generated)
├── runs/              audit logs, one per session (generated)
├── .venv/             Python virtual environment (generated)
└── __pycache__/       Python bytecode cache (generated)
```

### `server.py`: the API and the pipeline

This is the entry point. You start the backend with `uvicorn server:app --port 8000`.

- **FastAPI app**: defines the HTTP endpoints the frontend calls:

  | Endpoint | What it does |
  |---|---|
  | `POST /api/sessions` | Start a new run from a brief. Returns a session id. |
  | `GET /api/sessions` | List past runs (read from `runs/`). |
  | `GET /api/sessions/{id}/events` | Live stream of everything that happens in a run (server-sent events). |
  | `POST /api/sessions/{id}/reply` | Send the user's answer or follow-up text into a run. |
  | `GET /api/health` | Quick check: is the server up, which model, how big is the corpus. |

- **`Session` class**: one per run. It holds the events, sends each one to the browser and appends it to `runs/<id>.jsonl`. It also keeps the **trace** (every model call and search, with timings and tokens) that the UI shows behind "N steps ›".
- **`run()`**: the fixed pipeline, in order:
  1. Mask sensitive data in the brief (`rules.mask`).
  2. Search the corpus for relevant passages (`rules.search`).
  3. **Analyst** writes the requirements and the overview, two calls in parallel.
  4. `rules.validate` checks the SRS and builds the traceability matrix. The SRS is sent to the UI.
  5. **Planner** (SDLC choice) and **Writer** (IEEE 830 SRS) run in parallel. Results are sent to the UI.
  6. A "Needs human review" notice closes the run.
- **`plan_sdlc()`**: Planner rates 13 factors, `rules.rank` turns the ratings into scores, then the Planner explains the winner.
- **`write_ieee()`**: Writer produces IEEE 830 sections 1–2 and section 3.
- **`guarded()`**: wraps `run()` so an error (LM Studio offline, bad JSON) shows up as a chat message instead of a frozen screen.

### `agents.py`: the three AI agents

Built with **Google ADK** (Agent Development Kit). The model is a local one served by **LM Studio** (`qwen/qwen3.5-9b` by default), reached through **LiteLLM** because LM Studio speaks the OpenAI API.

- **`MODEL`**: the model connection. "Thinking" is turned off, which makes each call about 25× faster.
- **The agents**:
  - **Analyst**: reads the brief and evidence and writes the SRS (requirements + overview).
  - **Planner**: rates the decision factors and explains the chosen SDLC model.
  - **Writer**: writes the formal IEEE 830 SRS.
- **Pydantic schemas** (`Requirement`, `Overview`, `Factors`, `Plan`, `IeeeIntro`, `IeeeSpecific`, ...): the exact JSON shape each step must return. LM Studio enforces the shape while generating, so the output can always be parsed.
- **Prompts** (`GROUND`, `REQUIREMENTS`, `OVERVIEW`, `RATE`, `PLAN`, `IEEE_INTRO`, `IEEE_SPECIFIC`): the instruction for each step. `GROUND` is shared: it tells the agents to rely on the cited evidence only.
- **`ask()`**: runs one step of one agent, checks the JSON against the schema, and records a trace span (time, tokens, input, output, error).

### `rules.py`: deterministic logic, no AI

Everything that must be predictable and testable lives here.

1. **Masking** (`mask`): replaces email, PAN, card numbers, Aadhaar and phone numbers with `[EMAIL]`, `[PAN]`, etc. before any text reaches the model.
2. **Retrieval** (`search`): hybrid search over `corpus/`.
   - **BM25** keyword search (`rank_bm25`).
   - **Vector search** in ChromaDB, using LM Studio's `nomic-embed-text` embeddings.
   - The two result lists are merged with reciprocal rank fusion. The top passages are labelled E1…E5 for the agents to cite.
3. **SRS validation** (`validate`): renumbers IDs, flags duplicates and vague words ("fast", "secure", "user-friendly"), flags missing acceptance criteria, marks uncited claims `NEEDS-VALIDATION` and builds the traceability matrix.
4. **SDLC scoring** (`FACTORS`, `MODELS`, `WHY`, `rank`, `explain`): seven models (Waterfall, V-Model, Spiral, Prototyping, Iterative, Agile, RAD). Each has a base score plus fixed weights per factor. The Planner only *rates* the factors; this code computes the scores, so the ranking is repeatable and can be explained.

Run `python rules.py` for its built-in self-check (asserts on masking, search and validation).

### Config and setup files

| File | What it is |
|---|---|
| `requirements.txt` | Python libraries: `google-adk` (agents), `litellm` (model connection), `chromadb` (vector DB), `rank_bm25` (keyword search). FastAPI and uvicorn come in with ADK. |
| `.env.example` | Sample settings. Copy it to `.env` to change them. |
| `.env` | **Not in the repo, and not created yet.** Your local settings, if you want to override the defaults. Git ignores it so secrets never get committed. |
| `README.md` | Backend notes. Parts of it are out of date: it still describes two agents and an "Allow" step that were removed. Trust this doc and the code where they differ. |

Settings in `.env` (all optional; the defaults are shown):

```
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1     # where LM Studio is running
LM_STUDIO_MODEL=qwen/qwen3.5-9b                 # chat model for all agents
EMBED_MODEL=text-embedding-nomic-embed-text-v1.5  # embedding model for search
```

Start with: `.venv/bin/uvicorn server:app --port 8000 --env-file .env`

### Folders

| Folder | What's in it | In git? |
|---|---|---|
| `corpus/` | The reference library, as plain text. `finance/` has RBI, SEBI, ISO 20022 and BIAN documents. `security/` has NIST CSF, NIST AI RMF and OWASP LLM Top 10. `requirements/` has sample SRS documents from NASA and the World Bank. `product/` has a requirements template and `sdlc-selection-criteria.txt`, which the scoring weights come from. `SOURCES.md` lists where each document came from. | Yes |
| `chroma/` | The ChromaDB vector database. It is built automatically from `corpus/` on the first search (about 30 s). Delete it to rebuild it. | No (generated) |
| `runs/` | One `.jsonl` file per session: every event in order. This is the audit trail and the source for the history list. It can contain user briefs. | No (generated, may hold private data) |
| `.venv/` | The Python virtual environment: an isolated copy of Python plus the installed libraries. Created with `uv venv` and `uv pip install -r requirements.txt`. | No (generated) |
| `__pycache__/` | Python's compiled bytecode cache, so imports load faster. Safe to delete. | No (generated) |

---

## Frontend (`frontend/`): by folder

React 19 + TypeScript, built and served by **Vite**.

```
frontend/
├── index.html           the single HTML page
├── package.json         dependencies and scripts
├── package-lock.json    exact installed versions
├── vite.config.ts       dev server settings
├── tsconfig.json        TypeScript settings
├── .env.example         sample settings
├── src/                 all the source code
├── node_modules/        installed libraries (generated)
└── dist/                production build (generated)
```

### Top-level files

| File | What it does |
|---|---|
| `index.html` | The one HTML page. It has an empty `<div id="root">` and loads `src/main.tsx`. React draws the whole app inside that div. |
| `package.json` | Lists the libraries (`react`, `react-dom`, `lucide-react` for icons; `vite` and `typescript` for building) and the scripts: `npm run dev` (dev server), `npm run build` (production build), `npm run preview`. |
| `package-lock.json` | Pins the exact version of every library, so everyone installs the same thing. Never edit it by hand. |
| `vite.config.ts` | Runs the dev server on port **5190** and forwards `/api` to the backend on port 8000. |
| `tsconfig.json` | TypeScript compiler settings. `tsconfig.tsbuildinfo` is its cache (generated). |
| `.env.example` / `.env` | One setting: `VITE_AGENT`. Set it to `mock` to run a scripted demo with no backend or GPU. Leave it empty to use the real backend. |

### `src/`: the source code

| Path | What it is |
|---|---|
| `main.tsx` | The starting point (this project's `main.js`). Loads the CSS and mounts `<App />` into `index.html`. |
| `App.tsx` | The main component (this project's `app.js`). It holds the app state (sessions, messages, theme) and decides mock or real backend. It lays out the sidebar, chat and right panel. |
| `components/` | The visible pieces of the UI: `StartScreen` (greeting and example chips), `Sidebar` (past sessions), `Transcript` (the chat), `Composer` (the message box), `Cards` (the SRS, SDLC and IEEE result cards), `RightPanel` (details and downloads), `Trace` (the "N steps ›" timeline of agent calls), `Avatar` (the agent mascots). |
| `lib/` | Logic with no layout. `types.ts` is the shared data shapes; the backend sends events in exactly these shapes. `http.ts` talks to the real backend. `agent.ts` + `sdlc.ts` are the scripted mock. `export.ts` builds the Markdown and PDF downloads. `theme.ts` handles light/dark mode. `inline.tsx` renders **bold** and `code` inside chat text. |
| `data/` | Static data. `crew.ts` lists the agents (Pico, Analyst, Planner, Writer) with names, roles and mascot looks. `scenarios.ts` holds the demo scenarios for mock mode. |
| `bloub/` | A small third-party animation engine (MIT licence, see its `LICENSE`) that draws and animates the blob mascots as SVG. Treat it as a library; you rarely need to touch it. |
| `styles/` | CSS. `tokens.css` holds the design variables (colours, spacing, fonts for light and dark). `app.css` holds the layout and component styles. |

### Generated folders: never edit, never commit

| Folder | What it is |
|---|---|
| `node_modules/` | Every library `npm install` downloaded (React, Vite, TypeScript and their own dependencies). It can be deleted and rebuilt at any time with `npm install`. Git ignores it. |
| `dist/` | The production build from `npm run build`: minified HTML, JS and CSS, ready to host. Rebuilt on every build. Git ignores it. |

---

## `docs/`

| Item | What it is |
|---|---|
| `demo-script.md`, `demo-script-20min.md` | Scripts for presenting the demo. |
| `diagrams/` | Agent workflow and RAG diagrams: Excalidraw sources plus light and dark PNGs. |
| `features/` | Screenshots of each feature, used in the README. |
| `home.png`, `use-case.svg` | Home-screen screenshot and the use-case diagram. |
| `project-structure.md` | This file. |

---

## Running it all

```bash
# 1. Model (LM Studio)
lms server start && lms load qwen/qwen3.5-9b && lms load text-embedding-nomic-embed-text-v1.5

# 2. Backend
cd backend && uv venv --python 3.12 .venv && uv pip install -r requirements.txt
.venv/bin/uvicorn server:app --port 8000

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev     # open http://localhost:5190
```

No GPU? Put `VITE_AGENT=mock` in `frontend/.env` and run only step 3.
