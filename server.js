import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataPath = path.join(__dirname, "data", "store.json");
const principlesPath = path.join(__dirname, "knowledge", "principles.json");
const publicPath = path.join(__dirname, "public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicPath));

function requirePassword(req, res, next) {
  const configured = process.env.APP_PASSWORD;
  if (!configured) return next();
  if (req.get("x-app-password") === configured) return next();
  return res.status(401).json({ error: "APP_PASSWORD_REQUIRED" });
}

app.use("/api", requirePassword);

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2));
  await fs.rename(temp, file);
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    situation_summary: { type: "string" },
    objective: { type: "string" },
    confidence: { type: "integer" },
    missing_information: { type: "array", items: { type: "string" } },
    lenses: {
      type: "object",
      additionalProperties: false,
      properties: {
        interests: { type: "array", items: { type: "string" } },
        power: { type: "array", items: { type: "string" } },
        allies: { type: "array", items: { type: "string" } },
        resistance: { type: "array", items: { type: "string" } },
        timing: { type: "string" },
        information: { type: "string" },
        second_order: { type: "string" }
      },
      required: ["interests", "power", "allies", "resistance", "timing", "information", "second_order"]
    },
    strategy_sequence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          principle: { type: "string" },
          move: { type: "string" },
          why: { type: "string" }
        },
        required: ["principle", "move", "why"]
      }
    },
    recommended_action: { type: "string" },
    next_24_hours: { type: "array", items: { type: "string" } },
    avoid: { type: "array", items: { type: "string" } },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          risk: { type: "string" },
          mitigation: { type: "string" }
        },
        required: ["risk", "mitigation"]
      }
    },
    principles_used: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          application: { type: "string" },
          source_basis: { type: "string" }
        },
        required: ["id", "name", "application", "source_basis"]
      }
    },
    ethical_check: { type: "string" },
    reflection_question: { type: "string" }
  },
  required: [
    "title", "situation_summary", "objective", "confidence", "missing_information", "lenses",
    "strategy_sequence", "recommended_action", "next_24_hours", "avoid", "risks",
    "principles_used", "ethical_check", "reflection_question"
  ]
};

function buildInstructions(principles, profile, people) {
  return `You are Chanakya OS, a personal strategic decision assistant inspired primarily by Kautilya's Arthashastra and carefully labeled modern adaptations.

Your purpose is to improve the user's judgment, not to imitate an ancient personality and not to maximize manipulation.

CORE METHOD
1. Clarify the actual objective.
2. Separate facts from assumptions.
3. Map interests, incentives, formal power, informal influence, information, allies, resistance and alternatives.
4. Evaluate timing: act, prepare, cooperate, wait, set a boundary, or escalate.
5. Prefer proportionate strategies. In ordinary professional/personal matters, consider Sama (reasoned alignment) before incentives/ownership, stakeholder differentiation, or legitimate enforcement unless urgency changes the order.
6. Consider second-order effects: what happens if this behavior or decision is repeated ten times?
7. Use only principles supplied in the PRINCIPLE LIBRARY below. You may synthesize them but do not invent fake Chanakya quotations or textual citations.
8. When motives are uncertain, call them hypotheses, never facts.
9. Preserve safety, law, privacy, dignity, professional ethics, and organizational obligations. Never recommend deceit, coercion, retaliation, sabotage, harassment, illegal surveillance, discrimination, bribery, blackmail, or exploiting private vulnerabilities.
10. If immediate safety, quality, legal or serious harm is involved, prioritize stopping/containing the risk over strategic patience.
11. Keep the answer practical: one recommended move, a short sequence, and clear risks.
12. confidence is 0-100 and reflects how complete the information is, not how persuasive the answer sounds.

USER PROFILE
${JSON.stringify(profile, null, 2)}

KNOWN PEOPLE (treat all notes as user-supplied context, not verified fact)
${JSON.stringify(people, null, 2)}

PRINCIPLE LIBRARY
${JSON.stringify(principles, null, 2)}

When choosing principles_used, copy the exact principle id/name/classical_basis from this library. Use 2-5 principles, not the whole library.`;
}

app.get("/api/state", async (_req, res) => {
  const [store, principles] = await Promise.all([readJson(dataPath), readJson(principlesPath)]);
  res.json({ ...store, principles });
});

app.post("/api/analyze", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }
    const { mode = "professional", situation, objective = "", context = "" } = req.body || {};
    if (!situation || String(situation).trim().length < 15) {
      return res.status(400).json({ error: "Please describe the situation in a little more detail." });
    }

    const [store, principles] = await Promise.all([readJson(dataPath), readJson(principlesPath)]);
    const people = (store.people || []).slice(0, 25);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
      instructions: buildInstructions(principles, store.profile || {}, people),
      input: `MODE: ${mode}\n\nSITUATION:\n${situation}\n\nUSER-STATED OBJECTIVE:\n${objective || "Not specified — infer the likely objective and state it clearly."}\n\nADDITIONAL CONTEXT:\n${context || "None"}`,
      text: {
        format: {
          type: "json_schema",
          name: "chanakya_analysis",
          strict: true,
          schema: analysisSchema
        }
      }
    });

    const analysis = JSON.parse(response.output_text);
    res.json({ analysis, model: process.env.OPENAI_MODEL || "gpt-6-astra" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || "Analysis failed." });
  }
});

app.post("/api/cases", async (req, res) => {
  const store = await readJson(dataPath);
  const newCase = {
    id: id("case"),
    createdAt: new Date().toISOString(),
    status: "open",
    outcome: "",
    lesson: "",
    ...req.body
  };
  store.cases = [newCase, ...(store.cases || [])];
  await writeJson(dataPath, store);
  res.status(201).json(newCase);
});

app.patch("/api/cases/:caseId", async (req, res) => {
  const store = await readJson(dataPath);
  const index = (store.cases || []).findIndex(c => c.id === req.params.caseId);
  if (index < 0) return res.status(404).json({ error: "Case not found." });
  store.cases[index] = { ...store.cases[index], ...req.body, updatedAt: new Date().toISOString() };
  await writeJson(dataPath, store);
  res.json(store.cases[index]);
});

app.post("/api/people", async (req, res) => {
  const { name, role = "", notes = "" } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  const store = await readJson(dataPath);
  const person = { id: id("person"), name: name.trim(), role: role.trim(), notes: notes.trim(), createdAt: new Date().toISOString() };
  store.people = [person, ...(store.people || [])];
  await writeJson(dataPath, store);
  res.status(201).json(person);
});

app.patch("/api/people/:personId", async (req, res) => {
  const store = await readJson(dataPath);
  const index = (store.people || []).findIndex(p => p.id === req.params.personId);
  if (index < 0) return res.status(404).json({ error: "Person not found." });
  store.people[index] = { ...store.people[index], ...req.body, updatedAt: new Date().toISOString() };
  await writeJson(dataPath, store);
  res.json(store.people[index]);
});

app.put("/api/profile", async (req, res) => {
  const store = await readJson(dataPath);
  store.profile = { ...(store.profile || {}), ...(req.body || {}) };
  await writeJson(dataPath, store);
  res.json(store.profile);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Chanakya AI running at http://localhost:${port}`);
});
