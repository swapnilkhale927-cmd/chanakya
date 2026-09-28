let state = { cases: [], people: [], principles: [], profile: {} };
let currentMode = "professional";
let lastPayload = null;
let lastAnalysis = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
}

function headers(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  const password = sessionStorage.getItem("chanakya_password");
  if (password) h["X-App-Password"] = password;
  return h;
}

async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers: headers(options.headers || {}) });
  if (res.status === 401) {
    $("#passwordDialog").showModal();
    throw new Error("Private app password required.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function setView(id) {
  $$(".view").forEach(v => v.classList.toggle("active", v.id === id));
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function list(items) {
  if (!items?.length) return `<p class="muted">None identified.</p>`;
  return `<ul>${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

function renderAnalysis(a) {
  const r = $("#result");
  r.classList.remove("hidden");
  r.innerHTML = `
    <div class="result-title">
      <p class="eyebrow">STRATEGIC READ</p>
      <h2>${esc(a.title)}</h2>
      <p>${esc(a.situation_summary)}</p>
      <span class="score">Information confidence <b>${esc(a.confidence)}%</b></span>
    </div>

    <div class="card big-action"><h3>🎯 Objective</h3><p>${esc(a.objective)}</p></div>
    <div class="card big-action"><h3>⚔️ Recommended move</h3><p>${esc(a.recommended_action)}</p></div>

    <div class="analysis-grid">
      <div class="card"><h3>🧠 Interests</h3>${list(a.lenses.interests)}</div>
      <div class="card"><h3>⚖️ Power & leverage</h3>${list(a.lenses.power)}</div>
      <div class="card"><h3>🤝 Allies</h3>${list(a.lenses.allies)}</div>
      <div class="card"><h3>🧱 Resistance</h3>${list(a.lenses.resistance)}</div>
    </div>

    <div class="card"><h3>⏳ Timing</h3><p>${esc(a.lenses.timing)}</p></div>
    <div class="card"><h3>🔎 Information</h3><p>${esc(a.lenses.information)}</p>${list(a.missing_information)}</div>
    <div class="card"><h3>🔮 Second-order effect</h3><p>${esc(a.lenses.second_order)}</p></div>

    <div class="card">
      <h3>Strategy sequence</h3>
      ${a.strategy_sequence.map((s,i) => `<div class="strategy-step"><div class="step-num">${i+1}</div><div><b>${esc(s.principle)} — ${esc(s.move)}</b><span>${esc(s.why)}</span></div></div>`).join("")}
    </div>

    <div class="analysis-grid">
      <div class="card"><h3>Next 24 hours</h3>${list(a.next_24_hours)}</div>
      <div class="card"><h3>🚫 Avoid</h3>${list(a.avoid)}</div>
    </div>

    <div class="card"><h3>Risk controls</h3>${a.risks.map(x => `<p><b>${esc(x.risk)}</b><br><span class="muted">${esc(x.mitigation)}</span></p>`).join("")}</div>

    <div class="card"><h3>Chanakya principles used</h3>
      ${a.principles_used.map(p => `<div class="principle-row"><b>${esc(p.name)}</b><p>${esc(p.application)}</p><div class="source">${esc(p.source_basis)}</div></div>`).join("<hr style='border:0;border-top:1px solid var(--line);margin:16px 0'>")}
    </div>
    <div class="card"><h3>🛡️ Ethical check</h3><p>${esc(a.ethical_check)}</p></div>
    <div class="card"><h3>Reflection</h3><p>${esc(a.reflection_question)}</p></div>
    <button class="primary" id="saveCaseBtn">📓 Save as case</button>
  `;
  $("#saveCaseBtn").addEventListener("click", saveCase);
  r.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function analyze() {
  const situation = $("#situation").value.trim();
  const objective = $("#objective").value.trim();
  const context = $("#context").value.trim();
  const status = $("#status");
  if (situation.length < 15) {
    status.textContent = "Describe the situation in a little more detail.";
    status.className = "status error";
    return;
  }
  lastPayload = { mode: currentMode, situation, objective, context };
  $("#analyzeBtn").disabled = true;
  status.className = "status";
  status.textContent = "Analyzing objective, interests, leverage, timing and second-order effects…";
  try {
    const data = await api("/api/analyze", { method: "POST", body: JSON.stringify(lastPayload) });
    lastAnalysis = data.analysis;
    renderAnalysis(lastAnalysis);
    status.textContent = `Analysis complete · ${data.model}`;
  } catch (e) {
    status.textContent = e.message;
    status.className = "status error";
  } finally {
    $("#analyzeBtn").disabled = false;
  }
}

async function saveCase() {
  if (!lastAnalysis || !lastPayload) return;
  const saved = await api("/api/cases", {
    method: "POST",
    body: JSON.stringify({ mode: lastPayload.mode, input: lastPayload, analysis: lastAnalysis })
  });
  state.cases = [saved, ...state.cases];
  renderCases();
  $("#saveCaseBtn").textContent = "✓ Saved to journal";
  $("#saveCaseBtn").disabled = true;
}

function renderCases() {
  const el = $("#casesList");
  if (!state.cases.length) {
    el.innerHTML = `<div class="notice">No cases yet. Analyze a real situation and save it to start building your decision journal.</div>`;
    return;
  }
  el.innerHTML = state.cases.map(c => `
    <article class="card" data-case="${esc(c.id)}">
      <span class="badge">${esc(c.mode || "case")}</span>
      <h3 style="margin-top:10px">${esc(c.analysis?.title || "Untitled case")}</h3>
      <p>${esc(c.analysis?.recommended_action || "")}</p>
      <div class="case-meta">${new Date(c.createdAt).toLocaleString()} · ${esc(c.status || "open")}</div>
      <div class="outcome-box">
        <label>What actually happened?<textarea class="case-outcome" rows="2" placeholder="Record the outcome...">${esc(c.outcome || "")}</textarea></label>
        <label>Lesson<textarea class="case-lesson" rows="2" placeholder="What should future-you learn from this?">${esc(c.lesson || "")}</textarea></label>
        <button class="ghost save-outcome">Save outcome</button>
      </div>
    </article>
  `).join("");
  $$(".save-outcome").forEach(btn => btn.addEventListener("click", async (e) => {
    const card = e.target.closest("[data-case]");
    const caseId = card.dataset.case;
    const updated = await api(`/api/cases/${caseId}`, {
      method: "PATCH",
      body: JSON.stringify({
        outcome: card.querySelector(".case-outcome").value.trim(),
        lesson: card.querySelector(".case-lesson").value.trim(),
        status: "reviewed"
      })
    });
    const idx = state.cases.findIndex(c => c.id === caseId);
    if (idx >= 0) state.cases[idx] = updated;
    e.target.textContent = "✓ Saved";
  }));
}

function renderPeople() {
  const el = $("#peopleList");
  if (!state.people.length) {
    el.innerHTML = `<div class="notice">Add only people who materially affect your decisions. Keep observations factual and label guesses as guesses.</div>`;
    return;
  }
  el.innerHTML = state.people.map(p => `
    <article class="card">
      <h3>${esc(p.name)}</h3>
      <div class="person-meta">${esc(p.role || "No role specified")}</div>
      <p>${esc(p.notes || "No notes yet.")}</p>
    </article>
  `).join("");
}

function renderPrinciples() {
  $("#principlesList").innerHTML = state.principles.map(p => `
    <article class="card principle-row">
      <span class="badge">${esc(p.category)}</span>
      <h3 style="margin:10px 0 4px">${esc(p.name)}</h3>
      <p>${esc(p.modern_rule)}</p>
      <p><b>Use:</b> ${esc(p.workplace_use)}</p>
      <p><b>Boundary:</b> ${esc(p.ethical_boundary)}</p>
      <div class="source">${esc(p.classical_basis)}</div>
    </article>
  `).join("");
}

async function addPerson() {
  const payload = {
    name: $("#personName").value.trim(),
    role: $("#personRole").value.trim(),
    notes: $("#personNotes").value.trim()
  };
  if (!payload.name) return;
  const person = await api("/api/people", { method: "POST", body: JSON.stringify(payload) });
  state.people = [person, ...state.people];
  $("#personName").value = $("#personRole").value = $("#personNotes").value = "";
  renderPeople();
}

async function loadState() {
  try {
    state = await api("/api/state");
    renderCases(); renderPeople(); renderPrinciples();
  } catch (e) {
    console.warn(e.message);
  }
}

$$(".tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));
$$(".mode").forEach(m => m.addEventListener("click", () => {
  currentMode = m.dataset.mode;
  $$(".mode").forEach(x => x.classList.toggle("active", x === m));
}));
$("#analyzeBtn").addEventListener("click", analyze);
$("#addPersonBtn").addEventListener("click", addPerson);
$("#lockBtn").addEventListener("click", () => $("#passwordDialog").showModal());
$("#savePasswordBtn").addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.setItem("chanakya_password", $("#passwordInput").value);
  $("#passwordDialog").close();
  loadState();
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
loadState();

window.addEventListener("DOMContentLoaded", () => {
  if (!sessionStorage.getItem("chanakya_password")) {
    const dialog = document.querySelector("#passwordDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
});
