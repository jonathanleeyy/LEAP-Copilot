const state = {
  apiBase: localStorage.getItem("leap_api_base") || "http://127.0.0.1:8000",
  user: null,
  modules: [],
  moduleDetails: {},
  events: [],
  latestRecommendationId: null,
  metrics: null,
};

let navigateToScreen = () => {};

const ACCOUNTS_KEY = "leap_accounts_v1";
const SESSION_KEY = "leap_session_user";

const el = {
  authScreen: document.getElementById("authScreen"),
  appLayout: document.getElementById("appLayout"),
  authUsername: document.getElementById("authUsername"),
  authPassword: document.getElementById("authPassword"),
  authStatus: document.getElementById("authStatus"),
  loginBtn: document.getElementById("loginBtn"),
  signupBtn: document.getElementById("signupBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  sessionUser: document.getElementById("sessionUser"),
  apiBase: document.getElementById("apiBase"),
  statusText: document.getElementById("statusText"),
  accountInfo: document.getElementById("accountInfo"),
  moduleYear: document.getElementById("moduleYear"),
  moduleSemester: document.getElementById("moduleSemester"),
  moduleInput: document.getElementById("moduleInput"),
  moduleDeadline: document.getElementById("moduleDeadline"),
  moduleList: document.getElementById("moduleList"),
  detailModuleSelect: document.getElementById("detailModuleSelect"),
  topicInput: document.getElementById("topicInput"),
  assignmentTitle: document.getElementById("assignmentTitle"),
  assignmentMarksObtained: document.getElementById("assignmentMarksObtained"),
  assignmentMarksTotal: document.getElementById("assignmentMarksTotal"),
  assignmentDueDate: document.getElementById("assignmentDueDate"),
  moduleDetailsList: document.getElementById("moduleDetailsList"),
  eventConcept: document.getElementById("eventConcept"),
  eventMarksObtained: document.getElementById("eventMarksObtained"),
  eventMarksTotal: document.getElementById("eventMarksTotal"),
  eventRt: document.getElementById("eventRt"),
  eventDifficulty: document.getElementById("eventDifficulty"),
  eventAttempt: document.getElementById("eventAttempt"),
  eventTableWrap: document.getElementById("eventTableWrap"),
  dailyMinutes: document.getElementById("dailyMinutes"),
  conceptStates: document.getElementById("conceptStates"),
  diagnosis: document.getElementById("diagnosis"),
  plan: document.getElementById("plan"),
  insights: document.getElementById("insights"),
  metrics: document.getElementById("metrics"),
  weakTopicInput: document.getElementById("weakTopicInput"),
  youtubeLinks: document.getElementById("youtubeLinks"),
  trendChart: document.getElementById("trendChart"),
  moduleChart: document.getElementById("moduleChart"),
  dashboardKpis: document.getElementById("dashboardKpis"),
  deadlineBoard: document.getElementById("deadlineBoard"),
  assignmentReminders: document.getElementById("assignmentReminders"),
  setupProgress: document.getElementById("setupProgress"),
  setupChecklist: document.getElementById("setupChecklist"),
};

const btn = {
  health: document.getElementById("healthBtn"),
  addModule: document.getElementById("addModuleBtn"),
  addTopic: document.getElementById("addTopicBtn"),
  addAssignment: document.getElementById("addAssignmentBtn"),
  addEvent: document.getElementById("addEventBtn"),
  clearEvents: document.getElementById("clearEventsBtn"),
  analyze: document.getElementById("analyzeBtn"),
  metrics: document.getElementById("metricsBtn"),
  youtube: document.getElementById("youtubeBtn"),
};

function setStatus(text) {
  el.statusText.textContent = text;
}

function setAuthStatus(text) {
  el.authStatus.textContent = text;
}

function api(path) {
  return `${state.apiBase.replace(/\/$/, "")}${path}`;
}

async function jsonFetch(path, options = {}) {
  const res = await fetch(api(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

function slug(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s_-]/g, "").replace(/\s+/g, "_");
}

function moduleId(year, semester, name) {
  return `${slug(year)}::${slug(semester)}::${slug(name)}`;
}

function scorePct(event) {
  return Math.round((event.marks_obtained / event.marks_total) * 100);
}

function daysTo(dateText) {
  if (!dateText) return null;
  const now = new Date();
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function userDataKey(username) {
  return `leap_user_data_${username}`;
}

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function defaultUserData() {
  return {
    modules: [],
    moduleDetails: {},
    events: [],
    latestRecommendationId: null,
  };
}

function saveCurrentUserData() {
  if (!state.user) return;
  const payload = {
    modules: state.modules,
    moduleDetails: state.moduleDetails,
    events: state.events,
    latestRecommendationId: state.latestRecommendationId,
  };
  localStorage.setItem(userDataKey(state.user.username), JSON.stringify(payload));
}

function loadUserData(username) {
  try {
    const raw = localStorage.getItem(userDataKey(username));
    if (!raw) return defaultUserData();
    const parsed = JSON.parse(raw);
    return {
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      moduleDetails: parsed.moduleDetails && typeof parsed.moduleDetails === "object" ? parsed.moduleDetails : {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
      latestRecommendationId: parsed.latestRecommendationId || null,
    };
  } catch {
    return defaultUserData();
  }
}

function clearRuntimeData() {
  state.modules = [];
  state.moduleDetails = {};
  state.events = [];
  state.latestRecommendationId = null;
  state.metrics = null;
}

function showAuthView() {
  el.authScreen.classList.remove("hidden");
  el.appLayout.classList.add("hidden");
}

function showAppView() {
  el.authScreen.classList.add("hidden");
  el.appLayout.classList.remove("hidden");
}

function moduleById(id) {
  return state.modules.find((m) => m.id === id) || null;
}

function moduleLabel(id) {
  const m = moduleById(id);
  return m ? `${m.name} (${m.year}, ${m.semester})` : id;
}

function shortModuleLabel(module) {
  const y = module.year.replace("Year ", "Y");
  const s = module.semester.replace("Semester ", "S");
  return `${module.name} | ${y}${s}`;
}

function groupedModules() {
  return state.modules.reduce((acc, module) => {
    const key = `${module.year} | ${module.semester}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(module);
    return acc;
  }, {});
}

function ensureModuleDetails(id) {
  if (!state.moduleDetails[id]) {
    state.moduleDetails[id] = { topics: [], assignments: [] };
  }
  return state.moduleDetails[id];
}

function renderList(container, items, formatter) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<p class="muted">No data yet.</p>';
    return;
  }
  items.forEach((item) => {
    const block = document.createElement("div");
    block.className = "item";
    block.innerHTML = formatter(item);
    container.appendChild(block);
  });
}

function initNavigation() {
  const buttons = Array.from(document.querySelectorAll(".nav-btn"));
  const screens = Array.from(document.querySelectorAll(".screen"));

  function show(name) {
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.screen === name));
    screens.forEach((screen) => screen.classList.toggle("active", screen.id === `screen-${name}`));
  }

  navigateToScreen = show;
  buttons.forEach((button) => button.addEventListener("click", () => show(button.dataset.screen)));
  show("dashboard");

  document.querySelectorAll(".quick-nav").forEach((button) => {
    button.addEventListener("click", () => {
      show(button.dataset.screenTarget);
    });
  });
}

function renderSession() {
  if (!state.user) {
    el.sessionUser.textContent = "-";
    el.accountInfo.textContent = "Not signed in";
    return;
  }
  el.sessionUser.textContent = state.user.username;
  el.accountInfo.textContent = `Logged in as ${state.user.username}`;
}

function renderModuleSelectors() {
  const all = [el.eventConcept, el.detailModuleSelect];
  all.forEach((selectEl) => {
    selectEl.innerHTML = "";
    if (!state.modules.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Add modules first";
      selectEl.appendChild(option);
      return;
    }

    state.modules.forEach((module) => {
      const option = document.createElement("option");
      option.value = module.id;
      option.textContent = shortModuleLabel(module);
      option.title = moduleLabel(module.id);
      selectEl.appendChild(option);
    });
  });
}

function renderModules() {
  const groups = groupedModules();
  el.moduleList.innerHTML = "";

  if (!state.modules.length) {
    el.moduleList.innerHTML = '<span class="muted">No modules added yet.</span>';
  } else {
    Object.keys(groups)
      .sort()
      .forEach((groupKey) => {
        const container = document.createElement("div");
        container.className = "item";
        container.innerHTML = `<strong>${groupKey}</strong>`;

        const row = document.createElement("div");
        row.className = "row";

        groups[groupKey].forEach((module) => {
          const chip = document.createElement("span");
          chip.className = "chip";
          const deadlineText = module.deadline ? ` | Test: ${module.deadline}` : "";
          chip.innerHTML = `${module.name}${deadlineText} <button class="btn ghost" data-remove-module="${module.id}">x</button>`;
          row.appendChild(chip);
        });

        container.appendChild(row);
        el.moduleList.appendChild(container);
      });
  }

  el.moduleList.querySelectorAll("button[data-remove-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.removeModule;
      state.modules = state.modules.filter((module) => module.id !== id);
      delete state.moduleDetails[id];
      state.events = state.events.filter((event) => event.concept_id !== id);
      saveCurrentUserData();
      renderModules();
      renderModuleDetails();
      renderEvents();
      renderDashboard();
    });
  });

  renderModuleSelectors();
}

function renderModuleDetails() {
  el.moduleDetailsList.innerHTML = "";
  if (!state.modules.length) {
    el.moduleDetailsList.innerHTML = '<p class="muted">Add modules first.</p>';
    return;
  }

  state.modules.forEach((module) => {
    const detail = ensureModuleDetails(module.id);
    const topicHtml = detail.topics.length
      ? detail.topics
          .map(
            (topic, i) =>
              `<span class="chip">${topic} <button class="btn ghost" data-remove-topic-module="${module.id}" data-remove-topic-index="${i}">x</button></span>`
          )
          .join(" ")
      : '<span class="muted">No topics yet.</span>';

    const assignmentsHtml = detail.assignments.length
      ? `<table><thead><tr><th>Title</th><th>Marks</th><th>Due Date</th><th>Action</th></tr></thead><tbody>${detail.assignments
          .map(
            (a, i) =>
              `<tr><td>${a.title}</td><td>${a.marks_obtained}/${a.marks_total}</td><td>${a.due_date}</td><td><button class="btn ghost" data-remove-assignment-module="${module.id}" data-remove-assignment-index="${i}">Remove</button></td></tr>`
          )
          .join("")}</tbody></table>`
      : '<span class="muted">No assignments yet.</span>';

    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <strong>${module.name} (${module.year}, ${module.semester})</strong>
      <div class="muted">Topics:</div>
      <div class="row">${topicHtml}</div>
      <div class="muted" style="margin-top:8px;">Assignments:</div>
      <div class="table-wrap">${assignmentsHtml}</div>
    `;
    el.moduleDetailsList.appendChild(card);
  });

  el.moduleDetailsList.querySelectorAll("button[data-remove-topic-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const moduleIdValue = button.dataset.removeTopicModule;
      const index = Number(button.dataset.removeTopicIndex);
      const detail = ensureModuleDetails(moduleIdValue);
      detail.topics.splice(index, 1);
      saveCurrentUserData();
      renderModuleDetails();
      renderDashboard();
    });
  });

  el.moduleDetailsList.querySelectorAll("button[data-remove-assignment-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const moduleIdValue = button.dataset.removeAssignmentModule;
      const index = Number(button.dataset.removeAssignmentIndex);
      const detail = ensureModuleDetails(moduleIdValue);
      detail.assignments.splice(index, 1);
      saveCurrentUserData();
      renderModuleDetails();
      renderDashboard();
    });
  });
}

function renderEvents() {
  if (!state.events.length) {
    el.eventTableWrap.innerHTML = '<p class="muted">No study logs yet.</p>';
    drawCharts();
    return;
  }

  const rows = state.events
    .map(
      (event, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${moduleLabel(event.concept_id)}</td>
        <td>${event.marks_obtained}/${event.marks_total} (${scorePct(event)}%)</td>
        <td>${event.response_time_sec}</td>
        <td>${event.difficulty}</td>
        <td>${event.attempt_no}</td>
        <td><button class="btn ghost" data-remove-log="${index}">Remove</button></td>
      </tr>`
    )
    .join("");

  el.eventTableWrap.innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Module</th><th>Marks</th><th>RT(s)</th><th>Difficulty</th><th>Attempt</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  el.eventTableWrap.querySelectorAll("button[data-remove-log]").forEach((button) => {
    button.addEventListener("click", () => {
      state.events.splice(Number(button.dataset.removeLog), 1);
      saveCurrentUserData();
      renderEvents();
      renderDashboard();
    });
  });

  drawCharts();
}

function averageByModule(moduleIdValue) {
  const fromLogs = state.events.filter((event) => event.concept_id === moduleIdValue).map((event) => scorePct(event));
  const detail = ensureModuleDetails(moduleIdValue);
  const fromAssignments = detail.assignments.map((a) => Math.round((a.marks_obtained / a.marks_total) * 100));
  const allScores = [...fromLogs, ...fromAssignments];
  if (!allScores.length) return null;
  return Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
}

function renderDashboard() {
  const totalModules = state.modules.length;
  const totalLogs = state.events.length;
  const avgScores = state.modules.map((module) => averageByModule(module.id)).filter((v) => v !== null);
  const avgScore = avgScores.length ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length) : 0;

  const weakCount = state.modules.filter((module) => {
    const avg = averageByModule(module.id);
    return avg !== null && avg < 60;
  }).length;

  el.dashboardKpis.innerHTML = `
    <div class="kpi"><span class="muted">Modules Added</span><strong>${totalModules}</strong></div>
    <div class="kpi"><span class="muted">Study Logs</span><strong>${totalLogs}</strong></div>
    <div class="kpi"><span class="muted">Average Score</span><strong>${avgScore}%</strong></div>
    <div class="kpi"><span class="muted">Weak Modules</span><strong>${weakCount}</strong></div>
  `;

  const modulesReady = state.modules.length > 0;
  const topicsReady = state.modules.length > 0 && state.modules.every((m) => ensureModuleDetails(m.id).topics.length > 0);
  const assignmentsReady =
    state.modules.length > 0 && state.modules.every((m) => ensureModuleDetails(m.id).assignments.length > 0);
  const logsReady = state.events.length > 0;

  const checks = [
    { label: "Add at least one module", ok: modulesReady },
    { label: "Add at least one topic for each module", ok: topicsReady },
    { label: "Add at least one assignment for each module", ok: assignmentsReady },
    { label: "Add study logs", ok: logsReady },
  ];
  const doneCount = checks.filter((c) => c.ok).length;
  const progress = Math.round((doneCount / checks.length) * 100);
  el.setupProgress.style.width = `${progress}%`;
  el.setupChecklist.innerHTML = checks
    .map(
      (c) =>
        `<div class="item"><strong class="${c.ok ? "badge-good" : "badge-warn"}">${c.ok ? "Done" : "Pending"}</strong><div class="muted">${c.label}</div></div>`
    )
    .join("");

  const deadlines = state.modules
    .filter((module) => module.deadline)
    .map((module) => ({ module, daysLeft: daysTo(module.deadline), avg: averageByModule(module.id) }))
    .filter((x) => x.daysLeft !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  renderList(el.deadlineBoard, deadlines, (item) => {
    const pressure = item.daysLeft <= 3 ? "badge-bad" : item.daysLeft <= 7 ? "badge-warn" : "badge-good";
    const avgText = item.avg === null ? "No scores yet" : `${item.avg}% avg`;
    return `<strong>${item.module.name} (${item.module.year}, ${item.module.semester})</strong><div class="muted">Test: ${item.module.deadline} | <span class="${pressure}">${item.daysLeft} day(s) left</span> | ${avgText}</div>`;
  });

  const reminders = [];
  state.modules.forEach((module) => {
    const detail = ensureModuleDetails(module.id);
    detail.assignments.forEach((assignment) => {
      const left = daysTo(assignment.due_date);
      if (left !== null && left >= 0 && left <= 3) reminders.push({ module, assignment, left });
    });
  });
  reminders.sort((a, b) => a.left - b.left);

  renderList(el.assignmentReminders, reminders, (r) => {
    const tone = r.left <= 1 ? "badge-bad" : "badge-warn";
    return `<strong>${r.assignment.title}</strong><div class="muted">${r.module.name} (${r.module.year}, ${r.module.semester}) | Due: ${r.assignment.due_date} | <span class="${tone}">${r.left} day(s) left</span></div>`;
  });
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function drawLineChart(canvas, values) {
  const ctx = clearCanvas(canvas);
  ctx.strokeStyle = "#4ce1ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pad = 24;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  values.forEach((value, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * w;
    const y = pad + ((100 - value) / 100) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#9aa8d6";
  ctx.font = "12px Inter";
  ctx.fillText("Score trend", 12, 16);
}

function drawBarChart(canvas, labels, values) {
  const ctx = clearCanvas(canvas);
  const pad = 24;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const gap = 10;
  const barW = Math.max(20, w / Math.max(values.length, 1) - gap);
  values.forEach((v, i) => {
    const x = pad + i * (barW + gap);
    const barH = (v / 100) * h;
    const y = pad + (h - barH);
    ctx.fillStyle = "rgba(209,108,255,0.85)";
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = "#9aa8d6";
    ctx.font = "11px Inter";
    ctx.fillText(labels[i].slice(0, 10), x, pad + h + 14);
  });
  ctx.fillStyle = "#9aa8d6";
  ctx.fillText("Module averages", 12, 16);
}

function drawCharts() {
  const scoreTimeline = state.events.map((event) => scorePct(event));
  if (!scoreTimeline.length) {
    const trend = clearCanvas(el.trendChart);
    trend.fillStyle = "#9aa8d6";
    trend.fillText("Add study logs to render trend", 20, 30);
    const module = clearCanvas(el.moduleChart);
    module.fillStyle = "#9aa8d6";
    module.fillText("Add modules + assignments/logs to render bars", 20, 30);
    return;
  }
  drawLineChart(el.trendChart, scoreTimeline);

  const labels = [];
  const values = [];
  state.modules.forEach((m) => {
    const avg = averageByModule(m.id);
    if (avg !== null) {
      labels.push(m.name);
      values.push(avg);
    }
  });
  if (!labels.length) return;
  drawBarChart(el.moduleChart, labels, values);
}

function feedbackButtons(recommendationId) {
  return `
    <div class="row">
      <button class="btn" data-feedback="accept" data-rec="${recommendationId}">Accept</button>
      <button class="btn ghost" data-feedback="edit" data-rec="${recommendationId}">Edit</button>
      <button class="btn ghost" data-feedback="reject" data-rec="${recommendationId}">Reject</button>
    </div>`;
}

function renderInsights(data) {
  const lines = [];
  if (data.diagnosis?.length) {
    const top = data.diagnosis[0];
    lines.push(`Main issue: ${moduleLabel(top.concept_id)} (${top.cause.replaceAll("_", " ")}).`);
  }
  state.modules.forEach((m) => {
    const avg = averageByModule(m.id);
    const d = daysTo(m.deadline);
    if (avg === null || d === null || d <= 0) return;
    const gap = Math.max(0, 80 - avg);
    const suggested = Math.min(120, Math.max(20, Math.round((gap / 80) * 90 + (14 / Math.max(d, 1)) * 20)));
    lines.push(`${m.name} (${m.year}, ${m.semester}): ${avg}% avg, ${d} day(s) to test, study ${suggested} min/day.`);
  });
  renderList(el.insights, lines, (line) => `<span>${line}</span>`);
}

function renderAnalysis(data) {
  state.latestRecommendationId = data.recommendation_id;
  saveCurrentUserData();

  renderList(el.conceptStates, data.concept_states || [], (concept) => {
    const badge = concept.trend === "improving" ? "badge-good" : concept.trend === "regressing" ? "badge-bad" : "badge-warn";
    return `<strong>${moduleLabel(concept.concept_id)}</strong><div class="muted">Mastery ${Math.round(concept.mastery_score * 100)}% | <span class="${badge}">${concept.trend}</span></div><div class="muted">${(concept.evidence || []).join(" | ")}</div>`;
  });

  renderList(el.diagnosis, data.diagnosis || [], (diag) => {
    return `<strong>${moduleLabel(diag.concept_id)}</strong><div class="muted">Cause: ${diag.cause.replaceAll("_", " ")} | Score: ${Math.round(diag.score * 100)}%</div><div class="muted">${(diag.evidence || []).slice(0, 3).join(" | ")}</div>`;
  });

  el.plan.innerHTML = "";
  (data.seven_day_plan || []).forEach((task) => {
    const card = document.createElement("div");
    card.className = "plan-card";
    card.innerHTML = `
      <div class="plan-head"><strong>Day ${task.day} - ${moduleLabel(task.concept_id)}</strong><span class="tag">${task.duration_min} min</span></div>
      <p>${task.activity}</p>
      <p class="muted">${task.expected_outcome}</p>
      <p class="muted">Evidence: ${(task.evidence || []).join(" | ")}</p>
      ${feedbackButtons(data.recommendation_id)}
    `;
    el.plan.appendChild(card);
  });

  el.plan.querySelectorAll("button[data-feedback]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.feedback;
      const recommendationId = Number(button.dataset.rec);
      const note = prompt(`Optional note for ${action}:`, `${action} by ${state.user?.username || "student"}`) || "";
      try {
        await jsonFetch("/feedback", {
          method: "POST",
          body: JSON.stringify({ recommendation_id: recommendationId, action, note }),
        });
        setStatus(`Feedback submitted: ${action}`);
        await refreshMetrics();
      } catch (err) {
        setStatus(`Feedback failed: ${err.message}`);
      }
    });
  });

  renderInsights(data);
}

async function refreshMetrics() {
  try {
    const m = await jsonFetch("/metrics");
    state.metrics = m;
    el.metrics.innerHTML = `
      <div class="metric"><span>Total Recommendations</span><strong>${m.total_recommendations}</strong></div>
      <div class="metric"><span>Total Feedback</span><strong>${m.total_feedback}</strong></div>
      <div class="metric"><span>Accept Rate</span><strong>${Math.round(m.accept_rate * 100)}%</strong></div>
      <div class="metric"><span>Edit Rate</span><strong>${Math.round(m.edit_rate * 100)}%</strong></div>
      <div class="metric"><span>Reject Rate</span><strong>${Math.round(m.reject_rate * 100)}%</strong></div>
      <div class="metric"><span>Actionability</span><strong>${Math.round(m.actionability_rate * 100)}%</strong></div>
      <div class="metric"><span>Explainability</span><strong>${Math.round(m.explainability_coverage * 100)}%</strong></div>
    `;
  } catch (err) {
    el.metrics.innerHTML = `<p class="muted">Metrics unavailable: ${err.message}</p>`;
  }
}

async function renderYoutubeLinks(topic) {
  const query = topic.trim();
  el.youtubeLinks.innerHTML = "";
  if (!query) {
    el.youtubeLinks.innerHTML = '<p class="muted">Enter a topic first.</p>';
    return;
  }

  setStatus(`Searching YouTube: ${query}`);
  try {
    const data = await jsonFetch(`/youtube/search?q=${encodeURIComponent(query)}&limit=10`);
    if (!data.results?.length) {
      el.youtubeLinks.innerHTML = '<p class="muted">No YouTube videos found.</p>';
      setStatus("No YouTube videos found.");
      return;
    }

    el.youtubeLinks.innerHTML = data.results
      .map(
        (video) => `
        <div class="item youtube-item">
          <img src="${video.thumbnail}" alt="${video.title}" class="yt-thumb" />
          <div>
            <strong>${video.title}</strong>
            <div class="muted">${video.channel}${video.duration ? ` | ${video.duration}` : ""}</div>
            <a href="${video.url}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
          </div>
        </div>`
      )
      .join("");
    setStatus(`Loaded top ${data.results.length} YouTube videos.`);
  } catch (err) {
    el.youtubeLinks.innerHTML = `<p class="muted">YouTube search failed: ${err.message}</p>`;
    setStatus(`YouTube search failed: ${err.message}`);
  }
}

function moduleSetupIssues() {
  const issues = [];
  state.modules.forEach((module) => {
    const detail = ensureModuleDetails(module.id);
    if (!detail.topics.length) issues.push(`${module.name} (${module.year}, ${module.semester}) missing topics`);
    if (!detail.assignments.length) issues.push(`${module.name} (${module.year}, ${module.semester}) missing assignments`);
  });
  return issues;
}

function enterSession(username) {
  state.user = { username };
  localStorage.setItem(SESSION_KEY, username);

  const data = loadUserData(username);
  state.modules = data.modules;
  state.moduleDetails = data.moduleDetails;
  state.events = data.events;
  state.latestRecommendationId = data.latestRecommendationId;

  renderSession();
  renderModules();
  renderModuleDetails();
  renderEvents();
  renderDashboard();
  drawCharts();
  void refreshMetrics();
  showAppView();
  navigateToScreen("dashboard");
  setStatus("Ready");
}

function logoutSession() {
  saveCurrentUserData();
  state.user = null;
  clearRuntimeData();
  localStorage.removeItem(SESSION_KEY);
  showAuthView();
  renderSession();
  setAuthStatus("Logged out. Login again to continue.");
}

el.signupBtn.addEventListener("click", () => {
  const username = el.authUsername.value.trim();
  const password = el.authPassword.value;
  if (!username || !password) {
    setAuthStatus("Enter username and password.");
    return;
  }

  const accounts = loadAccounts();
  if (accounts[username]) {
    setAuthStatus("Username already exists. Use Login.");
    return;
  }

  accounts[username] = { password };
  saveAccounts(accounts);
  setAuthStatus("Account created. Logged in.");
  enterSession(username);
});

el.loginBtn.addEventListener("click", () => {
  const username = el.authUsername.value.trim();
  const password = el.authPassword.value;
  if (!username || !password) {
    setAuthStatus("Enter username and password.");
    return;
  }

  const accounts = loadAccounts();
  if (!accounts[username]) {
    setAuthStatus("Account not found. Create account first.");
    return;
  }
  if (accounts[username].password !== password) {
    setAuthStatus("Wrong password.");
    return;
  }

  setAuthStatus("Login successful.");
  enterSession(username);
});

el.logoutBtn.addEventListener("click", logoutSession);

btn.health.addEventListener("click", async () => {
  state.apiBase = el.apiBase.value.trim();
  localStorage.setItem("leap_api_base", state.apiBase);
  try {
    const health = await jsonFetch("/health");
    setStatus(`Backend healthy: ${health.status}`);
  } catch (err) {
    setStatus(`Health check failed: ${err.message}`);
  }
});

btn.addModule.addEventListener("click", () => {
  if (!state.user) return;
  const year = el.moduleYear.value.trim();
  const semester = el.moduleSemester.value.trim();
  const name = slug(el.moduleInput.value);
  const deadline = el.moduleDeadline.value || null;
  if (!name) {
    setStatus("Enter module name.");
    return;
  }

  const id = moduleId(year, semester, name);
  if (state.modules.some((module) => module.id === id)) {
    setStatus("This module already exists in selected year + semester.");
    return;
  }

  state.modules.push({ id, name, year, semester, deadline });
  ensureModuleDetails(id);
  state.modules.sort((a, b) => a.year.localeCompare(b.year) || a.semester.localeCompare(b.semester) || a.name.localeCompare(b.name));
  saveCurrentUserData();
  renderModules();
  renderModuleDetails();
  renderDashboard();
  el.moduleInput.value = "";
  el.moduleDeadline.value = "";
  setStatus(`Added ${name} in ${year}, ${semester}`);
});

btn.addTopic.addEventListener("click", () => {
  if (!state.user) return;
  const moduleIdValue = el.detailModuleSelect.value;
  const topic = el.topicInput.value.trim();
  if (!moduleIdValue || !moduleById(moduleIdValue)) {
    setStatus("Select a module first.");
    return;
  }
  if (!topic) {
    setStatus("Enter a topic.");
    return;
  }

  const detail = ensureModuleDetails(moduleIdValue);
  if (!detail.topics.includes(topic)) detail.topics.push(topic);
  saveCurrentUserData();
  renderModuleDetails();
  renderDashboard();
  el.topicInput.value = "";
  setStatus(`Topic added to ${moduleLabel(moduleIdValue)}`);
});

btn.addAssignment.addEventListener("click", () => {
  if (!state.user) return;
  const moduleIdValue = el.detailModuleSelect.value;
  const title = el.assignmentTitle.value.trim();
  const marksObtained = Number(el.assignmentMarksObtained.value);
  const marksTotal = Number(el.assignmentMarksTotal.value);
  const dueDate = el.assignmentDueDate.value;

  if (!moduleIdValue || !moduleById(moduleIdValue)) {
    setStatus("Select a module first.");
    return;
  }
  if (!title) {
    setStatus("Enter assignment title.");
    return;
  }
  if (!(marksTotal > 0) || marksObtained < 0 || marksObtained > marksTotal) {
    setStatus("Invalid assignment marks.");
    return;
  }
  if (!dueDate) {
    setStatus("Select assignment due date.");
    return;
  }

  const detail = ensureModuleDetails(moduleIdValue);
  detail.assignments.push({
    id: `a_${Date.now()}`,
    title,
    marks_obtained: marksObtained,
    marks_total: marksTotal,
    due_date: dueDate,
  });

  saveCurrentUserData();
  renderModuleDetails();
  renderDashboard();
  drawCharts();
  el.assignmentTitle.value = "";
  el.assignmentMarksObtained.value = "0";
  el.assignmentMarksTotal.value = "10";
  el.assignmentDueDate.value = "";
  setStatus(`Assignment added to ${moduleLabel(moduleIdValue)}`);
});

btn.addEvent.addEventListener("click", () => {
  if (!state.user) {
    setStatus("Login first.");
    return;
  }
  if (!state.modules.length) {
    setStatus("Add modules first.");
    return;
  }

  const conceptId = el.eventConcept.value;
  const marksObtained = Number(el.eventMarksObtained.value);
  const marksTotal = Number(el.eventMarksTotal.value);
  const responseTimeSec = Number(el.eventRt.value);
  const difficulty = Number(el.eventDifficulty.value);
  const attemptNo = Number(el.eventAttempt.value);

  if (!conceptId) {
    setStatus("Select a module.");
    return;
  }
  if (!(marksTotal > 0) || marksObtained < 0 || marksObtained > marksTotal) {
    setStatus("Invalid marks.");
    return;
  }
  if (!(responseTimeSec > 0)) {
    setStatus("Response time must be > 0.");
    return;
  }
  if (difficulty < 0 || difficulty > 1) {
    setStatus("Difficulty must be between 0 and 1.");
    return;
  }
  if (!(attemptNo >= 1)) {
    setStatus("Attempt number must be >= 1.");
    return;
  }

  const pct = marksObtained / marksTotal;
  state.events.push({
    student_id: state.user.username,
    timestamp: new Date().toISOString(),
    question_id: `q_${Date.now()}`,
    concept_id: conceptId,
    correct: pct >= 0.5 ? 1 : 0,
    response_time_sec: responseTimeSec,
    attempt_no: attemptNo,
    difficulty,
    source: "study_log",
    marks_obtained: marksObtained,
    marks_total: marksTotal,
  });

  saveCurrentUserData();
  renderEvents();
  renderDashboard();
  setStatus("Study log added.");
});

btn.clearEvents.addEventListener("click", () => {
  if (!state.user) return;
  state.events = [];
  saveCurrentUserData();
  renderEvents();
  renderDashboard();
  el.conceptStates.innerHTML = "";
  el.diagnosis.innerHTML = "";
  el.plan.innerHTML = "";
  el.insights.innerHTML = "";
  setStatus("Study logs cleared.");
});

btn.analyze.addEventListener("click", async () => {
  if (!state.user) {
    setStatus("Login first.");
    return;
  }
  if (!state.modules.length) {
    setStatus("Add modules first.");
    return;
  }

  const issues = moduleSetupIssues();
  if (issues.length) {
    setStatus(`Complete module setup first: ${issues[0]}`);
    return;
  }

  const dailyMinutes = Number(el.dailyMinutes.value || 45);
  if (dailyMinutes < 15 || dailyMinutes > 240) {
    setStatus("Daily minutes must be between 15 and 240.");
    return;
  }

  const assignmentEvents = [];
  state.modules.forEach((module) => {
    const detail = ensureModuleDetails(module.id);
    detail.assignments.forEach((assignment, index) => {
      const pct = assignment.marks_obtained / assignment.marks_total;
      assignmentEvents.push({
        student_id: state.user.username,
        timestamp: new Date(`${assignment.due_date}T12:00:00`).toISOString(),
        question_id: `assign_${module.id}_${index}`,
        concept_id: module.id,
        correct: pct >= 0.5 ? 1 : 0,
        response_time_sec: 60,
        attempt_no: 1,
        difficulty: 0.6,
        source: "assignment",
      });
    });
  });

  const logEvents = state.events.map((event) => ({
    student_id: event.student_id,
    timestamp: event.timestamp,
    question_id: event.question_id,
    concept_id: event.concept_id,
    correct: event.correct,
    response_time_sec: event.response_time_sec,
    attempt_no: event.attempt_no,
    difficulty: event.difficulty,
    source: event.source,
  }));

  const mergedEvents = [...logEvents, ...assignmentEvents];
  if (!mergedEvents.length) {
    setStatus("Add at least one study log or assignment first.");
    return;
  }

  const moduleContexts = state.modules.map((module) => {
    const detail = ensureModuleDetails(module.id);
    return {
      concept_id: module.id,
      topics: detail.topics,
      assignments: detail.assignments.map((a) => ({
        title: a.title,
        due_date: new Date(`${a.due_date}T12:00:00`).toISOString(),
        marks_obtained: a.marks_obtained,
        marks_total: a.marks_total,
      })),
    };
  });

  try {
    setStatus("Generating 7-day plan...");
    const data = await jsonFetch("/analyze", {
      method: "POST",
      body: JSON.stringify({
        student_id: state.user.username,
        daily_minutes: dailyMinutes,
        events: mergedEvents,
        module_contexts: moduleContexts,
      }),
    });
    renderAnalysis(data);
    await refreshMetrics();
    setStatus(data.summary || "Analysis complete.");
  } catch (err) {
    setStatus(`Analysis failed: ${err.message}`);
  }
});

btn.metrics.addEventListener("click", refreshMetrics);
btn.youtube.addEventListener("click", () => {
  void renderYoutubeLinks(el.weakTopicInput.value);
});

(function init() {
  initNavigation();
  el.apiBase.value = state.apiBase;

  const remembered = localStorage.getItem(SESSION_KEY);
  if (remembered) {
    el.authUsername.value = remembered;
  }

  showAuthView();
  renderSession();
})();
