// ======================== GLOBAL VARIABLES & SETUP ========================
const STORAGE_KEY = "date_widget_list";
const currentWidgetId = new URLSearchParams(window.location.search).get("id");

// DOM Elements
const inputSection = document.getElementById('input-section');
const counterSection = document.getElementById('counter-section');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const titleInput = document.getElementById('title');
const startInput = document.getElementById('start-datetime');   // Now datetime-local
const endInput = document.getElementById('end-datetime');       // Now datetime-local
const quoteInput = document.getElementById('quote');
const accentColorInput = document.getElementById('accent-color');

const displayTitle = document.getElementById('display-title');
const displayQuote = document.getElementById('display-quote');

const yearsSpan = document.getElementById('years');
const monthsSpan = document.getElementById('months');
const weeksSpan = document.getElementById('weeks');
const daysSpan = document.getElementById('days');
const hoursSpan = document.getElementById('hours');
const minutesSpan = document.getElementById('minutes');
const secondsSpan = document.getElementById('seconds');

const progressFill = document.getElementById('progress-fill');
const runner = document.querySelector('.runner');
const progressContainer = document.querySelector('.progress-container');
const countdownDisplay = document.getElementById('countdown');

const addMsBtn = document.getElementById('add-milestone-btn');
const viewMsBtn = document.getElementById('view-milestones-btn');
const toggleToolsBtn = document.getElementById('toggle-tools-btn');
const modal = document.getElementById('milestone-modal');
const closeModal = document.querySelector('.modal .close');
const msTitle = document.getElementById('ms-title');
const msStart = document.getElementById('ms-start');
const msEnd = document.getElementById('ms-end');
const msSave = document.getElementById('ms-save');

// State
let countdownInterval = null;
let milestones = [];
let showingMilestoneView = false;
let currentAccentColor = '#ff6a00';  // default

// ======================== HELPER: Prevent past dates ========================
function setMinDateTime() {
  const now = new Date();
  // Format to YYYY-MM-DDTHH:MM (local time)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  
  startInput.min = minDateTime;
  endInput.min = minDateTime;
  if (msStart) msStart.min = minDateTime;
  if (msEnd) msEnd.min = minDateTime;
}
setMinDateTime(); // call immediately
// Also update min when inputs gain focus (in case time passes)
startInput.addEventListener('focus', setMinDateTime);
endInput.addEventListener('focus', setMinDateTime);

// ======================== LOCAL STORAGE MANAGEMENT ========================
function getWidgets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
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
    widget = { id: currentWidgetId, title: "", quote: "", startDate: "", endDate: "", milestones: [], accentColor: '#ff6a00' };
    list.push(widget);
  }
  Object.assign(widget, partial);
  saveWidgets(list);
}

// Serialization helpers for milestones (Date <-> ISO string)
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

// ======================== COLOR & THEME ========================
function applyAccentColor(color) {
  currentAccentColor = color;
  // Set CSS variables for gradient usage
  document.documentElement.style.setProperty('--accent', color);
  // Generate a slightly lighter/darker secondary color for gradient depth
  const secondary = adjustColor(color, 20);
  document.documentElement.style.setProperty('--accent-secondary', secondary);
  
  // Update button styles dynamically
  const buttons = document.querySelectorAll('button:not(#reset-btn)');
  buttons.forEach(btn => {
    btn.style.background = `linear-gradient(135deg, ${color}, ${secondary})`;
  });
  // Also update progress fill gradient (via CSS variables already)
}

function adjustColor(hex, percent) {
  // Simple lightness adjustment (quick & dirty)
  let R = parseInt(hex.substring(1,3),16);
  let G = parseInt(hex.substring(3,5),16);
  let B = parseInt(hex.substring(5,7),16);
  R = Math.min(255, Math.max(0, R + percent));
  G = Math.min(255, Math.max(0, G + percent));
  B = Math.min(255, Math.max(0, B + percent));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function getRandomMilestonePalette() {
  const hue = Math.floor(Math.random() * 360);
  return {
    start: `hsl(${hue}, 85%, 60%)`,
    end: `hsl(${(hue + 35) % 360}, 85%, 68%)`
  };
}

// ======================== UI UTILITIES ========================
function animateValue(element, value) {
  element.classList.add('tick');
  setTimeout(() => element.classList.remove('tick'), 300);
  element.textContent = value;
}

function getTimeParts(totalMilliseconds) {
  const totalSeconds = Math.max(0, Math.floor(totalMilliseconds / 1000));
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

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] || ch));
}

// Inject runner bounce animation
function injectRunnerAnimationStyle() {
  if (document.getElementById('runner-anim-style')) return;
  const style = document.createElement('style');
  style.id = 'runner-anim-style';
  style.textContent = `
    @keyframes runnerBounce {
      0% { transform: translateY(0px) rotate(-2deg); }
      100% { transform: translateY(-6px) rotate(2deg); }
    }
  `;
  document.head.appendChild(style);
}

// ======================== FLAGS & MILESTONE RENDERING ========================
function renderStartEndFlags() {
  if (!progressContainer) return;
  document.querySelectorAll('.flag-start, .flag-end').forEach(el => el.remove());

  const mainStart = new Date(startInput.value);
  const mainEnd = new Date(endInput.value);

  const startFlag = document.createElement('div');
  startFlag.className = 'flag flag-start';
  startFlag.style.pointerEvents = 'auto';
  startFlag.style.cursor = 'help';
  startFlag.innerHTML = `<span class="flag-anchor">🚩</span><span class="flag-tooltip">Start: ${mainStart.toLocaleString()}</span>`;
  progressContainer.appendChild(startFlag);

  const endFlag = document.createElement('div');
  endFlag.className = 'flag flag-end';
  endFlag.style.pointerEvents = 'auto';
  endFlag.style.cursor = 'help';
  endFlag.innerHTML = `<span class="flag-anchor">🏁</span><span class="flag-tooltip">End: ${mainEnd.toLocaleString()}</span>`;
  progressContainer.appendChild(endFlag);
}

function renderMilestones() {
  if (!progressContainer) return;
  document.querySelectorAll('.ms-pin').forEach(el => el.remove());
  if (!milestones.length || !startInput.value || !endInput.value) return;

  const mainStart = new Date(startInput.value);
  const mainEnd = new Date(endInput.value);
  const totalDuration = mainEnd - mainStart;
  if (totalDuration <= 0) return;

  const stackCounts = {};
  milestones.slice().sort((a,b) => a.start - b.start).forEach(ms => {
    const startPerc = ((ms.start - mainStart) / totalDuration) * 100;
    const endPerc = ((ms.end - mainStart) / totalDuration) * 100;
    createMilestonePin(startPerc, ms, 'start', stackCounts);
    createMilestonePin(endPerc, ms, 'end', stackCounts);
  });
}

function createMilestonePin(percent, ms, kind, stackCounts) {
  const key = percent.toFixed(2);
  const stackIndex = stackCounts[key] || 0;
  stackCounts[key] = stackIndex + 1;

  const pin = document.createElement('div');
  pin.className = 'ms-pin';
  Object.assign(pin.style, {
    left: `calc(${percent}% + 5px)`,
    top: `${-6 - stackIndex * 16}px`,
    zIndex: 20 + stackIndex
  });

  const dotColor = kind === 'start' ? ms.colors.start : ms.colors.end;
  const labelDate = kind === 'start' ? ms.start.toLocaleString() : ms.end.toLocaleString();
  pin.innerHTML = `
    <div class="pin-line" style="background:${dotColor}"></div>
    <div class="pin-dot" style="background:${dotColor}; box-shadow: 0 0 12px ${dotColor};"></div>
    <span class="flag-tooltip">${kind==='start'?ms.title+' Start':ms.title+' End'} • ${labelDate}</span>
  `;
  progressContainer.appendChild(pin);
}

// ======================== MILESTONE VIEW (Next milestone) ========================
function ensureMilestoneView() {
  let view = document.getElementById('milestone-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'milestone-view';
    view.addEventListener('click', toggleMilestoneView);
    countdownDisplay.insertAdjacentElement('beforebegin', view);
  }
  return view;
}
function ensureDeadlineMessage() {
  let msg = document.getElementById('deadline-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'deadline-message';
    msg.style.display = 'none';
    countdownDisplay.insertAdjacentElement('beforebegin', msg);
  }
  return msg;
}

function getNextMilestone(now = new Date()) {
  return milestones.filter(ms => ms.end > now).sort((a,b) => a.end - b.end)[0] || null;
}

function updateMilestoneView(now = new Date()) {
  const view = ensureMilestoneView();
  const next = getNextMilestone(now);
  if (!next) {
    view.innerHTML = `<div style="font-size:18px;">No upcoming milestone</div><div style="opacity:.7;">Tap to return</div>`;
    return;
  }
  const remaining = Math.max(0, next.end - now);
  const parts = getTimeParts(remaining);
  view.innerHTML = `
    <div style="font-size:14px;opacity:.7;">Next milestone completion</div>
    <div style="font-size:24px;font-weight:800;margin:10px 0;">${escapeHtml(next.title)}</div>
    <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;">
      ${Object.entries(parts).map(([unit,val]) => `<div style="min-width:70px;"><span style="font-size:24px;">${val}</span><br>${unit}</div>`).join('')}
    </div>
    <div style="margin-top:15px;">${next.start.toLocaleString()} → ${next.end.toLocaleString()}</div>
    <div style="margin-top:10px;font-size:13px;">Tap again to go back</div>
  `;
}

function toggleMilestoneView() {
  if (!milestones.length) return;
  const view = ensureMilestoneView();
  showingMilestoneView = !showingMilestoneView;
  if (showingMilestoneView) {
    countdownDisplay.style.display = 'none';
    view.style.display = 'block';
    updateMilestoneView();
  } else {
    view.style.display = 'none';
    countdownDisplay.style.display = 'flex';
  }
}

// ======================== COUNTDOWN UPDATE (PROGRESS BAR FILLS HERE) ========================
function updateCountdown(start, end) {
  const now = new Date();
  let diff = end - now;
  const deadlineMessage = ensureDeadlineMessage();

  if (diff <= 0) {
    diff = 0;
    clearInterval(countdownInterval);
    deadlineMessage.textContent = "⏳ Time's Up!";
    deadlineMessage.style.display = 'block';
    countdownDisplay.style.opacity = '0.4';
    progressFill.style.width = '100%';
    runner.style.left = '100%';
    runner.style.animation = 'runnerBounce 0.7s infinite alternate';
    return;
  }

  deadlineMessage.style.display = 'none';
  countdownDisplay.style.opacity = '1';

  const parts = getTimeParts(diff);
  animateValue(yearsSpan, parts.years);
  animateValue(monthsSpan, parts.months);
  animateValue(weeksSpan, parts.weeks);
  animateValue(daysSpan, parts.days);
  animateValue(hoursSpan, parts.hours);
  animateValue(minutesSpan, parts.minutes);
  animateValue(secondsSpan, parts.seconds);

  // Danger class if less than 24h
  const danger = diff < 86400000;
  document.querySelectorAll('#countdown div').forEach(d => d.classList.toggle('danger', danger));

  // Progress calculation (elapsed / total)
  const total = end - start;
  const elapsed = now - start;
  let progress = (elapsed / total) * 100;
  progress = Math.min(100, Math.max(0, progress));

  progressFill.style.width = progress + '%';
  runner.style.left = progress + '%';
  runner.style.transition = 'left 0.8s cubic-bezier(0.2,0.9,0.4,1)';
  runner.style.animation = 'runnerBounce 0.7s infinite alternate';

  if (showingMilestoneView) updateMilestoneView(now);
}

// ======================== MAIN ACTIONS ========================
function startCounter() {
  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);

  if (!startInput.value || !endInput.value) return alert('Please set start and end times.');
  if (isNaN(startDate) || isNaN(endDate)) return alert('Invalid date/time.');
  if (endDate <= startDate) return alert('End must be after start.');

  // Save accent color
  currentAccentColor = accentColorInput.value;
  applyAccentColor(currentAccentColor);

  inputSection.style.display = 'none';
  counterSection.style.display = 'block';
  showingMilestoneView = false;
  ensureMilestoneView().style.display = 'none';
  ensureDeadlineMessage().style.display = 'none';
  countdownDisplay.style.display = 'flex';

  // Title & Quote display
  const title = titleInput.value.trim();
  displayTitle.textContent = title || 'Untitled Event';
  displayTitle.dataset.raw = title;
  displayTitle.style.display = 'block';

  const quote = quoteInput.value.trim();
  if (quote) {
    displayQuote.textContent = `“${quote}”`;
    displayQuote.dataset.raw = quote;
    displayQuote.style.display = 'block';
  } else {
    displayQuote.style.display = 'none';
  }

  bindEditableTitle();
  bindEditableQuote();

  renderStartEndFlags();
  renderMilestones();

  // Reset runner and progress
  runner.style.left = '0%';
  progressFill.style.width = '0%';

  saveCurrentState();

  updateCountdown(startDate, endDate);
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => updateCountdown(startDate, endDate), 1000);
}

function resetCounter() {
  clearInterval(countdownInterval);
  inputSection.style.display = 'block';
  counterSection.style.display = 'none';
  // Clear inputs
  titleInput.value = '';
  quoteInput.value = '';
  startInput.value = '';
  endInput.value = '';
  milestones = [];
  showingMilestoneView = false;

  document.querySelectorAll('.flag-start, .flag-end, .ms-pin').forEach(el => el.remove());
  const mv = document.getElementById('milestone-view');
  if (mv) { mv.style.display = 'none'; mv.innerHTML = ''; }
  const dm = document.getElementById('deadline-message');
  if (dm) { dm.style.display = 'none'; }

  // Reset countdown spans
  yearsSpan.textContent = monthsSpan.textContent = weeksSpan.textContent = daysSpan.textContent = hoursSpan.textContent = minutesSpan.textContent = secondsSpan.textContent = '0';
  progressFill.style.width = '0%';
  runner.style.left = '0%';

  saveCurrentState();
}

// Editable title/quote on click
function bindEditableTitle() {
  displayTitle.onclick = () => {
    const newTitle = prompt('Edit title:', displayTitle.dataset.raw || '');
    if (newTitle !== null) {
      displayTitle.textContent = newTitle.trim() || 'Untitled Event';
      displayTitle.dataset.raw = newTitle.trim();
      titleInput.value = newTitle.trim();
      saveCurrentState();
    }
  };
}
function bindEditableQuote() {
  displayQuote.onclick = () => {
    const newQuote = prompt('Edit quote:', displayQuote.dataset.raw || '');
    if (newQuote !== null) {
      const trimmed = newQuote.trim();
      displayQuote.textContent = trimmed ? `“${trimmed}”` : '';
      displayQuote.dataset.raw = trimmed;
      quoteInput.value = trimmed;
      displayQuote.style.display = trimmed ? 'block' : 'none';
      saveCurrentState();
    }
  };
}

function saveCurrentState() {
  saveCurrentWidget({
    title: titleInput.value.trim(),
    quote: quoteInput.value.trim(),
    startDate: startInput.value,
    endDate: endInput.value,
    milestones: serializeMilestones(milestones),
    accentColor: currentAccentColor
  });
}

// ======================== INITIALIZATION & EVENT LISTENERS ========================
function initFromSavedWidget() {
  const saved = getCurrentWidget();
  if (saved) {
    titleInput.value = saved.title || '';
    quoteInput.value = saved.quote || '';
    startInput.value = saved.startDate || '';
    endInput.value = saved.endDate || '';
    milestones = deserializeMilestones(saved.milestones || []);
    if (saved.accentColor) {
      accentColorInput.value = saved.accentColor;
      applyAccentColor(saved.accentColor);
    } else {
      applyAccentColor('#ff6a00');
    }
  } else {
    applyAccentColor('#ff6a00');
  }

  applyToolsVisibility(localStorage.getItem("date_counter_tools_hidden") === "true");

  if (saved && saved.startDate && saved.endDate) {
    startCounter();
  } else {
    inputSection.style.display = 'block';
    counterSection.style.display = 'none';
  }
}

function applyToolsVisibility(hidden) {
  [addMsBtn, viewMsBtn].forEach(btn => { if(btn) btn.style.display = hidden ? 'none' : 'inline-block'; });
  if (toggleToolsBtn) toggleToolsBtn.textContent = hidden ? "👁️ Show Tools" : "👁️ Hide Tools";
}

// Color picker event
accentColorInput.addEventListener('input', (e) => {
  applyAccentColor(e.target.value);
  saveCurrentState();
});

// Start / Reset
startBtn.addEventListener('click', startCounter);
resetBtn.addEventListener('click', resetCounter);
toggleToolsBtn.addEventListener('click', () => {
  const hidden = !(localStorage.getItem("date_counter_tools_hidden") === "true");
  localStorage.setItem("date_counter_tools_hidden", hidden);
  applyToolsVisibility(hidden);
});
viewMsBtn.addEventListener('click', () => {
  // Show list of all milestones in a modal (simplified)
  alert('Milestone list: ' + milestones.map(m => m.title).join(', ') || 'None');
});
// Milestone modal logic
addMsBtn.addEventListener('click', () => modal.style.display = 'flex');
closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
msSave.addEventListener('click', () => {
  const title = msTitle.value.trim();
  const start = new Date(msStart.value);
  const end = new Date(msEnd.value);
  const mainStart = new Date(startInput.value);
  const mainEnd = new Date(endInput.value);
  if (!title || isNaN(start) || isNaN(end)) return alert('Fill all fields.');
  if (start < mainStart || end > mainEnd || start >= end) return alert('Milestone must be within the main interval.');
  milestones.push({ title, start, end, colors: getRandomMilestonePalette() });
  modal.style.display = 'none';
  msTitle.value = msStart.value = msEnd.value = '';
  renderMilestones();
  saveCurrentState();
  if (showingMilestoneView) updateMilestoneView();
});

countdownDisplay.addEventListener('click', toggleMilestoneView);

// Start!
injectRunnerAnimationStyle();
initFromSavedWidget();
