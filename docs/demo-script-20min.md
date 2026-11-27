# Pico: 20-minute walkthrough script

Read the plain text out loud. Lines in *[brackets]* tell you what to do on screen. Times are rough and add up to about 20 minutes.

---

## 1. Opening: what Pico is (about 2 minutes)

*[Show the start screen of the app.]*

"Good morning, sir. I'll walk you through Pico, the project I built.

The problem is simple. When a company wants new software, someone writes a short brief, a paragraph or two saying what they want. Before any code is written, someone has to turn that brief into a proper requirements document, and then decide how the project should be run: Waterfall, Agile, V-Model and so on. That takes time, and it's easy to miss things, especially in banking, where there are regulations to follow.

Pico does that first step. You type the brief, and it gives you three things back:

1. a Software Requirements Specification, the SRS,
2. a recommended SDLC model, with the reasons for it,
3. the same SRS written in the IEEE 830 standard format, ready to download.

Inside, three small AI agents do the work, one after another, like a team passing a file down the desk. I'll show you what you see first, then what happens behind the screen."

---

## 2. Typing the requirement (about 1.5 minutes)

*[Click an example chip, or type a brief. Example: "We need a mobile app for a bank where customers can open a savings account, complete KYC online, and transfer money using UPI."]*

"This is the start screen. It's a single chat window, because I wanted it to feel like talking to one assistant, not filling in a long form.

I'll give it a requirement, the kind of short brief a client would actually write. Notice it doesn't have to be detailed or technical. That's the point: the user says what they want in plain words, and Pico works out the rest.

*[Press send.]*

When I press send, the browser sends this text to our backend. From here, the agents take over."

---

## 3. Agent 1, the Analyst: reading the brief (about 2 minutes)

*[Point at the chat as the first messages and the "Analyst" activity appear.]*

"The first agent is the **Analyst**. Its job is to read the brief and write the requirements.

But before the AI writes anything, two things happen.

**First, private data is hidden.** If the brief contains an email, a phone number, a card number, a PAN or an Aadhaar number, the code replaces it with a label like [EMAIL] before the AI ever sees it. That's plain pattern matching, no AI, so it's predictable.

**Second, it looks things up.** An AI on its own may make up rules that don't exist. So I gave Pico a small library of real documents: RBI directions on KYC, digital payment security and IT governance; SEBI's cybersecurity framework; ISO 20022; NIST and OWASP security guides; and sample SRS documents from NASA and the World Bank. Before writing, the Analyst searches this library for the passages that matter to this brief. This is what people call **RAG**, retrieval-augmented generation. In plain words: look it up first, then write."

---

## 4. How the search works: BM25 and vector search (about 3.5 minutes)

*[Open the trace on the first "messages with agents" row and show the "retrieve · BM25 + Chroma" step, with the brief as input and the passages that came back.]*

"Here you can see exactly what it searched for and what it found. I'll explain how, because it uses two kinds of search together.

First, the documents are cut into small pieces of about 1,200 characters each, roughly a paragraph or two. We search those pieces, not whole documents, so the AI gets only the relevant part.

**Search one is BM25, which is keyword search.** It works like the index at the back of a book. It looks for the words in the brief, such as 'KYC', 'UPI' or 'transfer', and scores each piece by three things:
- how often the word appears in that piece,
- how rare the word is across the whole library, so a rare word like 'KYC' counts for much more than a common one,
- how long the piece is, so a long piece doesn't win just by having more words.

I also removed words that appear in nearly every RBI document, like 'bank', 'India', 'circular' and 'shall'. Otherwise every search would match the cover pages.

**Search two is vector search, which is search by meaning.** Keyword search has a weakness. If the brief says 'verify the customer's identity' and the regulation says 'customer due diligence', there are no shared words, but they mean the same thing.

So we turn every piece of text into a list of numbers called a vector, using a small embedding model. You can think of it as a position on a map of meaning: texts that mean similar things end up close together. We do the same with the brief, then find the pieces closest to it. 'Closest' is measured with cosine similarity, which roughly asks whether two arrows point the same way. These vectors are stored in a small database called **Chroma**, on disk, so we only build them once.

**Then we combine the two.** Each search gives its own ranked list. We merge them with a simple rule called reciprocal rank fusion: a piece that ranks high in either list gets points, and a piece that ranks high in both gets the most. We keep the top five.

Why both? Keywords catch exact terms like 'Aadhaar' or 'ISO 20022'. Meaning catches the same idea in different words. Together they miss less. And if the embedding model isn't running, keyword search still works on its own, so the app doesn't break."

---

## 5. The SRS output: what each part means (about 3.5 minutes)

*[Open the SRS card and go through it from top to bottom.]*

"Now the Analyst has the brief and five real passages, each labelled E1 to E5. It writes the SRS. Here's what each part means.

- **Title and summary.** One line on what the system is.
- **Stakeholders.** Everyone who cares about this system: customers, bank staff, the compliance team, the regulator, IT operations. If you forget a stakeholder, you forget their requirements.
- **Requirements.** Eight to ten statements, each written as 'The system shall…'. Each one has:
  - a **category**, such as functional, security, privacy, regulatory or performance,
  - a **priority**: High means it's a legal duty, security, or anything touching money; Medium means it's needed to run the system; Low means it's a convenience,
  - an **acceptance criterion**, a measurable test with a number in it, like 'login completes within 2 seconds for 95% of users'. If you can't measure it, you can't test it,
  - a **source**: which document passage it came from, or 'brief' if it came from the user's own words.
- **Assumptions.** Things we're taking as true without being told. For example, 'customers have a smartphone with internet'. If an assumption turns out to be wrong, the requirements may need to change, so we write them down.
- **Risks.** Things that could go wrong in the project, such as 'KYC rules may change' or 'the payment gateway may go down'. Naming them early lets the team plan for them.
- **Quality findings.** Problems in the brief itself: something vague, missing or contradictory.
- **Open issues.** Questions that still need an answer from the client.
- **Traceability.** Each requirement R1, R2 and so on is linked to a test case TC001, TC002 and so on. Nothing gets built that can't be tested.

One important point: **the AI doesn't get the last word.** After it writes, ordinary code checks its work. It renumbers the requirements, flags duplicates, flags vague words like 'fast' or 'user-friendly' that have no number attached, and checks every citation. If the AI cites a document we never gave it, the source is marked NEEDS-VALIDATION instead of being trusted. That way the AI can't invent a regulation and have it look official.

To save time, the Analyst writes the requirements half and the overview half at the same time, in parallel."

---

## 6. Handoff to Agent 2, the SDLC Planner (about 3.5 minutes)

*[Point at "Handed off to SDLC Planner", then open the SDLC card.]*

"When the Analyst is done, it hands the SRS to the second agent, the **SDLC Planner**. Its job is to choose how the project should be run.

I limited it to seven standard models: **Waterfall, V-Model, Spiral, Prototyping, Iterative, Agile and RAD.**

How does it choose? This is the part I'm most careful about. **The AI doesn't simply pick a model.** If you ask an AI 'which model is best?', you may get a different answer every time, with no clear reason. So I split the job into two parts.

**Part one: the AI rates the project.** It looks at the SRS and rates thirteen decision factors as Low, Medium or High. For example:
- *Requirement stability*: will the requirements stay the same, or keep changing?
- *Regulatory criticality*: how strictly is this regulated?
- *Security risk*, *project complexity*, *system size*,
- *Need for formal verification*: does every step need proof that it was tested?
- *Failure consequence*: how bad is it if this fails? For a bank, very bad.
- and others, like stakeholder availability and budget and schedule pressure.

For each rating, it must say which requirements back it up, for example 'R2, R5'. A rating backed by real requirement IDs is marked High confidence. One with no backing is marked Low.

These factors and the rules for rating them come from a selection-criteria document in our library, which is given to the AI along with the SRS. The AI isn't making up its own rules.

**Part two: plain code does the scoring.** Each model starts with a base score. Each factor adds or removes points. For example, if requirements are very stable, Waterfall gains points; if requirements change often, Agile gains points and Waterfall loses them; if formal verification and regulation are High, V-Model gains points.

*[Open one model in the ranking to show its score breakdown.]*

Because this is simple arithmetic, the same ratings always give the same ranking, and you can see exactly why. Here you can see each factor and how many points it added or removed. For a typical bank app, with strict rules, stable requirements and serious consequences if it fails, V-Model usually comes out on top.

Finally, the Planner writes two or three plain sentences explaining why the winning model fits, naming the factors and requirements behind it. Each of the other models also shows why it was passed over."

---

## 7. Agent 3, the IEEE Writer (about 1 minute)

*[Open the IEEE 830 card and show the download button.]*

"While the Planner works, a third agent, the **Writer**, runs at the same time. It takes the same SRS and rewrites it in the **IEEE 830** format, the standard layout for requirements documents: introduction, scope, definitions, overall description, interfaces, functions, data, performance, quality attributes and business rules. This can be downloaded as a PDF and handed to a client.

Last, Pico shows a notice: **'Needs human review.'** This is deliberate. Regulations and project decisions must be approved by a qualified person. Pico gives you a strong first draft, not the final decision."

---

## 8. Behind the screen: the backend (about 3 minutes)

*[Optionally open backend/server.py and backend/agents.py, or show the architecture diagram in docs/diagrams.]*

"Now, what happens behind the screen.

**The frontend** is built with **React**, written in TypeScript and built with Vite. React lets you build the screen out of small reusable pieces called components: the chat, the SRS card, the SDLC card, the sidebar of past chats. Each one only has to worry about itself.

**The connection.** When you press send, the frontend makes a **POST request** to our API at `/api/sessions` with the brief. The server creates a session, gives it an ID, and starts the work in the background. The frontend then keeps a connection open and receives updates as they happen. That's why you see the messages appear one by one instead of waiting for everything at the end. Every step is also saved to a log file, so past chats can be reopened later and there's a record of what the AI did.

**The backend** is written in **Python**, using **FastAPI** for the web server. Why Python? Almost every AI and search library is built for Python first, the code is easy to read, and it was the quickest way to build this.

**The agents** are built with Google's **Agent Development Kit, ADK**. ADK is a framework for building AI agents. Each agent is an *LlmAgent*: an AI model plus a fixed role. I give it a role, like 'you are a finance requirements analyst', then a task. ADK handles running the conversation with the model. I also give each agent a strict answer format. For example, the requirements must come back as a list of eight to ten items, each with a statement, a category and a priority. If the answer doesn't fit that shape, it's rejected instead of being quietly accepted.

**The model** runs **locally**, on my own machine, through **LM Studio**. It's **Qwen 3.5, a model with about 9 billion parameters**. Running it locally means no client data leaves the computer, which matters for a bank, and it costs nothing per request.

**The workflow** is a fixed pipeline, always in the same order:
1. hide private data,
2. search the documents (Agent 1 only),
3. Agent 1, the Analyst, writes the SRS, and code checks it,
4. Agent 2, the Planner, and Agent 3, the Writer, run at the same time,
5. the results are shown, with the human-review notice.

Only Agent 1 uses the full document search, because writing requirements is where facts from regulations matter. Agent 2 doesn't search; it gets the SRS plus the one selection-criteria document directly, because it is judging this project, not looking up regulations.

And if something fails, for example the model isn't running, the user sees a clear message in the chat instead of a screen that hangs forever."

---

## 9. Closing (about 1 minute)

"To sum up: Pico turns a short brief into a requirements document, an SDLC recommendation with clear reasons, and an IEEE 830 SRS, in a few minutes.

Three ideas run through the whole design:
1. **Look it up, don't make it up.** Requirements are grounded in real regulations, and every citation is checked.
2. **The AI suggests, the code decides.** The AI rates the factors; plain, repeatable arithmetic picks the model.
3. **A human approves.** It's a draft for an expert to review, not a replacement for one.

Thank you, sir. I'm happy to take any questions."

---

## Likely questions, with short answers

- **Why two kinds of search?** Keywords catch exact terms like 'Aadhaar'; meaning catches the same idea in other words. Together they miss less.
- **Can the AI make up a regulation?** It can try, but code checks every citation against the passages we actually gave it. Anything else is marked NEEDS-VALIDATION.
- **Why not let the AI just pick the SDLC?** The answer would change from run to run, with no clear reason. Scoring in code gives the same result every time and shows its working.
- **Why a local model?** Privacy, since bank data stays on the machine, and no cost per request.
- **What would you improve next?** A bigger document library, letting the user answer the open issues in the chat, and testing on more real briefs.
