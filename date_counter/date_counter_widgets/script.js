const STORAGE_KEY = "date_widget_list";
const currentWidgetId = new URLSearchParams(window.location.search).get("id");

const inputSection = document.getElementById("input-section");
const counterSection = document.getElementById("counter-section");

const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");

const titleInput = document.getElementById("title");
const startInput = document.getElementById("start-date");
const endInput = document.getElementById("end-date");
const quoteInput = document.getElementById("quote");

const displayTitle = document.getElementById("display-title");
const displayStart = document.getElementById("display-start");
const displayEnd = document.getElementById("display-end");
const displayQuote = document.getElementById("display-quote");

const yearsSpan = document.getElementById("years");
const monthsSpan = document.getElementById("months");
const weeksSpan = document.getElementById("weeks");
const daysSpan = document.getElementById("days");
const hoursSpan = document.getElementById("hours");
const minutesSpan = document.getElementById("minutes");
const secondsSpan = document.getElementById("seconds");

const progressFill = document.getElementById("progress-fill");
const runner = document.getElementById("runner");
const progressContainer = document.querySelector(".progress-container");
const countdownDisplay = document.getElementById("countdown");

const addMsBtn = document.getElementById("add-milestone-btn");
const viewMsBtn = document.getElementById("view-milestones-btn");
const toggleToolsBtn = document.getElementById("toggle-tools-btn");

const modal = document.getElementById("milestone-modal");
const closeModal = document.querySelector(".modal .close");
const msTitle = document.getElementById("ms-title");
const msStart = document.getElementById("ms-start");
const msEnd = document.getElementById("ms-end");
const msSave = document.getElementById("ms-save");

let countdownInterval = null;
let milestones = [];
let showingMilestoneView = false;

let activeStartDate = null;
let activeEndDate = null;
let activeStartMs = 0;
let activeEndMs = 0;

function getWidgets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWidgets(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getCurrentWidget() {
  if (!currentWidgetId) return null;
  return getWidgets().find(w => String(w.id) === String(currentWidgetId)) || null;
}

function saveCurrentWidget(partial) {
  if (!currentWidgetId) return;

  const list = getWidgets();
  let widget = list.find(w => String(w.id) === String(currentWidgetId));

  if (!widget) {
    widget = {
      id: currentWidgetId,
      title: "",
      quote: "",
      startDate: "",
      endDate: "",
      milestones: []
    };
    list.push(widget);
  }

  Object.assign(widget, partial);
  saveWidgets(list);
}

function serializeMilestones(list) {
  return list.map(ms => ({
    title: ms.title,
    start: ms.start instanceof Date ? ms.start.toISOString() : ms.start,
    end: ms.end instanceof Date ? ms.end.toISOString() : ms.end,
    colors: ms.colors
  }));
}

function deserializeMilestones(list) {
  if (!Array.isArray(list)) return [];
  return list.map(ms => ({
    title: ms.title,
    start: new Date(ms.start),
    end: new Date(ms.end),
    colors: ms.colors || getRandomMilestonePalette()
  }));
}

function parseDateInputLocal(value, endOfDay = false) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) return null;

  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getTimeParts(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  return {
    years: Math.floor(totalSeconds / (365 * 24 * 3600)),
    months: Math.floor((totalSeconds % (365 * 24 * 3600)) / (30 * 24 * 3600)),
    weeks: Math.floor((totalSeconds % (30 * 24 * 3600)) / (7 * 24 * 3600)),
    days: Math.floor((totalSeconds % (7 * 24 * 3600)) / (24 * 3600)),
    hours: Math.floor((totalSeconds % (24 * 3600)) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

function getRandomMilestonePalette() {
  const hue = Math.floor(Math.random() * 360);
  return {
    start: `hsl(${hue}, 85%, 60%)`,
    end: `hsl(${(hue + 35) % 360}, 85%, 68%)`
  };
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[ch] || ch;
  });
}

function animateValue(element, value) {
  element.classList.add("tick");
  setTimeout(() => element.classList.remove("tick"), 300);
  element.textContent = value;
}

function injectRunnerAnimationStyle() {
  if (document.getElementById("runner-anim-style")) return;

  const style = document.createElement("style");
  style.id = "runner-anim-style";
  style.textContent = `
    @keyframes runnerBounce {
      0% { transform: translateY(0px) rotate(-2deg); }
      100% { transform: translateY(-4px) rotate(2deg); }
    }
  `;
  document.head.appendChild(style);
}

function ensureMilestoneView() {
  let view = document.getElementById("milestone-view");

  if (!view) {
    view = document.createElement("div");
    view.id = "milestone-view";
    countdownDisplay.insertAdjacentElement("beforebegin", view);
    view.addEventListener("click", toggleMilestoneView);
  }

  return view;
}

function ensureDeadlineMessage() {
  let msg = document.getElementById("deadline-message");

  if (!msg) {
    msg = document.createElement("div");
    msg.id = "deadline-message";
    msg.style.display = "none";
    countdownDisplay.insertAdjacentElement("beforebegin", msg);
  }

  return msg;
}

function saveCurrentState() {
  saveCurrentWidget({
    title: titleInput.value.trim(),
    quote: quoteInput.value.trim(),
    startDate: startInput.value,
    endDate: endInput.value,
    milestones: serializeMilestones(milestones)
  });
}

function bindEditableTitle() {
  displayTitle.onclick = () => {
    const next = prompt("Edit title:", displayTitle.dataset.raw || "");
    if (next === null) return;

    const value = next.trim();
    titleInput.value = value;
    displayTitle.dataset.raw = value;
    displayTitle.textContent = value;
    displayTitle.style.display = value ? "block" : "none";
    saveCurrentState();
  };
}

function bindEditableQuote() {
  displayQuote.onclick = () => {
    const next = prompt("Edit quote:", displayQuote.dataset.raw || "");
    if (next === null) return;

    const value = next.trim();
    quoteInput.value = value;
    displayQuote.dataset.raw = value;
    displayQuote.textContent = value ? `“ ${value} ”` : "";
    displayQuote.style.display = value ? "block" : "none";
    saveCurrentState();
  };
}

function renderStartEndFlags() {
  if (!progressContainer || !activeStartDate || !activeEndDate) return;

  document.querySelectorAll(".flag-start, .flag-end").forEach(el => el.remove());

  const startFlag = document.createElement("div");
  startFlag.className = "flag flag-start";
  startFlag.innerHTML = `
    <span class="flag-anchor">🚩</span>
    <span class="flag-tooltip">Start: ${activeStartDate.toDateString()}</span>
  `;

  const endFlag = document.createElement("div");
  endFlag.className = "flag flag-end";
  endFlag.innerHTML = `
    <span class="flag-anchor">🚩</span>
    <span class="flag-tooltip">End: ${activeEndDate.toDateString()}</span>
  `;

  progressContainer.appendChild(startFlag);
  progressContainer.appendChild(endFlag);
}

function renderMilestones() {
  if (!progressContainer) return;

  document.querySelectorAll(".ms-pin").forEach(el => el.remove());

  if (!milestones.length || !activeStartMs || !activeEndMs) return;

  const total = activeEndMs - activeStartMs;
  if (total <= 0) return;

  const stackCounts = {};

  milestones
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title))
    .forEach(ms => {
      const startPerc = ((ms.start.getTime() - activeStartMs) / total) * 100;
      const endPerc = ((ms.end.getTime() - activeStartMs) / total) * 100;

      createMilestonePin(startPerc, ms, "start", stackCounts);
      createMilestonePin(endPerc, ms, "end", stackCounts);
    });
}

function createMilestonePin(percent, ms, kind, stackCounts) {
  const key = percent.toFixed(2);
  const stackIndex = stackCounts[key] || 0;
  stackCounts[key] = stackIndex + 1;

  const color = kind === "start" ? ms.colors.start : ms.colors.end;
  const dateText = kind === "start" ? ms.start.toDateString() : ms.end.toDateString();

  const pin = document.createElement("div");
  pin.className = "ms-pin";
  pin.style.left = `calc(${percent}% + 5px)`;
  pin.style.top = `${-6 - stackIndex * 16}px`;

  pin.innerHTML = `
    <div class="pin-line" style="background:${color}"></div>
    <div class="pin-dot" style="background:${color}; box-shadow: 0 0 12px ${color};"></div>
    <span class="flag-tooltip">${kind === "start" ? ms.title + " Start" : ms.title + " End"} • ${dateText}</span>
  `;

  progressContainer.appendChild(pin);
}

function getNextMilestone(now = new Date()) {
  return milestones
    .filter(ms => ms.end > now)
    .sort((a, b) => a.end - b.end || a.start - b.start || a.title.localeCompare(b.title))[0] || null;
}

function updateMilestoneView(now = new Date()) {
  const view = ensureMilestoneView();
  const next = getNextMilestone(now);

  if (!next) {
    view.innerHTML = `
      <div style="font-size:18px;font-weight:700;margin-bottom:8px;">No upcoming milestone</div>
      <div style="opacity:.75;">Tap again to return to the main counter.</div>
    `;
    return;
  }

  const remaining = Math.max(0, next.end - now);
  const parts = getTimeParts(remaining);

  view.innerHTML = `
    <div style="font-size:14px;opacity:.75;margin-bottom:8px;">Next milestone completion</div>
    <div style="font-size:22px;font-weight:800;margin-bottom:10px;">${escapeHtml(next.title)}</div>
    <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.years}</div><div style="font-size:12px;opacity:.8;">Years</div>
      </div>
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.months}</div><div style="font-size:12px;opacity:.8;">Months</div>
      </div>
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.weeks}</div><div style="font-size:12px;opacity:.8;">Weeks</div>
      </div>
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.days}</div><div style="font-size:12px;opacity:.8;">Days</div>
      </div>
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.hours}</div><div style="font-size:12px;opacity:.8;">Hours</div>
      </div>
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.minutes}</div><div style="font-size:12px;opacity:.8;">Minutes</div>
      </div>
      <div style="min-width:74px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.06);">
        <div style="font-size:22px;font-weight:800;">${parts.seconds}</div><div style="font-size:12px;opacity:.8;">Seconds</div>
      </div>
    </div>
    <div style="font-size:13px;opacity:.75;">${next.start.toDateString()} → ${next.end.toDateString()}</div>
    <div style="margin-top:8px;font-size:12px;opacity:.65;">Tap again to go back.</div>
  `;
}

function toggleMilestoneView() {
  if (!milestones.length) return;

  const next = getNextMilestone(new Date());
  if (!next) return;

  const view = ensureMilestoneView();
  showingMilestoneView = !showingMilestoneView;

  if (showingMilestoneView) {
    countdownDisplay.style.display = "none";
    view.style.display = "block";
    updateMilestoneView(new Date());
  } else {
    view.style.display = "none";
    countdownDisplay.style.display = "flex";
  }
}

function updateCountdown(startMs, endMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return;

  const nowMs = Date.now();
  let diff = endMs - nowMs;
  const deadlineMessage = ensureDeadlineMessage();

  if (diff <= 0) {
    diff = 0;
    clearInterval(countdownInterval);
    deadlineMessage.textContent = "⏳ Time's Up!";
    deadlineMessage.style.display = "block";
    countdownDisplay.style.opacity = "0.35";
    progressFill.style.width = "100%";
    runner.style.left = "100%";
    runner.style.animation = "none";
    return;
  }

  deadlineMessage.style.display = "none";
  countdownDisplay.style.opacity = "1";

  const parts = getTimeParts(diff);

  animateValue(yearsSpan, parts.years);
  animateValue(monthsSpan, parts.months);
  animateValue(weeksSpan, parts.weeks);
  animateValue(daysSpan, parts.days);
  animateValue(hoursSpan, parts.hours);
  animateValue(minutesSpan, parts.minutes);
  animateValue(secondsSpan, parts.seconds);

  if (diff < 86400000) {
    document.querySelectorAll("#countdown div").forEach(d => d.classList.add("danger"));
  } else {
    document.querySelectorAll("#countdown div").forEach(d => d.classList.remove("danger"));
  }

  const total = endMs - startMs;
  const elapsed = nowMs - startMs;
  const progress = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;

  progressFill.style.width = progress + "%";
  runner.style.left = progress + "%";
  runner.style.animation = "runnerBounce 0.7s ease-in-out infinite alternate";

  if (showingMilestoneView) {
    updateMilestoneView(new Date(nowMs));
  }
}

function applyToolsVisibility(hidden) {
  [addMsBtn, viewMsBtn].forEach(btn => {
    if (btn) btn.style.display = hidden ? "none" : "inline-block";
  });

  if (toggleToolsBtn) {
    toggleToolsBtn.textContent = hidden ? "Show Tools" : "Hide Tools";
  }
}

function saveCurrentState() {
  saveCurrentWidget({
    title: titleInput.value.trim(),
    quote: quoteInput.value.trim(),
    startDate: startInput.value,
    endDate: endInput.value,
    milestones: serializeMilestones(milestones)
  });
}

function startCounter() {
  const s = parseDateInputLocal(startInput.value, false);
  const e = parseDateInputLocal(endInput.value, true);

  if (!startInput.value || !endInput.value) {
    alert("Please enter dates!");
    return;
  }

  if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) {
    alert("Invalid dates!");
    return;
  }

  activeStartDate = s;
  activeEndDate = e;
  activeStartMs = s.getTime();
  activeEndMs = e.getTime();

  inputSection.style.display = "none";
  counterSection.style.display = "block";
  countdownDisplay.style.display = "flex";
  countdownDisplay.style.opacity = "1";
  showingMilestoneView = false;

  const title = titleInput.value.trim();
  if (title) {
    displayTitle.style.display = "block";
    displayTitle.textContent = title;
    displayTitle.dataset.raw = title;
  } else {
    displayTitle.style.display = "none";
    displayTitle.dataset.raw = "";
  }

  const quote = quoteInput.value.trim();
  if (quote) {
    displayQuote.style.display = "block";
    displayQuote.textContent = `“ ${quote} ”`;
    displayQuote.dataset.raw = quote;
  } else {
    displayQuote.style.display = "none";
    displayQuote.dataset.raw = "";
  }

  displayStart.textContent = s.toDateString();
  displayEnd.textContent = e.toDateString();

  bindEditableTitle();
  bindEditableQuote();

  runner.style.left = "0%";
  progressFill.style.width = "0%";

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => updateCountdown(activeStartMs, activeEndMs), 1000);

  requestAnimationFrame(() => {
    renderStartEndFlags();
    renderMilestones();
    updateCountdown(activeStartMs, activeEndMs);
  });

  saveCurrentState();
}

function resetCounter() {
  clearInterval(countdownInterval);

  inputSection.style.display = "block";
  counterSection.style.display = "none";

  titleInput.value = "";
  startInput.value = "";
  endInput.value = "";
  quoteInput.value = "";

  displayTitle.textContent = "";
  displayQuote.textContent = "";
  displayTitle.dataset.raw = "";
  displayQuote.dataset.raw = "";
  displayTitle.style.display = "none";
  displayQuote.style.display = "none";

  milestones = [];
  showingMilestoneView = false;
  activeStartDate = null;
  activeEndDate = null;
  activeStartMs = 0;
  activeEndMs = 0;

  document.querySelectorAll(".flag-start, .flag-end, .ms-pin").forEach(el => el.remove());

  const milestoneView = document.getElementById("milestone-view");
  if (milestoneView) {
    milestoneView.style.display = "none";
    milestoneView.innerHTML = "";
  }

  const deadlineMessage = document.getElementById("deadline-message");
  if (deadlineMessage) {
    deadlineMessage.style.display = "none";
    deadlineMessage.innerHTML = "";
  }

  progressFill.style.width = "0%";
  runner.style.left = "0%";

  saveCurrentState();
}

function showMilestoneList() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);
    display:flex;justify-content:center;align-items:center;z-index:9999;
  `;

  const panel = document.createElement("div");
  panel.style.cssText = `
    background:#222;padding:20px;border-radius:15px;width:320px;
    max-height:420px;overflow-y:auto;position:relative;text-align:left;
  `;

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✖";
  closeBtn.style.cssText = `
    position:absolute;top:10px;right:15px;cursor:pointer;font-size:18px;
  `;
  closeBtn.addEventListener("click", () => overlay.remove());

  const title = document.createElement("h3");
  title.textContent = "Milestones";

  panel.appendChild(closeBtn);
  panel.appendChild(title);

  if (milestones.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No milestones yet";
    panel.appendChild(empty);
  } else {
    milestones.forEach((ms, index) => {
      const item = document.createElement("div");
      item.style.cssText = `
        margin-bottom:10px;padding:10px 10px 42px;background:#333;
        border-radius:10px;position:relative;
      `;

      item.innerHTML = `
        <strong>${escapeHtml(ms.title)}</strong><br>
        <small>${ms.start.toDateString()} → ${ms.end.toDateString()}</small><br>
        <button class="ms-delete-btn" data-del="${index}">Delete</button>
      `;

      panel.appendChild(item);
    });

    panel.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const index = Number(btn.getAttribute("data-del"));
        milestones.splice(index, 1);
        renderMilestones();
        saveCurrentState();
        overlay.remove();
        showMilestoneList();
      });
    });
  }

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });
}

function initFromSavedWidget() {
  const savedWidget = getCurrentWidget();

  if (savedWidget) {
    titleInput.value = savedWidget.title || "";
    quoteInput.value = savedWidget.quote || "";
    startInput.value = savedWidget.startDate || "";
    endInput.value = savedWidget.endDate || "";
    milestones = deserializeMilestones(savedWidget.milestones || []);
  }

  applyToolsVisibility(localStorage.getItem("date_counter_tools_hidden") === "true");

  if (savedWidget && savedWidget.startDate && savedWidget.endDate) {
    startCounter();
  } else {
    inputSection.style.display = "block";
    counterSection.style.display = "none";
  }
}

injectRunnerAnimationStyle();
initFromSavedWidget();

startBtn.addEventListener("click", startCounter);
resetBtn.addEventListener("click", resetCounter);

if (toggleToolsBtn) {
  toggleToolsBtn.addEventListener("click", () => {
    const hidden = !(localStorage.getItem("date_counter_tools_hidden") === "true");
    localStorage.setItem("date_counter_tools_hidden", String(hidden));
    applyToolsVisibility(hidden);
  });
}

if (viewMsBtn) {
  viewMsBtn.addEventListener("click", showMilestoneList);
}

if (addMsBtn && modal && closeModal && msTitle && msStart && msEnd && msSave) {
  addMsBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  msSave.addEventListener("click", () => {
    const title = msTitle.value.trim();
    const start = parseDateInputLocal(msStart.value, false);
    const end = parseDateInputLocal(msEnd.value, true);

    if (!title || !start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert("Fill all fields correctly!");
      return;
    }

    if (!activeStartDate || !activeEndDate) {
      alert("Start the counter first!");
      return;
    }

    if (start < activeStartDate || end > activeEndDate || start > end) {
      alert("Milestone must be within countdown start & end!");
      return;
    }

    milestones.push({
      title,
      start,
      end,
      colors: getRandomMilestonePalette()
    });

    modal.style.display = "none";
    msTitle.value = "";
    msStart.value = "";
    msEnd.value = "";

    renderMilestones();
    saveCurrentState();

    if (showingMilestoneView) {
      updateMilestoneView(new Date());
    }
  });
}

if (countdownDisplay) {
  countdownDisplay.addEventListener("click", toggleMilestoneView);
}
