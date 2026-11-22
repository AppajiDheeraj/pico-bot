// Demo scenarios for the scripted mock. The real backend replaces all of this.
import type { Answer, Level, Question, Requirement, Srs } from "../lib/types";

export type Scenario = {
  key: string;
  label: string;
  short: string;
  brief: string;
  questions: Question[];
  /** Baseline project traits the SDLC planner reasons over; answers can shift them. */
  traits: Traits;
  base: Omit<Srs, "requirements" | "traceability" | "findings" | "openIssues"> & {
    requirements: Omit<Requirement, "id">[];
  };
};

export type Traits = {
  stability: Level;
  regulatory: Level;
  security: Level;
  complexity: Level;
  change: Level;
  delivery: Level;
  formality: Level;
  failure: Level;
};

const q = (id: string, text: string, why: string, options: string[], rec = 0): Question => ({
  id,
  text,
  why,
  options: options.map((label, i) => ({ label, recommended: i === rec })),
});

export const SCENARIOS: Scenario[] = [
  {
    key: "finance",
    label: "Core banking ledger",
    short: "Finance · RBI",
    brief:
      "A core ledger module for a bank that records deposits, withdrawals and interest postings, compliant with RBI circulars. Every release needs full test documentation and a formal audit sign-off.",
    traits: { stability: "High", regulatory: "High", security: "High", complexity: "Medium", change: "Low", delivery: "Low", formality: "High", failure: "High" },
    questions: [
      q("interest", "How should interest be calculated and posted?", "RBI circulars leave the day-count and posting frequency to the bank.", [
        "Daily accrual, quarterly posting",
        "Daily accrual, monthly posting",
        "Monthly on minimum balance",
        "Follow the product's own rule",
      ]),
      q("signoff", "Who gives the formal audit sign-off for a release?", "“Audit sign-off” is not defined in the brief.", [
        "Internal audit + compliance officer",
        "Compliance officer only",
        "External statutory auditor",
        "Change advisory board",
      ]),
      q("integration", "Which systems must the ledger talk to on day one?", "Integration scope drives design complexity.", [
        "Loan management + core banking",
        "Payments switch (UPI / NEFT)",
        "Reporting to RBI (XBRL)",
        "None yet — standalone",
      ]),
      q("volume", "What peak transaction volume should it handle?", "Needed for a testable scalability requirement.", [
        "Up to 500 TPS",
        "Up to 2,000 TPS",
        "Up to 10,000 TPS",
        "Not known yet",
      ], 1),
    ],
    base: {
      title: "Core Ledger Module",
      summary:
        "A core ledger module for a bank that records deposits, withdrawals and interest postings in real time, keeps a tamper-evident audit trail, and is released only with full test documentation and a formal audit sign-off, in line with RBI circulars.",
      assumptions: [
        "The applicable RBI circulars define the rules for recording transactions, interest and audit trails.",
        "All transactions are processed in real time into one centralised ledger.",
        "Every release goes through documented testing and an audit sign-off before production.",
      ],
      stakeholders: ["RBI compliance officer", "Risk management", "Internal audit & legal", "IT operations", "Branch & finance analysts"],
      requirements: [
        { statement: "Record deposits, withdrawals and interest postings in real time.", category: "Functional", priority: "High", acceptance: "Every posting is stored with a timestamp and a unique transaction ID within 1 s of commit.", source: "rbi-digital-payment-security-controls-2021#4" },
        { statement: "Calculate and post interest as defined by the applicable RBI circular.", category: "Regulatory", priority: "High", acceptance: "Interest on a reference set of 1,000 accounts matches the circular's worked examples to the paisa.", source: "problem-statement#1" },
        { statement: "Keep an immutable audit trail for every transaction.", category: "Security", priority: "High", acceptance: "Each entry is traceable to a transaction ID, user ID, IP and time; edits create reversal entries, never updates.", source: "rbi-digital-payment-security-controls-2021#13" },
        { statement: "Guarantee atomic, consistent double-entry postings.", category: "Functional", priority: "High", acceptance: "Debits equal credits after every commit; a failed posting leaves no partial entries.", source: "rbi-digital-payment-security-controls-2021#4" },
        { statement: "Produce full test documentation for each release.", category: "Compliance", priority: "High", acceptance: "Test plan, cases and results are archived per release and linked to requirement IDs.", source: "problem-statement#1" },
        { statement: "Trace every requirement to at least one test case.", category: "Compliance", priority: "High", acceptance: "The traceability matrix has no requirement without a test.", source: "problem-statement#1" },
      ],
      risks: [
        { title: "Regulatory interpretation", text: "Different readings of the circular could change interest logic late, forcing rework." },
        { title: "Penalties", text: "Missing test evidence or sign-off may lead to regulatory penalties." },
        { title: "Data integrity", text: "Inconsistent postings would undermine the audit trail and reconciliation." },
      ],
    },
  },
  {
    key: "loan",
    label: "MSME loan origination",
    short: "Lending · NBFC",
    brief:
      "A digital loan origination system for an NBFC lending working capital to small businesses: online application, KYC, credit bureau and bank-statement checks, a credit decision, and disbursal into the borrower's account.",
    traits: { stability: "Medium", regulatory: "High", security: "High", complexity: "High", change: "Medium", delivery: "Medium", formality: "High", failure: "High" },
    questions: [
      q("decision", "How is the credit decision made?", "Decides how much of the flow is automated and explainable.", ["Rule-based scorecard", "ML model with human review", "Manual underwriting only"], 1),
      q("integration", "Which data sources are needed on day one?", "Each source is a separate integration.", ["Credit bureau + Account Aggregator", "Credit bureau only", "Bureau, AA and GST returns", "None yet — manual upload"]),
      q("signoff", "Who approves loans above the auto-approval limit?", "Defines the human-approval checkpoint.", ["Credit manager", "Credit committee", "Branch head"]),
      q("volume", "How many applications per day at peak?", "Needed for a testable performance requirement.", ["Up to 500", "Up to 5,000", "Up to 50,000", "Not known yet"], 1),
    ],
    base: {
      title: "MSME Loan Origination",
      summary: "Online origination of working-capital loans for small businesses, from application and KYC through credit decision to disbursal.",
      assumptions: ["Borrowers apply through a web or mobile journey.", "Disbursal happens only into a verified bank account in the borrower's name."],
      stakeholders: ["MSME borrowers", "Credit team", "Compliance officer", "Collections", "IT operations"],
      requirements: [
        { statement: "Capture the loan application with business and promoter details.", category: "Functional", priority: "High", acceptance: "An application completes in under 15 minutes with save-and-resume.", source: "brief" },
        { statement: "Verify the borrower's KYC before any credit check.", category: "Regulatory", priority: "High", acceptance: "No bureau pull happens for an application without completed KYC.", source: "finance/rbi-kyc-master-direction-2024.txt" },
        { statement: "Record the reason for every credit decision.", category: "Audit", priority: "High", acceptance: "Each approve/decline stores the rules or score bands that drove it.", source: "brief" },
        { statement: "Disburse only to an account verified in the borrower's name.", category: "Security", priority: "High", acceptance: "Penny-drop name match ≥ 90% before disbursal.", source: "brief" },
        { statement: "Show the borrower a key facts statement before acceptance.", category: "Regulatory", priority: "High", acceptance: "Acceptance is blocked until the KFS is shown and acknowledged.", source: "brief" },
      ],
      risks: [
        { title: "Model bias", text: "An unexplained credit model may discriminate and cannot be defended to the regulator." },
        { title: "Fraudulent applications", text: "Synthetic identities and doctored statements raise credit losses." },
      ],
    },
  },
  {
    key: "payments",
    label: "UPI payments app",
    short: "Payments",
    brief: "A UPI-based payments app for a bank's customers: send and receive money, scan-and-pay at merchants, transaction limits, and fraud monitoring.",
    traits: { stability: "Low", regulatory: "High", security: "High", complexity: "Medium", change: "High", delivery: "High", formality: "Medium", failure: "High" },
    questions: [
      q("limits", "What per-transaction limit applies?", "Limits drive the step-up authentication rule.", ["Default UPI limit", "Lower custom limit", "Different limits per merchant category"]),
      q("fraud", "How should suspicious payments be handled?", "Defines the fraud-control requirement.", ["Block and alert the customer", "Allow but flag for review", "Step-up authentication first"], 2),
      q("signoff", "Who approves releases of the app?", "Release approval is a compliance checkpoint.", ["Change advisory board", "Product owner only", "Information-security team"]),
      q("volume", "What peak transactions per second?", "Sets the scale requirement.", ["Up to 200 TPS", "Up to 2,000 TPS", "Not known yet"], 1),
    ],
    base: {
      title: "UPI Payments App",
      summary: "A customer-facing UPI app for peer-to-peer and merchant payments with limits and fraud monitoring.",
      assumptions: ["The bank is already a UPI member through NPCI.", "Card data is never stored by the app."],
      stakeholders: ["Retail customers", "Merchants", "Fraud operations", "Information security", "Compliance officer"],
      requirements: [
        { statement: "Let customers send money to a UPI ID or by scanning a QR code.", category: "Functional", priority: "High", acceptance: "A payment completes in under 5 seconds at p95.", source: "brief" },
        { statement: "Lock the account after repeated failed authentication attempts.", category: "Security", priority: "High", acceptance: "Access is blocked after 5 failed attempts and the customer is alerted.", source: "finance/rbi-digital-payment-security-controls-2021.txt" },
        { statement: "Alert the customer on every debit.", category: "Security", priority: "High", acceptance: "An SMS or push alert is sent within 30 seconds of each debit.", source: "finance/rbi-digital-payment-security-controls-2021.txt" },
        { statement: "Score every transaction for fraud in real time.", category: "Security", priority: "High", acceptance: "Fraud score returned within 200 ms for 99% of transactions.", source: "brief" },
        { statement: "Keep an immutable record of every payment.", category: "Audit", priority: "High", acceptance: "Records cannot be edited; corrections are reversal entries.", source: "brief" },
      ],
      risks: [
        { title: "Account takeover", text: "SIM-swap and phishing can drain customer accounts." },
        { title: "Peak-day outage", text: "Festival and salary-day spikes can exceed capacity." },
      ],
    },
  },
  {
    key: "kyc",
    label: "Digital KYC onboarding",
    short: "Onboarding · KYC",
    brief: "Digital customer onboarding for a bank: account opening with Aadhaar e-KYC or video KYC, PAN verification, risk categorisation, and periodic KYC updates.",
    traits: { stability: "Medium", regulatory: "High", security: "High", complexity: "Medium", change: "Medium", delivery: "Medium", formality: "High", failure: "High" },
    questions: [
      q("method", "Which KYC methods are offered?", "Each method has different regulatory steps.", ["Aadhaar e-KYC + video KYC", "Video KYC only", "Aadhaar OTP e-KYC only"]),
      q("integration", "Which registries must it call?", "Integration scope drives complexity.", ["CKYC registry + PAN check", "PAN check only", "CKYC, PAN and DigiLocker"]),
      q("signoff", "Who reviews high-risk customers?", "Defines the human-review checkpoint.", ["Compliance officer", "Branch manager", "Dedicated KYC team"], 2),
      q("volume", "How many new customers per day?", "Sets the scale requirement.", ["Up to 1,000", "Up to 20,000", "Not known yet"]),
    ],
    base: {
      title: "Digital KYC Onboarding",
      summary: "Paperless account opening with Aadhaar e-KYC or video KYC, PAN checks and risk categorisation.",
      assumptions: ["Customers are Indian residents with a valid PAN.", "Video KYC is done by trained bank officials."],
      stakeholders: ["New customers", "KYC officials", "Compliance officer", "Information security", "Operations"],
      requirements: [
        { statement: "Verify identity through Aadhaar e-KYC or a live video KYC session.", category: "Regulatory", priority: "High", acceptance: "No account is activated without a completed KYC record.", source: "finance/rbi-kyc-master-direction-2024.txt" },
        { statement: "Check the liveness of the customer during video KYC.", category: "Security", priority: "High", acceptance: "Randomised liveness prompts; failed checks end the session.", source: "finance/rbi-kyc-master-direction-2024.txt" },
        { statement: "Assign every customer a risk category at onboarding.", category: "Regulatory", priority: "High", acceptance: "Each account is tagged low, medium or high risk with the reason stored.", source: "finance/rbi-kyc-master-direction-2024.txt" },
        { statement: "Store KYC documents encrypted and access-logged.", category: "Privacy", priority: "High", acceptance: "AES-256 at rest; every access logged with user and time.", source: "brief" },
        { statement: "Trigger periodic KYC updates by risk category.", category: "Regulatory", priority: "Medium", acceptance: "Update reminders are raised on the schedule set for each risk category.", source: "finance/rbi-kyc-master-direction-2024.txt" },
      ],
      risks: [
        { title: "Identity fraud", text: "Deepfakes and stolen documents can pass weak video KYC." },
        { title: "Data breach", text: "Leaked Aadhaar or PAN data brings penalties and loss of trust." },
      ],
    },
  },
];

export const CUSTOM_QUESTIONS: Question[] = [
  q("users", "Who are the main users?", "Every requirement hangs off a user role.", ["Customers / public", "Internal staff", "Both", "Other systems (API)"], 2),
  q("platform", "Where will it run?", "Platform constraints shape non-functional requirements.", ["Web app", "Mobile app", "Web + mobile", "Backend service only"]),
  q("rules", "Are there regulations or standards to follow?", "Regulation changes how formal the SDLC must be.", ["Yes, strict (finance / health)", "Some (privacy law)", "None that I know of"], 1),
  q("change", "How settled are the requirements?", "Stability is the biggest SDLC factor.", ["Fixed and signed off", "Mostly settled", "Still exploring"], 1),
];

export function customScenario(brief: string): Scenario {
  const title = brief.split(/[.!?\n]/)[0].slice(0, 60).trim() || "Custom system";
  return {
    key: "custom",
    label: title,
    short: "Custom",
    brief,
    questions: CUSTOM_QUESTIONS,
    traits: { stability: "Medium", regulatory: "Medium", security: "Medium", complexity: "Medium", change: "Medium", delivery: "Medium", formality: "Medium", failure: "Medium" },
    base: {
      title: title.replace(/^(a|an|the)\s+/i, "").replace(/^./, (c) => c.toUpperCase()),
      summary: brief,
      assumptions: ["The brief describes the full scope of the first release."],
      stakeholders: ["End users", "Product owner", "Engineering", "Operations"],
      requirements: [
        { statement: "Provide the core workflow described in the brief.", category: "Functional", priority: "High", acceptance: "A user can complete the main task end to end without help.", source: "brief#1" },
        { statement: "Authenticate users and enforce role-based access.", category: "Security", priority: "High", acceptance: "Every action is checked against the user's role.", source: "brief#1" },
        { statement: "Log key actions for troubleshooting and audit.", category: "Security", priority: "Medium", acceptance: "Logs include user, action and timestamp.", source: "brief#1" },
        { statement: "Respond quickly under normal load.", category: "Performance", priority: "Medium", acceptance: "95% of requests finish in under 500 ms.", source: "brief#1" },
      ],
      risks: [{ title: "Scope creep", text: "An open-ended brief invites late additions." }],
    },
  };
}

/** Fold the user's answers into the requirement set and traits. */
export function buildSrs(s: Scenario, answers: Answer[]): { srs: Srs; traits: Traits } {
  const traits = { ...s.traits };
  const reqs: Omit<Requirement, "id">[] = [...s.base.requirements];
  const findings: Srs["findings"] = [];
  const open: string[] = [];
  const val = (id: string) => answers.find((a) => a.questionId === id)?.value ?? null;

  for (const qn of s.questions) {
    const v = val(qn.id);
    if (v == null) {
      findings.push({ type: "Incompleteness", text: `Skipped: “${qn.text}” — kept as an open issue.` });
      open.push(qn.text.replace(/\?$/, "") + " (unanswered).");
      continue;
    }
    if (/not known|not sure|decide later/i.test(v)) {
      findings.push({ type: "Ambiguity", text: `“${qn.text}” answered as “${v}”; the related criterion uses a placeholder.` });
      open.push(`Confirm: ${qn.text.replace(/\?$/, "").toLowerCase()}.`);
    }
    // Scenario-specific folding (kept small and readable on purpose).
    if (qn.id === "interest" && v) reqs[1] = { ...reqs[1], acceptance: `${v}; results match the circular's worked examples to the paisa.` };
    if (qn.id === "signoff" && v) reqs.push({ statement: "Require a recorded human approval before every release.", category: "Compliance", priority: "High", acceptance: `Deployment is blocked until ${v.toLowerCase()} records sign-off for that build.`, source: "answer:signoff" });
    if (qn.id === "integration" && v && !/none/i.test(v)) {
      reqs.push({ statement: `Integrate with ${v.replace(/\(.*\)/, "").trim()}.`, category: "Integration", priority: "Medium", acceptance: "Postings reconcile with the connected system at end of day with zero breaks.", source: "answer:integration" });
      traits.complexity = "High";
    }
    if ((qn.id === "volume" || qn.id === "peak" || qn.id === "size") && v) {
      reqs.push({ statement: "Scale to the expected peak load.", category: "Performance", priority: "Medium", acceptance: /not known/i.test(v) ? "Peak target to be confirmed (placeholder: 2× current load)." : `Sustains ${v.toLowerCase()} with p95 latency under 300 ms.`, source: `answer:${qn.id}` });
    }
    if (qn.id === "rules") traits.regulatory = /strict/.test(v) ? "High" : /some/i.test(v) ? "Medium" : "Low";
    if (qn.id === "rules") traits.formality = traits.regulatory;
    if (qn.id === "change") {
      traits.stability = /fixed/i.test(v) ? "High" : /mostly/i.test(v) ? "Medium" : "Low";
      traits.change = /fixed/i.test(v) ? "Low" : /mostly/i.test(v) ? "Medium" : "High";
    }
    if (qn.id === "platform" && v) reqs.push({ statement: `Ship as a ${v.toLowerCase()}.`, category: "Platform", priority: "High", acceptance: "Core flows pass on the target platforms' current versions.", source: "answer:platform" });
  }

  if (s.key === "finance") {
    findings.push({ type: "Undefined term", text: "“Real time” needs a number; the SRS assumes posting within 1 second." });
    open.push("Name the exact RBI circulars (number and date) this release must follow.");
  }
  if (findings.length === 0) findings.push({ type: "Ambiguity", text: "No blocking gaps found; acceptance criteria still need sign-off from the product owner." });

  const requirements = reqs.map((r, i) => ({ ...r, id: `R${i + 1}` }));
  const traceability = requirements.map((r, i) => ({
    req: r.id,
    test: `TC${String(i + 1).padStart(3, "0")}`,
    check: r.acceptance.split(";")[0].replace(/\.$/, ""),
  }));
  return {
    traits,
    srs: { ...s.base, requirements, findings, traceability, openIssues: open },
  };
}
