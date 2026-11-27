# Pico: the life of one request (full walkthrough script)

This script follows **one request** from the moment you press send to the moment the final documents appear. Every stop on the journey is explained twice: first what you see on the screen, then what happens behind it.

- Read the plain text out loud.
- Lines in *[brackets]* tell you what to do on screen.
- The full script runs about **30–35 minutes**. If you need it shorter, skip the sections marked **(optional)**. That brings it to about 20–22 minutes.

**The example brief used all the way through.** Keep it ready to paste:

> We need a mobile banking app for a bank in India. Customers should be able to open a savings account, complete KYC online using their Aadhaar and PAN, and send money to other people using UPI. The bank wants every transaction recorded for audit, and the app must keep customer data safe.

---

## Part 0. Opening (about 2 minutes)

*[Show the start screen.]*

"Good morning, sir. Today I'll show you Pico, the project I built, and the way I'll do it is a little different. Instead of explaining the parts one by one, I'll follow **one single request** through the whole system, from the moment I press send to the moment the final answer comes back. At each stop I'll show you what you see on the screen and then what's happening behind it.

First, the problem.

When a company wants new software, someone writes a short brief, usually just a paragraph saying what they want. Before anyone writes code, two things have to happen.

First, someone has to turn that brief into a proper **requirements document**, the SRS, which lists exactly what the system must do and how we'll test it.

Second, someone has to decide **how the project will be run**: Waterfall, V-Model, Agile and so on. That choice affects the schedule, the testing and the paperwork for the whole project.

Both steps take an experienced person a lot of time. And in banking it's easy to miss something, because there are regulations from the RBI and SEBI that the software must follow.

Pico does that first step. You type a brief, and you get back three things:
1. an **SRS**, with requirements, stakeholders, assumptions, risks and test links,
2. a **recommended SDLC model**, with the score and the reasons behind it,
3. the same SRS in the **IEEE 830 standard format**, ready to download as a PDF.

Inside Pico there are **three AI agents**, each with one job, and they pass the work along like a small team: an Analyst, an SDLC Planner and a Writer. Let's follow a request through them."

---

## Part 1. The overall map (about 2 minutes)

*[Optional: show the architecture diagram in docs/diagrams. If you have none, just say it.]*

"Before we start, here's the whole journey in one breath, so you know where we're going:

1. I type the brief in the **browser**, in a React app.
2. The browser sends it to the **backend**, a Python server, as a request.
3. The backend **hides private data**, like card numbers.
4. It **searches a library of real regulation documents** for the parts that matter.
5. **Agent 1, the Analyst**, writes the SRS using those documents.
6. Plain **code checks the SRS** for mistakes.
7. **Agent 2, the SDLC Planner**, rates the project and the code scores seven models.
8. At the same time, **Agent 3, the Writer**, rewrites the SRS in IEEE 830 format.
9. Every step is **streamed back** to the browser as it happens, so you watch it live.
10. Finally, a **human-review notice** reminds us that a person must approve it.

Ten stops. Let's go."

---

## Part 2. Stop 1: typing the request (about 2 minutes)

*[Paste the example brief into the chat box. Don't send it yet.]*

**What you see**

"This is the start screen. It's a single chat window. I chose that on purpose. I wanted it to feel like talking to one assistant, not filling in a twenty-field form. There are some example chips here for people who don't know what to type.

Look at what I've written. It's how a real client talks: 'open a savings account', 'complete KYC', 'send money using UPI'. It never says 'the system shall', it doesn't list security controls, and it doesn't mention any regulation by name. Turning plain words like these into a precise document is exactly the job.

**What happens behind it**

The frontend is built with **React**. React lets you build a screen out of small, reusable pieces called **components**. Here there's a start-screen component, a chat-box component, a sidebar component for past chats, and a card component for each document. Each piece only worries about itself, which keeps the code easy to change.

It's written in **TypeScript**, which is JavaScript with types. If I pass the wrong kind of data to a component, I find out before the app runs. **Vite** builds and serves it during development.

There's also a basic check before anything is sent: the brief must be at least 10 characters and at most 8,000. The server checks that again on its side, because you should never trust only what the browser checked."

---

## Part 3. Stop 2: the request leaves the browser (about 2.5 minutes)

*[Press send.]*

**What you see**

"I've pressed send. Almost immediately, 'Pico is waking up' appears, and Pico says it will have the Analyst read the brief against the regulations library.

**What happens behind it**

When I press send, the browser makes a **POST request** to the backend at the address `/api/sessions`. A POST request just means 'here is some data, please do something with it'. The data is the brief, sent as JSON, a simple text format for structured data.

The server does three quick things and replies at once:
1. it creates a new **session**, which is this one conversation, and gives it a random ID,
2. it writes the brief as the first line of a **log file** for that session,
3. it starts the real work **in the background** and immediately replies with the session ID.

Why reply immediately instead of waiting until everything is finished? Because the whole job takes a while, and if the browser just sat waiting, the user would stare at a frozen screen.

So instead, the browser takes that session ID and opens a second, long-lived connection to `/api/sessions/<id>/events`. This uses **server-sent events**, which is a one-way channel where the server can keep sending small updates to the browser for as long as it needs.

There are only three kinds of updates:
- **stage**: where we are in the journey, such as intake, SRS, SDLC, review or done,
- **working**: which agents are busy right now, so their avatars can show activity,
- **push**: a new thing to show in the chat, such as a message, an event line or a finished document card.

Every update is also written to the log file. That gives us two benefits. First, you can reopen any old chat from the sidebar and it's rebuilt exactly. Second, there's an **audit trail**, a record of everything the AI did. In banking that matters.

And if the internet drops for a second, the browser reconnects and tells the server the number of the last update it got, so nothing is shown twice and nothing is missed."

---

## Part 4. Stop 3: hiding private data (about 1.5 minutes)

**What you see**

"Nothing visible here, and that's the point.

**What happens behind it**

The very first thing the backend does with the brief, before any AI sees it, is **mask private data**. It looks for:
- email addresses,
- PAN numbers,
- card numbers,
- Aadhaar numbers,
- Indian phone numbers.

Each one is replaced with a label like `[EMAIL]` or `[CARD]`. So if a client accidentally pastes a real customer's card number into the brief, the AI never sees it.

This is done with **plain pattern matching**, not AI. I did that deliberately. A pattern either matches or it doesn't, so it behaves the same way every time. For something safety-related, I want predictable code, not a guess."

---

## Part 5. Stop 4: looking things up, the RAG step (about 6 minutes)

*[When the first "messages with agents" row appears, open its trace and click the "retrieve · BM25 + Chroma" step. Show the input (the brief) and the output (the passages).]*

**What you see**

"Here's the first agent at work, the Analyst. If I open this row, I can see the exact steps it took. The first step is called 'retrieve'. Its input is our brief, and its output is five passages from real documents. You can read them, and you'll see they're about KYC, digital payment security and so on.

**Why we look things up at all**

An AI model on its own has a known weakness: it can say things confidently that aren't true. Ask it about RBI rules and it might invent a rule, a number or a circular. In banking software that's dangerous.

So I gave Pico a small, trusted **library of real documents**:
- from the **RBI**: the KYC Master Direction, the 2025 KYC amendment, digital payment security controls, IT governance, and IT outsourcing,
- from **SEBI**: the cybersecurity and cyber-resilience framework,
- **ISO 20022** for payment messages, and **BIAN** for banking services,
- security guides from **NIST** and **OWASP**,
- sample SRS documents from **NASA** and the **World Bank**, so the agent sees what a good SRS looks like,
- and a document on **how to choose an SDLC model**, which Agent 2 uses later.

Before the Analyst writes anything, it searches this library. This idea is called **RAG**, retrieval-augmented generation. In plain words: **look it up first, then write.**

**Step 1: cutting documents into pieces**

A whole regulation can be a hundred pages long. We can't give all of it to the model, and most of it wouldn't be relevant anyway. So when the server starts, every document is cut into pieces of about **1,200 characters**, roughly a paragraph or two. Each piece gets an ID like 'rbi-kyc-master-direction, chunk 4'. Pieces that are just website menus are thrown away.

We search those pieces, not whole documents, so the model gets only the part that matters.

**Step 2: keyword search, called BM25**

The first search is **BM25**. It's a classic keyword search, the same family of method that search engines used for years.

Think of the index at the back of a textbook. You look up 'KYC' and it shows you the pages. BM25 does that, but it also gives each piece a **score** based on three common-sense ideas:

1. **How often the word appears in the piece.** A piece that says 'KYC' five times is probably more about KYC than one that says it once. But the score grows more slowly each time, so a piece can't win just by repeating a word fifty times.
2. **How rare the word is across the whole library.** This is the clever part. A word like 'customer' appears everywhere, so matching it tells us little. A word like 'Aadhaar' or 'UPI' appears in only a few places, so matching it tells us a lot. Rare words count for much more.
3. **How long the piece is.** A long piece naturally contains more words. BM25 adjusts for length, so long pieces don't win unfairly.

I added one fix of my own. Words like 'RBI', 'bank', 'India', 'circular', 'directions' and 'shall' appear in almost every regulation. If we matched on them, every search would bring back the cover pages and introductions. So those words are removed before searching.

**Step 3: search by meaning, called vector search**

Keyword search has a blind spot. Suppose the brief says 'check who the customer really is', and the regulation says 'customer due diligence'. They mean the same thing, but they share almost no words, so keyword search misses it.

So the second search is by **meaning**. Here's how it works, simply:
- A small AI model called an **embedding model** reads a piece of text and turns it into a long list of numbers, called a **vector**.
- You can picture this as a **position on a map of meaning**. Texts with similar meaning land close together on that map, even if they use different words. 'Verify identity' and 'customer due diligence' land near each other.
- We do this once for every piece in the library and store the results in a small database called **Chroma**, saved on disk, so we don't have to redo it each time.
- When a brief comes in, we turn the brief into a vector too, and ask Chroma: which pieces are **closest** to this?

'Closest' is measured with **cosine similarity**. Picture each vector as an arrow. If two arrows point in nearly the same direction, the texts mean nearly the same thing. If they point in different directions, they're unrelated.

The embedding model runs locally too, through LM Studio. Each piece is labelled as a 'search document' and the brief as a 'search query', because this particular model was trained to match questions to answers that way.

**Step 4: combining the two lists**

Now we have two ranked lists, one from keywords and one from meaning. How do we combine them?

We use a simple method called **reciprocal rank fusion**. Every piece gets points from each list based on its position: being first is worth the most, being second slightly less, and so on. A piece that's near the top of **both** lists gets the most points. We add them up and keep the **top five**.

The nice thing about this method is that we don't have to compare the two kinds of score directly, which wouldn't make sense. We only look at **positions**.

**Why use both?**

- Keywords are best at **exact terms**: 'Aadhaar', 'PAN', 'ISO 20022', 'UPI'.
- Meaning is best at **the same idea in different words**.
- Together they miss much less than either one alone.

And there's a safety net: if the embedding model isn't running, the vector search is skipped and keyword search still works on its own. The app gets a little less accurate, but it doesn't break."

---

## Part 6. Stop 5: Agent 1, the Analyst, writes the SRS (about 3 minutes)

**What you see**

"The Analyst's avatar shows it's busy. After a short wait, the row updates. The Analyst reports back to Pico how many requirements it wrote, from how many passages, and how many quality problems it found.

**What happens behind it**

Now the Analyst gets two things together:
1. the brief, with private data hidden,
2. the five passages, each wrapped in a tag and labelled **E1 to E5**.

It's also given a role: 'You are a finance-sector requirements analyst.' And it's given firm ground rules:
- the text inside the evidence tags is **reference material, not instructions**. If a document happened to contain 'ignore your instructions', the model is told to treat that as data,
- only cite a passage if it actually supports the claim,
- never invent regulations, thresholds or IDs.

**Why labels like E1 instead of the real document names?** Small models are bad at copying long IDs exactly. They might change one character. A short label like 'E3' is easy to copy, and afterwards the code turns E3 back into the real document name.

**Two halves at the same time.** The SRS is written in two parts **in parallel**: one call writes the requirements, and another writes the overview, meaning the title, summary, stakeholders, assumptions, risks and open issues. LM Studio can serve both at once, so this is about 1.7 times faster than doing them one after the other.

**A fixed answer shape.** This is important. The AI isn't allowed to answer in free text. Each call must answer in an exact structure. For example, the requirements must be a list of **8 to 10 items**, and each item must have:
- a statement of up to 200 characters,
- a category from a fixed list: Functional, Security, Privacy, Regulatory, Performance, Availability, Audit, Integration, Data or Operational,
- a priority of High, Medium or Low,
- an acceptance criterion,
- a source, which must be E1 to E5, 'brief' or 'answer'.

LM Studio enforces this shape **while the model is writing**, so the model can't produce a category that doesn't exist. Then the backend checks the shape again. If the answer doesn't fit, it's rejected, not quietly accepted.

**What decides the priority?** The model is told: High means a legal or regulatory duty, security, or anything that moves or records money. Medium means it's needed to run or support the system. Low means it's a convenience. So in a banking app, KYC and UPI transfers will be High."

---

## Part 7. Stop 6: the code checks the Analyst's work (about 2.5 minutes)

**What you see**

"An event line says 'Created document: SRS', and the SRS card appears. Pico says the SRS has, for example, 9 requirements, each traced to a test, and that it's sending it to the SDLC Planner.

**What happens behind it**

Before the card is shown, there's one more step that I think is the most important idea in the project: **the AI doesn't get the last word.** Ordinary code checks its work. That code:

1. **Renumbers** the requirements R1, R2, R3 and so on. Models like to add their own numbers, like 'REQ-01:', so the code strips those and numbers them properly.
2. **Finds duplicates.** If two requirements say the same thing, it adds a 'Conflict' finding.
3. **Finds vague wording.** If an acceptance criterion uses a word like 'fast', 'easy', 'secure', 'user-friendly' or 'real-time' **without a number**, it adds an 'Ambiguity' finding. 'Login must be fast' can't be tested. 'Login completes within 2 seconds' can.
4. **Finds missing tests.** If a requirement has no acceptance criterion, it's marked NEEDS-VALIDATION and an 'Incompleteness' finding is added.
5. **Checks every citation.** If a requirement claims to come from a document, the code checks that it's one of the five passages we actually gave it. If not, the source is replaced with **NEEDS-VALIDATION**. So the AI can't invent a regulation and have it look official.
6. **Cleans the text people read.** Labels like 'E1' are removed from the sentences, because a reader doesn't know what E1 means. The real source stays in the source field.
7. **Builds the traceability table.** Every requirement R1 is linked to a test case TC001, R2 to TC002, and so on, with the check taken from its acceptance criterion."

---

## Part 8. Stop 7: reading the SRS card (about 4 minutes)

*[Open the SRS card and walk through it slowly from top to bottom. Point at real items from your run.]*

"Let's read what came back, section by section.

**Title and summary.** One line saying what the system is, and a short paragraph describing it.

**Stakeholders.** Everyone who has an interest in this system. For our brief: customers, bank operations staff, the compliance team, the RBI as regulator, IT and security teams, perhaps the UPI network operator. Why does this matter? Because every stakeholder brings their own requirements. Forget the compliance team, and you forget the audit requirements.

**Requirements.** *[Point at two or three.]* Each one is written as 'The system shall…'. That wording is a standard in requirements writing. 'Shall' means it's mandatory, and it describes **what** the system must do, not **how**. Look at the parts:
- the **category**, for example Regulatory for the KYC one and Security for data protection,
- the **priority**, High for anything about KYC, money or security,
- the **acceptance criterion**, a measurable test with a number in it, like 'a UPI transfer is confirmed to the user within 5 seconds in 95% of cases'. If you can't measure it, you can't prove it's done,
- the **source**. *[Point at one.]* This one came from the RBI KYC Master Direction, and this one came from the brief itself. So you can always ask 'where did this come from?' and get an answer.

**Assumptions.** Things we're treating as true without being told. For example: 'customers have a smartphone with internet', or 'the bank already has a core banking system the app connects to'. Why write them down? Because if one is wrong, some requirements may be wrong too. Writing them down lets the client say 'no, that's not true' early, when it's cheap to fix.

**Risks.** Things that could go wrong in the **project**: for example, 'KYC rules may change during development', 'the UPI service may have downtime', 'a data breach would cause regulatory penalties'. Naming risks early means the team can plan for them instead of being surprised.

**Quality findings.** These are problems with the **brief itself**: something ambiguous, missing, undefined or contradictory. For example: 'the brief doesn't say which devices must be supported', or 'it doesn't define how long audit records must be kept'. Some come from the AI, and some come from the code checks I just described.

**Open issues.** Questions that still need an answer from the client before the project can really start.

**Traceability.** *[Point at the table.]* Every requirement is linked to a test case. This is how you prove, at the end of a project, that every requirement was actually built and tested. Auditors love this table.

So from one paragraph we now have a structured, checked document with sources. And it hands off automatically. There's no approval button in the middle, because I wanted the user to get all three documents in one go."

---

## Part 9. Stop 8: handoff to Agent 2, the SDLC Planner (about 6 minutes)

*[Point at "Handed off to SDLC Planner", then open the SDLC card.]*

**What you see**

"Here's the handoff: 'Handed off to SDLC Planner'. You can see two agents working now. I'll come back to the second one. When the Planner finishes, it reports back: it rated 13 decision factors, scored 7 models, and one model leads with a score out of 100, followed by the runner-up.

**What the Planner receives**

The Planner gets:
1. the original brief,
2. the SRS requirements in compact form: each one's ID, statement, category and priority,
3. the list of 13 decision factors,
4. the **SDLC selection-criteria document** from our library, given directly.

Notice that the Planner **doesn't run a search**. It doesn't need to look up regulations. Its job is to judge **this project**, and everything it needs is in the SRS and the criteria document.

**The seven models**

I limited it to the seven standard models taught in software engineering:
- **Waterfall**: one phase after another, best when requirements are stable and need formal approval,
- **V-Model**: every build phase has a matching test phase, best when strict verification is needed,
- **Spiral**: repeated loops focused on risk, best when there's a lot of uncertainty,
- **Prototyping**: build quick mock-ups to discover what users want, best when requirements are unclear,
- **Iterative**: build the whole system in repeated, improving cycles, best for large systems,
- **Agile**: short iterations, best when requirements change often,
- **RAD**: very fast delivery, best for small, low-risk systems.

**The key design decision: the AI doesn't pick the model**

If you simply ask an AI 'which SDLC model is best?', two things go wrong. You might get a different answer each time you ask. And you can't see **why** it chose what it chose. For a decision that shapes an entire project, that's not good enough.

So I split the decision into two halves.

**Half one: the AI rates the project.** The AI looks at the SRS and rates each of **13 factors** as Low, Medium or High:
1. Requirement stability: will the requirements stay the same?
2. Regulatory criticality: how strictly is this regulated?
3. Security risk
4. Project complexity
5. System size
6. Legacy-system dependence: does it have to connect to old systems?
7. Expected change frequency: how often will requirements be rewritten?
8. Need for continuous delivery: must it ship updates constantly?
9. Stakeholder availability: can users give feedback often?
10. Testing and documentation formality: how much formal paperwork is needed?
11. Budget and schedule pressure
12. Need for formal verification: must every step be proven tested?
13. Failure consequence: how bad is it if this fails?

For **each** rating, the AI must name the requirement IDs that back it up, for example 'Regulatory criticality: High, because of R2 and R5'. Then the code checks those IDs. Any ID that doesn't exist in the SRS is removed. A rating backed by real IDs is marked **High confidence**. A rating with no real backing is marked **Low confidence**. So you can see which judgements are well supported.

The model is also told not to confuse things. For example, 'requirement stability' is about whether the **requirements** will be rewritten during the project. It isn't about scheduled jobs or about regulations that might change someday. Small models mix these up, so the instruction spells it out.

**Half two: plain code does the scoring.** *[Open one model in the ranking to show its breakdown.]*

Each of the seven models starts with a **base score** of around 50. Then each factor adds or removes points. Low counts as 0, Medium as 1, High as 2, and each is multiplied by a weight. For example:
- **Waterfall** gains a lot when requirement stability is High, and loses a lot when expected change is High.
- **V-Model** gains when formal verification, documentation formality, regulatory criticality and failure consequence are High.
- **Agile** gains when change is frequent and delivery must be continuous, and loses when regulation and documentation are strict.
- **RAD** loses points when the system is complex, risky or regulated.

These weights come from the selection-criteria document. For example: stable requirements plus formal approvals point to Waterfall, strict verification points to V-Model, uncertainty and risk point to Spiral, and frequent change points to Agile.

Here you can see it in the card: each factor, its level, and exactly how many points it added or took away. **Nothing is hidden.** If you disagree with a rating, you can see exactly how much it changed the result.

For our banking app, regulation is High, failure consequence is High, formal verification is High, and requirements are fairly stable. So **V-Model** usually comes out on top. That matches what a software engineering textbook would recommend for a regulated banking system.

And because it's arithmetic, **the same ratings always give the same ranking.** I wrote tests for this. For a typical bank profile, V-Model must win. For a fast-changing online shop, Agile or Iterative must win. For unclear needs with available users, Prototyping must win.

**Half three: the explanation.** Once the code has picked the winner, the Planner gets the result and its strongest score drivers, and writes **two or three plain sentences** explaining why it fits, naming those factors and the requirement IDs behind them. Each of the other six models also shows a short line on why it was passed over. For example, Agile: 'light documentation clashes with formal audit and sign-off.'

So the AI is used for what it's good at, reading and judging text, and the code is used for what it's good at, consistent and explainable decisions."

---

## Part 10. Stop 9: Agent 3, the Writer, in parallel (about 2.5 minutes)

*[Open the IEEE 830 card. Scroll through the sections and show the download button.]*

**What you see**

"Remember I said two agents were working at once? The second is the **Writer**. Its card appears next: the IEEE 830 SRS. And here's the download button for a PDF.

**What happens behind it**

**IEEE 830** is the IEEE's recommended practice for writing a Software Requirements Specification. It's the standard layout people expect in a formal document. Our first SRS is good for working with, but a client or an auditor will expect this standard format.

The Writer is told: 'You are a technical writer who turns an SRS into an IEEE 830 SRS.' It's also told to write **black-box** requirements: what the system must do, never how it does it internally, and no costs, staff or schedules, because those don't belong in an SRS.

Like the Analyst, it writes in **two halves at the same time**:
- **Sections 1 and 2**: purpose and audience, scope (what's in and what's out), definitions of terms, product perspective, product functions, user classes, constraints and dependencies,
- **Section 3**: external interfaces (user, hardware, software, communication), the main functions with their input, processing and output, including the error case, measurable performance requirements, the data entities and their relationships, design constraints, quality attributes like reliability and security, use-case actors, and business rules.

The references list is added by code: the IEEE 830 standard itself, plus every real document the requirements were sourced from.

**Why run it alongside the Planner?** Because the Writer and the Planner both only need the finished SRS. Neither needs the other's result. Running them at the same time saves a lot of waiting."

---

## Part 11. Stop 10: the response is complete (about 1.5 minutes)

*[Scroll to the bottom of the chat and show the final message and the notice.]*

**What you see**

"Pico's final message says which model fits best, invites you to open any model to see why it was or wasn't chosen, and says the IEEE SRS is ready to download.

Below that is a notice: **'Needs human review.'** It says the regulatory interpretation, the requirements baseline and the SDLC choice must be approved by a qualified person, and that this is a draft.

That's deliberate. Pico is a very good first draft. It saves days of work and grounds everything in real documents. But a decision about a bank's software must be signed off by a person who's accountable for it.

**What happens behind it**

The stage is set to 'done', the agents go idle, and the full session is saved in the log. If I open the sidebar, *[show it]*, this chat is now in the history, and I can come back to it any time.

That's the full journey of one request: from a paragraph of plain English to three structured, checked, sourced documents."

---

## Part 12. Under the hood: the technology choices (about 4 minutes) (optional)

*[Optional: open backend/server.py and backend/agents.py briefly.]*

"Let me quickly explain the technology choices and why I made them.

**Python for the backend.** Almost every AI, search and data library is built for Python first: the agent framework, the vector database, the BM25 library. Python code is also easy to read, which made it fast to build and easy to explain.

**FastAPI for the web server.** It's a lightweight Python web framework. It checks incoming data automatically, for example the 10-to-8,000-character limit on the brief, and it handles many things at once, which we need because the agents run in parallel while updates stream to the browser.

**Google's Agent Development Kit, ADK, for the agents.** ADK is a framework for building AI agents. In ADK, each of my agents is an **LlmAgent**: a language model plus a fixed role, the instruction. ADK takes care of the conversation with the model, the session for each call and the events coming back, including how many tokens each step used, which feeds the trace you saw. For each step I attach an exact answer shape, so the agent must return structured data, not free text.

**LM Studio and a local model.** The model is **Qwen 3.5, about 9 billion parameters**, running on my own machine through **LM Studio**. LM Studio exposes the model through the same kind of API as OpenAI, so ADK reaches it through a small bridge library called **LiteLLM**. Why local?
- **Privacy**: no client data leaves the computer, which matters for a bank.
- **Cost**: there's no charge per request.
- **Control**: the same model every time, with no sudden changes from a provider.

I turned off the model's hidden 'thinking' step for these short, structured tasks. That made each short call about 25 times faster, around 15 seconds down to under a second, without hurting the structured answers.

**Chroma and BM25 for search.** Chroma stores the meaning vectors on disk. The `rank_bm25` library does the keyword scoring. Both are small, run locally and need no separate server.

**Why a fixed pipeline instead of letting the agents decide what to do?** Some agent systems let the AI decide which agent to call next. I chose a **fixed order** instead: mask, search, Analyst, check, Planner and Writer together, review. For a document that a bank depends on, I want the same steps every time, and I want to be able to explain exactly what happened. Flexibility is nice, but predictability matters more here.

**Error handling.** If anything fails, for example LM Studio isn't running or the model returns a broken answer, the user doesn't get a frozen screen. Pico says in the chat what went wrong and asks whether LM Studio is running, and the failed step is still visible in the trace."

---

## Part 13. Safety and trust, all in one place (about 2 minutes) (optional)

"Since this is for banking, here's every safety measure in one list, because they're spread across the journey:

1. **Private data is masked** before any AI sees it.
2. **Answers are grounded** in a trusted library of real regulations, not the AI's memory.
3. **Documents are treated as data, not instructions**, so text hidden in a document can't take control of the agent.
4. **Every citation is checked**. Invented sources are marked NEEDS-VALIDATION.
5. **Every answer must fit an exact structure**, or it's rejected.
6. **Code checks quality**: duplicates, vague words and missing tests.
7. **The SDLC choice is arithmetic**, repeatable and shown step by step.
8. **Every step is logged**, so there's a full audit trail.
9. **A human must approve** the result."

---

## Part 14. Closing (about 1.5 minutes)

"To sum up.

We followed one request, a single paragraph from a bank, through ten stops. It was masked, grounded in real RBI and SEBI documents using keyword and meaning search, written into an SRS by the Analyst, checked by code, turned into an explainable SDLC recommendation by the Planner, and written in IEEE 830 format by the Writer, all streamed live to the screen.

Three ideas run through the whole design:
1. **Look it up, don't make it up.** Requirements come from real documents, and every citation is checked.
2. **The AI suggests, the code decides.** The AI reads and rates; plain, repeatable arithmetic makes the decision.
3. **A human approves.** It's a strong draft for an expert, not a replacement for one.

Thank you, sir. I'm happy to take any questions."

---

## Questions he might ask, with short answers

**About search**
- *Why two kinds of search?* Keywords catch exact terms like 'Aadhaar'. Meaning catches the same idea in other words. Together they miss less.
- *Why five passages, not more?* A small model gets confused with too much text. Five focused passages give enough evidence without drowning it.
- *Why pieces of 1,200 characters?* Big enough to hold a complete rule, small enough that each piece is about one topic.
- *What is cosine similarity?* Each text becomes an arrow. If two arrows point the same way, the texts mean nearly the same thing.

**About the agents**
- *Can the AI make up a regulation?* It can try, but code checks every citation against the passages we actually gave it. Anything else is marked NEEDS-VALIDATION.
- *What if the AI returns a broken answer?* It's rejected because it doesn't fit the required structure, and the user sees an error message instead of bad data.
- *Why does only Agent 1 search?* Writing requirements is where regulatory facts matter. The Planner judges this project, so it gets the SRS and the selection-criteria document directly.
- *Why three agents instead of one big one?* Each has one clear job and a small, focused instruction. Small models do much better with one focused task at a time, and you can see and check each step separately.

**About the SDLC choice**
- *Why not let the AI just pick?* The answer could change from run to run, with no clear reason. Scoring in code gives the same result every time and shows its working.
- *Where do the weights come from?* From the SDLC selection-criteria document in our library, and they're checked with tests on known cases, like bank to V-Model and fast-changing shop to Agile.
- *What if a rating is wrong?* You can see each rating, its backing requirements and its exact effect on the score, so a reviewer can spot and correct it.

**About technology**
- *Why a local model?* Privacy, because bank data stays on the machine, plus no cost per request and full control.
- *Why Python?* The AI and search libraries are built for Python first, and it's quick to build with and easy to read.
- *Why React?* The screen is built from small reusable components, and it updates smoothly as each new event streams in.
- *What is ADK?* Google's Agent Development Kit, a framework for building AI agents. Each agent is a model with a role and a required answer shape.

**About the future**
- *What would you improve next?* A bigger document library, letting the user answer the open issues in the chat so the SRS improves, and testing on many more real briefs.
