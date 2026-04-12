// ======================== GLOBAL STATE & DOM ========================
let timerInterval = null;
let animationFrame = null;
let currentSessionType = 'work';
let sessionCount = 1;
let timeLeft = 25 * 60;
let isRunning = false;
let totalSessionTime = 25 * 60;
let tickingInterval = null;
let pendingInterruption = false;
let partialMode = null;
let partialElapsedLogged = false;
let currentSessionStart = null;

let sharedAudioCtx = null;

let todayPomodoros = 0;
let halfPomodoros = 0;
let streakDays = 0;
let lastActiveDate = null;
let sessionsHistory = [];
let tasks = [];
let activeTaskId = null;
let showCompleted = true;

let settings = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStart: true,
  sound: 'bell',
  voiceEnabled: false,
  desktopNotify: true,
  fullscreenBreak: false,
  fullscreenWork: false,
  accentColor: '#ff8c00',
  logSkipped: true,
  tickingSound: false,
  taskCompleteSound: true
};

const quotes = [
  "Rest is not idleness.",
  "Almost everything will work again if you unplug it for a few minutes.",
  "Your future self will thank you.",
  "Take a deep breath. You're doing great.",
  "Productivity is about sustainable rhythms.",
  "Step away to come back stronger."
];
const workQuotes = [
  "Let's get back to it!",
  "Time to focus.",
  "You've got this.",
  "One Pomodoro at a time.",
  "Deep work begins now."
];

let statsChart = null;
let currentChartTab = 'daily';

// DOM Elements (ensure they exist in your HTML)
const timerCanvas = document.getElementById('timer-canvas');
const ctx = timerCanvas?.getContext('2d');
const minutesSpan = document.getElementById('timer-minutes');
const secondsSpan = document.getElementById('timer-seconds');
const sessionTypeLabel = document.getElementById('session-type-label');
const sessionCounterSpan = document.getElementById('session-counter');
const startPauseBtn = document.getElementById('timer-start-pause');
const resetBtn = document.getElementById('timer-reset');
const skipBtn = document.getElementById('timer-skip');
const autoStartCheck = document.getElementById('auto-start-checkbox');
const todayPomodorosSpan = document.getElementById('today-pomodoros');
const halfPomodorosSpan = document.getElementById('half-pomodoros');
const streakDaysSpan = document.getElementById('streak-days');
const quoteText = document.getElementById('quote-text');

const tasksListDiv = document.getElementById('tasks-list');
const completedTasksDiv = document.getElementById('completed-tasks-list');
const addTaskBtn = document.getElementById('add-task-btn');
const tasksCompletedSpan = document.getElementById('tasks-completed-count');
const toggleCompletedBtn = document.getElementById('toggle-completed-btn');

const settingsModal = document.getElementById('settings-modal');
const taskModal = document.getElementById('task-modal');
const interruptModal = document.getElementById('interrupt-modal');
const breakOverlay = document.getElementById('break-overlay');
const workOverlay = document.getElementById('work-overlay');
const sessionDetailModal = document.getElementById('session-detail-modal');
const sessionDetailBody = document.getElementById('session-detail-body');
const partialOptionsModal = document.getElementById('partial-options-modal');
const partialTimeLeftSpan = document.getElementById('partial-time-left');
const partialResetOption = document.getElementById('partial-reset-option');
const partialCompleteOption = document.getElementById('partial-complete-option');

const setWork = document.getElementById('set-work');
const setShort = document.getElementById('set-short');
const setLong = document.getElementById('set-long');
const setIntervalInput = document.getElementById('set-interval');
const setAccent = document.getElementById('set-accent');
const colorBar = document.getElementById('color-bar');
const setSound = document.getElementById('set-sound');
const setVoice = document.getElementById('set-voice');
const setDesktopNotify = document.getElementById('set-desktop-notify');
const setFullscreenBreak = document.getElementById('set-fullscreen-break');
const setFullscreenWork = document.getElementById('set-fullscreen-work');
const setLogSkipped = document.getElementById('set-log-skipped');
const setTickingSound = document.getElementById('set-ticking-sound');
const setTaskCompleteSound = document.getElementById('set-task-complete-sound');
const saveSettingsBtn = document.getElementById('save-settings-btn');

const workValue = document.getElementById('work-value');
const shortValue = document.getElementById('short-value');
const longValue = document.getElementById('long-value');
const intervalValue = document.getElementById('interval-value');
const editEstimateValue = document.getElementById('edit-estimate-value');

const editTaskId = document.getElementById('edit-task-id');
const editTaskTitle = document.getElementById('edit-task-title');
const editTaskEstimate = document.getElementById('edit-task-estimate');
const editTaskNotes = document.getElementById('edit-task-notes');
const saveTaskBtn = document.getElementById('save-task-btn');

const interruptReason = document.getElementById('interrupt-reason');
const saveInterruptBtn = document.getElementById('save-interrupt-btn');

const tabBtns = document.querySelectorAll('.tab-btn');
const historyPanel = document.getElementById('history-log-panel');
const chartContainer = document.querySelector('.chart-container');
const historyListDiv = document.getElementById('history-list');
const exportDataBtn = document.getElementById('export-data-btn');
const focusToggle = document.getElementById('focus-mode-toggle');
const exitFocusBtn = document.getElementById('exit-focus-mode');
const themeToggle = document.getElementById('theme-toggle');

const logPartialContainer = document.getElementById('log-partial-container');
const logPartialBtn = document.getElementById('log-partial-btn');

// ======================== HELPER ========================
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ======================== THEME ========================
function initTheme() {
  const savedTheme = localStorage.getItem('pomodoro_theme') || 'dark';
  document.body.classList.toggle('light-mode', savedTheme === 'light');
  if (themeToggle) themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('pomodoro_theme', isLight ? 'light' : 'dark');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
  });
}

// ======================== STORAGE ========================
function loadFromStorage() {
  const saved = localStorage.getItem('pomodoro_suite');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      settings = data.settings || settings;
      tasks = data.tasks || [];
      sessionsHistory = data.sessions || [];
      todayPomodoros = data.todayPomodoros || 0;
      halfPomodoros = data.halfPomodoros || 0;
      streakDays = data.streakDays || 0;
      lastActiveDate = data.lastActiveDate || null;
      activeTaskId = data.activeTaskId || null;
    } catch (e) {}
  }
  applySettingsToUI();
  updateStreak();
  renderTasks();
  updateQuickStats();
  drawTimer(1);
}

function saveToStorage() {
  const data = { settings, tasks, sessions: sessionsHistory, todayPomodoros, halfPomodoros, streakDays, lastActiveDate, activeTaskId };
  localStorage.setItem('pomodoro_suite', JSON.stringify(data));
}

function applySettingsToUI() {
  if (setWork) setWork.value = settings.workDuration;
  if (setShort) setShort.value = settings.shortBreak;
  if (setLong) setLong.value = settings.longBreak;
  if (setIntervalInput) setIntervalInput.value = settings.longBreakInterval;
  if (setAccent) setAccent.value = settings.accentColor;
  if (colorBar) colorBar.style.backgroundColor = settings.accentColor;
  if (setSound) setSound.value = settings.sound;
  if (setVoice) setVoice.checked = settings.voiceEnabled;
  if (setDesktopNotify) setDesktopNotify.checked = settings.desktopNotify;
  if (setFullscreenBreak) setFullscreenBreak.checked = settings.fullscreenBreak;
  if (setFullscreenWork) setFullscreenWork.checked = settings.fullscreenWork;
  if (setLogSkipped) setLogSkipped.checked = settings.logSkipped;
  if (setTickingSound) setTickingSound.checked = settings.tickingSound;
  if (setTaskCompleteSound) setTaskCompleteSound.checked = settings.taskCompleteSound;
  if (autoStartCheck) autoStartCheck.checked = settings.autoStart;
  document.documentElement.style.setProperty('--accent', settings.accentColor);
  document.documentElement.style.setProperty('--accent-glow', `${settings.accentColor}66`);
  if (workValue) workValue.textContent = settings.workDuration;
  if (shortValue) shortValue.textContent = settings.shortBreak;
  if (longValue) longValue.textContent = settings.longBreak;
  if (intervalValue) intervalValue.textContent = settings.longBreakInterval;
  if (!isRunning) {
    timeLeft = settings.workDuration * 60;
    totalSessionTime = timeLeft;
    updateTimerDisplay();
    drawTimer(1);
  }
}

function updateStreak() {
  const today = new Date().toDateString();
  if (lastActiveDate !== today) {
    if (lastActiveDate) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      streakDays = (lastActiveDate === yesterday.toDateString()) ? streakDays + 1 : 1;
    } else streakDays = 1;
    lastActiveDate = today;
    todayPomodoros = 0;
    halfPomodoros = 0;
  }
  if (streakDaysSpan) streakDaysSpan.textContent = streakDays;
}

// ======================== AUDIO ========================
function initAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
}

// ======================== TIMER ========================
function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  if (minutesSpan) minutesSpan.textContent = String(mins).padStart(2, '0');
  if (secondsSpan) secondsSpan.textContent = String(secs).padStart(2, '0');
  document.title = `${mins}:${String(secs).padStart(2,'0')} - ${currentSessionType}`;
}

function drawTimer(progress = null) {
  if (!ctx) return;
  const w = timerCanvas.width, h = timerCanvas.height, radius = 120, centerX = w/2, centerY = h/2;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(128,128,128,0.2)';
  ctx.lineWidth = 12;
  ctx.stroke();
  if (progress === null) progress = timeLeft / totalSessionTime;
  const endAngle = (2 * Math.PI * progress) - (Math.PI / 2);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI/2, endAngle);
  ctx.strokeStyle = settings.accentColor;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function timerTick() {
  if (!isRunning) return;
  timeLeft = Math.max(0, timeLeft - 1);
  updateTimerDisplay();
  drawTimer(timeLeft / totalSessionTime);

  if (timeLeft <= 10 && timeLeft > 0) {
    if (settings.tickingSound) playTickSound();
  }

  if (timeLeft <= 0) {
    stopTimer();
    completeSession(false);
  }
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  if (startPauseBtn) startPauseBtn.textContent = 'Pause';
  if (logPartialContainer) logPartialContainer.style.display = 'none';
  if (!currentSessionStart) currentSessionStart = Date.now();

  if (timerInterval) clearInterval(timerInterval);
  // Use window.setInterval explicitly to avoid shadowing
  timerInterval = window.setInterval(timerTick, 1000);

  function animate() {
    drawTimer(timeLeft / totalSessionTime);
    if (isRunning) {
      animationFrame = requestAnimationFrame(animate);
    }
  }
  animate();

  if (settings.desktopNotify && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function pauseTimer() {
  isRunning = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (startPauseBtn) startPauseBtn.textContent = 'Resume';
  if (logPartialContainer) logPartialContainer.style.display = 'block';
  pendingInterruption = true;
}

function stopTimer() {
  isRunning = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (animationFrame) cancelAnimationFrame(animationFrame);
}

function resetTimer() {
  stopTimer();
  timeLeft = (currentSessionType === 'work' ? settings.workDuration : currentSessionType === 'shortBreak' ? settings.shortBreak : settings.longBreak) * 60;
  totalSessionTime = timeLeft;
  updateTimerDisplay();
  drawTimer(1);
  if (logPartialContainer) logPartialContainer.style.display = 'none';
  pendingInterruption = false;
  if (startPauseBtn) startPauseBtn.textContent = 'Start';
  currentSessionStart = null;
  partialMode = null;
  partialElapsedLogged = false;
}

function playTickSound() {
  try {
    initAudioContext();
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.connect(gain); gain.connect(sharedAudioCtx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.08, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.15);
    osc.start(); osc.stop(sharedAudioCtx.currentTime + 0.15);
  } catch(e) {}
}

// ======================== SESSION HANDLING ========================
function handleResume() {
  if (pendingInterruption) {
    if (interruptModal) interruptModal.style.display = 'flex';
    pendingInterruption = false;
  } else {
    startTimer();
  }
}

function showPartialOptions() {
  if (!partialOptionsModal || !partialTimeLeftSpan) return;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  partialTimeLeftSpan.textContent = `${mins}:${String(secs).padStart(2,'0')}`;
  partialOptionsModal.style.display = 'flex';
}

function logElapsedPortion() {
  const elapsed = totalSessionTime - timeLeft;
  if (elapsed <= 0) return;
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;
  const session = {
    type: currentSessionType,
    duration: Math.floor(elapsed / 60),
    timestamp: new Date().toISOString(),
    taskName: (currentSessionType === 'work' && activeTask) ? activeTask.title : null,
    interruptions: [],
    partial: true,
    halfPomodoro: true
  };
  sessionsHistory.push(session);
  if (currentSessionType === 'work') halfPomodoros++;
  saveToStorage();
  renderTasks();
  renderHistoryList();
  updateQuickStats();
}

function logPartialSessionAndReset() {
  logElapsedPortion();
  timeLeft = totalSessionTime;
  updateTimerDisplay();
  drawTimer(1);
  if (logPartialContainer) logPartialContainer.style.display = 'none';
  if (partialOptionsModal) partialOptionsModal.style.display = 'none';
  pendingInterruption = false;
  if (startPauseBtn) startPauseBtn.textContent = 'Start';
  currentSessionStart = null;
  partialMode = null;
  partialElapsedLogged = false;
}

function setupPartialCompleteMode() {
  logElapsedPortion();
  partialElapsedLogged = true;
  partialMode = 'complete';
  if (partialOptionsModal) partialOptionsModal.style.display = 'none';
  startTimer();
}

function completeSession(isSkipped = false) {
  stopTimer();
  if (settings.sound !== 'none') playSound(settings.sound);
  if (settings.desktopNotify && Notification.permission === 'granted') {
    new Notification(`Pomodoro Suite`, { body: `${currentSessionType} session completed!` });
  }
  if (settings.voiceEnabled) {
    const msg = new SpeechSynthesisUtterance(currentSessionType === 'work' ? 'Time for a break.' : 'Back to work.');
    window.speechSynthesis.speak(msg);
  }

  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;
  const shouldLog = !isSkipped || settings.logSkipped;

  let isHalf = false;
  if (partialMode === 'complete' && partialElapsedLogged) {
    isHalf = true;
    const remaining = timeLeft;
    if (remaining > 0) {
      const remainingSession = {
        type: currentSessionType,
        duration: Math.floor(remaining / 60),
        timestamp: new Date().toISOString(),
        taskName: (currentSessionType === 'work' && activeTask) ? activeTask.title : null,
        interruptions: [],
        partial: true,
        halfPomodoro: true
      };
      sessionsHistory.push(remainingSession);
      if (currentSessionType === 'work') halfPomodoros++;
    }
    partialMode = null;
    partialElapsedLogged = false;
  } else if (shouldLog) {
    const session = {
      type: currentSessionType,
      duration: totalSessionTime / 60,
      timestamp: new Date().toISOString(),
      taskName: (currentSessionType === 'work' && activeTask) ? activeTask.title : null,
      interruptions: []
    };
    sessionsHistory.push(session);
  }

  if (currentSessionType === 'work' && !isSkipped && !isHalf) {
    todayPomodoros++;
    updateStreak();
    if (activeTask && !activeTask.completed) {
      activeTask.completedPomodoros = Math.min(activeTask.completedPomodoros + 1, activeTask.estimatedPomodoros);
      if (activeTask.completedPomodoros >= activeTask.estimatedPomodoros) {
        activeTask.completed = true;
        if (settings.taskCompleteSound) playTaskCompleteSound();
        if (activeTaskId === activeTask.id) activeTaskId = null;
      }
    }
  }

  if (settings.fullscreenBreak && currentSessionType === 'work' && breakOverlay) breakOverlay.style.display = 'flex';
  if (settings.fullscreenWork && currentSessionType !== 'work' && workOverlay) workOverlay.style.display = 'flex';
  if (quoteText) {
    quoteText.textContent = currentSessionType === 'work' ? `“${quotes[Math.floor(Math.random() * quotes.length)]}”` : `“${workQuotes[Math.floor(Math.random() * workQuotes.length)]}”`;
  }

  if (currentSessionType === 'work') {
    sessionCount++;
    if (sessionCount > settings.longBreakInterval) {
      currentSessionType = 'longBreak';
      sessionCount = 1;
    } else {
      currentSessionType = 'shortBreak';
    }
  } else {
    currentSessionType = 'work';
  }

  timeLeft = (currentSessionType === 'work' ? settings.workDuration : currentSessionType === 'shortBreak' ? settings.shortBreak : settings.longBreak) * 60;
  totalSessionTime = timeLeft;
  currentSessionStart = null;
  updateSessionLabel();
  updateTimerDisplay();
  drawTimer(1);
  updateQuickStats();
  renderTasks();
  saveToStorage();
  updateChart(currentChartTab);
  renderHistoryList();
  if (logPartialContainer) logPartialContainer.style.display = 'none';
  pendingInterruption = false;
  partialMode = null;
  partialElapsedLogged = false;
  if (startPauseBtn) startPauseBtn.textContent = 'Start';
  if (settings.autoStart && !isSkipped) startTimer();
}

function skipSession() {
  completeSession(true);
}

function updateSessionLabel() {
  if (sessionTypeLabel) {
    sessionTypeLabel.textContent = currentSessionType === 'work' ? 'FOCUS' : (currentSessionType === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK');
  }
  if (sessionCounterSpan) {
    sessionCounterSpan.textContent = `${sessionCount} / ${settings.longBreakInterval}`;
  }
}

function playSound(type) {
  try {
    initAudioContext();
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.connect(gain); gain.connect(sharedAudioCtx.destination);
    let freq = type === 'bell' ? 1200 : type === 'chime' ? 1000 : type === 'digital' ? 600 : 800;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.5);
    osc.start(); osc.stop(sharedAudioCtx.currentTime + 0.5);
  } catch(e) {}
}

function playTaskCompleteSound() {
  if (!settings.taskCompleteSound) return;
  try {
    initAudioContext();
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.connect(gain); gain.connect(sharedAudioCtx.destination);
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.2, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.4);
    osc.start(); osc.stop(sharedAudioCtx.currentTime + 0.4);
  } catch(e) {}
}

// ======================== TASKS ========================
function renderTasks() {
  if (!tasksListDiv || !completedTasksDiv) return;
  if (activeTaskId) {
    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (activeTask && activeTask.completed) activeTaskId = null;
  }
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  tasksListDiv.innerHTML = '';
  activeTasks.forEach(task => renderTaskItem(task, tasksListDiv, false));
  completedTasksDiv.innerHTML = '';
  if (showCompleted) completedTasks.forEach(task => renderTaskItem(task, completedTasksDiv, true));
  const total = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  if (tasksCompletedSpan) tasksCompletedSpan.textContent = `${completedCount}/${total} completed`;
}

function renderTaskItem(task, container, isCompleted = false) {
  const taskEl = document.createElement('div');
  taskEl.className = `task-item ${activeTaskId === task.id ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
  const dotsHtml = Array.from({ length: task.estimatedPomodoros }, (_, i) => `<span class="pomodoro-dot ${i < task.completedPomodoros ? 'completed' : ''}"></span>`).join('');
  taskEl.innerHTML = `
    <div class="task-header">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-pomodoros">
          <span>🍅 ${task.completedPomodoros}/${task.estimatedPomodoros}</span>
          <div class="pomodoro-progress">${dotsHtml}</div>
        </div>
        ${task.notes ? `<small>📝 ${escapeHtml(task.notes.substring(0,30))}...</small>` : ''}
      </div>
    </div>
    ${!isCompleted ? '<button class="task-edit-btn" title="Edit task">✎</button>' : ''}
    <button class="task-delete-btn" title="Delete task">✕</button>
  `;
  const deleteBtn = taskEl.querySelector('.task-delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${task.title}"?`)) {
      tasks = tasks.filter(t => t.id !== task.id);
      if (activeTaskId === task.id) activeTaskId = null;
      saveToStorage();
      renderTasks();
    }
  });
  const editBtn = taskEl.querySelector('.task-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal(task);
    });
  }
  const checkbox = taskEl.querySelector('.task-checkbox');
  checkbox.addEventListener('change', (e) => {
    task.completed = e.target.checked;
    if (task.completed && activeTaskId === task.id) activeTaskId = null;
    saveToStorage();
    renderTasks();
  });
  if (!isCompleted) {
    taskEl.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox' && !e.target.classList.contains('task-delete-btn') && !e.target.classList.contains('task-edit-btn')) {
        activeTaskId = (activeTaskId === task.id) ? null : task.id;
        renderTasks();
        saveToStorage();
      }
    });
  }
  container.appendChild(taskEl);
}

function openTaskModal(task = null) {
  if (!taskModal) return;
  if (task) {
    if (editTaskId) editTaskId.value = task.id;
    if (editTaskTitle) editTaskTitle.value = task.title;
    if (editTaskEstimate) editTaskEstimate.value = task.estimatedPomodoros;
    if (editEstimateValue) editEstimateValue.textContent = task.estimatedPomodoros;
    if (editTaskNotes) editTaskNotes.value = task.notes || '';
    document.getElementById('task-modal-title').textContent = 'Edit Task';
  } else {
    if (editTaskId) editTaskId.value = '';
    if (editTaskTitle) editTaskTitle.value = '';
    if (editTaskEstimate) editTaskEstimate.value = 1;
    if (editEstimateValue) editEstimateValue.textContent = 1;
    if (editTaskNotes) editTaskNotes.value = '';
    document.getElementById('task-modal-title').textContent = 'New Task';
  }
  taskModal.style.display = 'flex';
}

function saveTask() {
  const id = editTaskId?.value;
  const title = editTaskTitle?.value.trim();
  if (!title) return alert('Title required');
  const estimate = parseInt(editTaskEstimate?.value) || 1;
  const notes = editTaskNotes?.value.trim() || '';
  if (id) {
    const task = tasks.find(t => t.id === id);
    if (task) { task.title = title; task.estimatedPomodoros = estimate; task.notes = notes; }
  } else {
    tasks.push({ id: Date.now().toString(), title, estimatedPomodoros: estimate, completedPomodoros: 0, notes, completed: false, createdAt: new Date().toISOString() });
  }
  saveToStorage(); renderTasks(); if (taskModal) taskModal.style.display = 'none';
}

// ======================== STATISTICS ========================
function getChartData(tab) {
  const fullSessions = sessionsHistory.filter(s => s.type === 'work' && !s.halfPomodoro);
  const halfSessions = sessionsHistory.filter(s => s.type === 'work' && s.halfPomodoro);
  const now = new Date();
  if (tab === 'daily') {
    const days = [], fullCounts = [], halfCounts = [], taskCounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      fullCounts.push(fullSessions.filter(s => s.timestamp.startsWith(dateStr)).length);
      halfCounts.push(halfSessions.filter(s => s.timestamp.startsWith(dateStr)).length);
      taskCounts.push(tasks.filter(t => t.completed && t.createdAt && t.createdAt.startsWith(dateStr)).length);
    }
    return { labels: days, datasets: [
      { label: 'Full 🍅', data: fullCounts, backgroundColor: settings.accentColor },
      { label: 'Half 🍅', data: halfCounts, backgroundColor: '#ffaa33' },
      { label: 'Tasks', data: taskCounts, backgroundColor: '#4caf50' }
    ]};
  } else if (tab === 'weekly') {
    const weeks = [], fullCounts = [], halfCounts = [], taskCounts = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i*7);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      weeks.push(`W${4-i}`);
      fullCounts.push(fullSessions.filter(s => { const d = new Date(s.timestamp); return d >= start && d <= end; }).length);
      halfCounts.push(halfSessions.filter(s => { const d = new Date(s.timestamp); return d >= start && d <= end; }).length);
      taskCounts.push(tasks.filter(t => t.completed && t.createdAt && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end).length);
    }
    return { labels: weeks, datasets: [
      { label: 'Full 🍅', data: fullCounts, backgroundColor: settings.accentColor },
      { label: 'Half 🍅', data: halfCounts, backgroundColor: '#ffaa33' },
      { label: 'Tasks', data: taskCounts, backgroundColor: '#4caf50' }
    ]};
  } else if (tab === 'monthly') {
    const months = [], fullCounts = [], halfCounts = [], taskCounts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setMonth(now.getMonth() - i);
      const monthStr = d.toISOString().slice(0,7);
      months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      fullCounts.push(fullSessions.filter(s => s.timestamp.startsWith(monthStr)).length);
      halfCounts.push(halfSessions.filter(s => s.timestamp.startsWith(monthStr)).length);
      taskCounts.push(tasks.filter(t => t.completed && t.createdAt && t.createdAt.startsWith(monthStr)).length);
    }
    return { labels: months, datasets: [
      { label: 'Full 🍅', data: fullCounts, backgroundColor: settings.accentColor },
      { label: 'Half 🍅', data: halfCounts, backgroundColor: '#ffaa33' },
      { label: 'Tasks', data: taskCounts, backgroundColor: '#4caf50' }
    ]};
  } else if (tab === 'tasks') {
    const completed = tasks.filter(t => t.completed).length;
    const active = tasks.filter(t => !t.completed).length;
    return { labels: ['Completed', 'Active'], datasets: [{ data: [completed, active], backgroundColor: ['#4caf50', settings.accentColor] }] };
  }
}

function updateChart(tab) {
  if (!statsChart && document.getElementById('stats-chart')) {
    const ctxChart = document.getElementById('stats-chart').getContext('2d');
    statsChart = new Chart(ctxChart, { type: 'bar', data: { labels: [], datasets: [] } });
  }
  if (!statsChart) return;
  currentChartTab = tab;
  const chartData = getChartData(tab);
  statsChart.data = { labels: chartData.labels, datasets: chartData.datasets };
  statsChart.options.plugins.legend.display = (tab !== 'tasks');
  statsChart.update();
}

function renderHistoryList() {
  if (!historyListDiv) return;
  historyListDiv.innerHTML = sessionsHistory.slice(-30).reverse().map((s, idx) => {
    const displayType = s.taskName ? s.taskName : s.type;
    const halfMark = s.halfPomodoro ? ' ½' : '';
    const partialMark = s.partial ? ' ⏸️' : '';
    return `<div class="history-item" data-session-index="${sessionsHistory.length - 1 - idx}">
      <span>${displayType} · ${s.duration} min${halfMark}${partialMark}</span>
      <span>${new Date(s.timestamp).toLocaleString()}</span>
    </div>`;
  }).join('');
}

function showSessionDetail(session) {
  if (!sessionDetailBody || !sessionDetailModal) return;
  let html = `<p><strong>Type:</strong> ${session.type}</p>`;
  html += `<p><strong>Duration:</strong> ${session.duration} min ${session.halfPomodoro ? '(½ Pomodoro)' : ''}</p>`;
  html += `<p><strong>Time:</strong> ${new Date(session.timestamp).toLocaleString()}</p>`;
  if (session.taskName) html += `<p><strong>Task:</strong> ${escapeHtml(session.taskName)}</p>`;
  if (session.interruptions?.length) {
    html += `<p><strong>Interruptions:</strong></p><ul>`;
    session.interruptions.forEach(i => html += `<li>${escapeHtml(i.reason)} (${new Date(i.time).toLocaleTimeString()})</li>`);
    html += `</ul>`;
  } else {
    html += `<p>No interruptions recorded.</p>`;
  }
  sessionDetailBody.innerHTML = html;
  sessionDetailModal.style.display = 'flex';
}

function updateQuickStats() {
  if (todayPomodorosSpan) todayPomodorosSpan.textContent = todayPomodoros;
  if (halfPomodorosSpan) halfPomodorosSpan.textContent = halfPomodoros;
  if (streakDaysSpan) streakDaysSpan.textContent = streakDays;
}

// ======================== INIT ========================
function init() {
  initTheme();
  loadFromStorage();
  updateSessionLabel();
  updateTimerDisplay();
  drawTimer(1);
  updateChart('daily');
  renderHistoryList();

  if (startPauseBtn) startPauseBtn.addEventListener('click', () => isRunning ? pauseTimer() : handleResume());
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);
  if (skipBtn) skipBtn.addEventListener('click', skipSession);
  if (autoStartCheck) autoStartCheck.addEventListener('change', e => { settings.autoStart = e.target.checked; saveToStorage(); });
  if (document.getElementById('settings-toggle')) document.getElementById('settings-toggle').addEventListener('click', () => { if (settingsModal) settingsModal.style.display = 'flex'; });

  if (setWork) setWork.addEventListener('input', () => { if (workValue) workValue.textContent = setWork.value; });
  if (setShort) setShort.addEventListener('input', () => { if (shortValue) shortValue.textContent = setShort.value; });
  if (setLong) setLong.addEventListener('input', () => { if (longValue) longValue.textContent = setLong.value; });
  if (setIntervalInput) setIntervalInput.addEventListener('input', () => { if (intervalValue) intervalValue.textContent = setIntervalInput.value; });
  if (editTaskEstimate) editTaskEstimate.addEventListener('input', () => { if (editEstimateValue) editEstimateValue.textContent = editTaskEstimate.value; });

  if (colorBar) colorBar.addEventListener('click', () => setAccent?.click());
  if (setAccent) setAccent.addEventListener('input', e => {
    if (colorBar) colorBar.style.backgroundColor = e.target.value;
    document.documentElement.style.setProperty('--accent', e.target.value);
    document.documentElement.style.setProperty('--accent-glow', e.target.value + '66');
  });

  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
    settings.workDuration = parseInt(setWork?.value) || 25;
    settings.shortBreak = parseInt(setShort?.value) || 5;
    settings.longBreak = parseInt(setLong?.value) || 15;
    settings.longBreakInterval = parseInt(setIntervalInput?.value) || 4;
    if (setAccent) settings.accentColor = setAccent.value;
    if (setSound) settings.sound = setSound.value;
    if (setVoice) settings.voiceEnabled = setVoice.checked;
    if (setDesktopNotify) settings.desktopNotify = setDesktopNotify.checked;
    if (setFullscreenBreak) settings.fullscreenBreak = setFullscreenBreak.checked;
    if (setFullscreenWork) settings.fullscreenWork = setFullscreenWork.checked;
    if (setLogSkipped) settings.logSkipped = setLogSkipped.checked;
    if (setTickingSound) settings.tickingSound = setTickingSound.checked;
    if (setTaskCompleteSound) settings.taskCompleteSound = setTaskCompleteSound.checked;
    applySettingsToUI();
    if (!isRunning) resetTimer();
    saveToStorage();
    if (settingsModal) settingsModal.style.display = 'none';
    updateChart(currentChartTab);
  });

  document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => {
    if (settingsModal) settingsModal.style.display = 'none';
    if (taskModal) taskModal.style.display = 'none';
    if (interruptModal) interruptModal.style.display = 'none';
    if (sessionDetailModal) sessionDetailModal.style.display = 'none';
    if (partialOptionsModal) partialOptionsModal.style.display = 'none';
  }));
  window.addEventListener('click', e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; });

  if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal(null));
  if (saveTaskBtn) saveTaskBtn.addEventListener('click', saveTask);

  document.getElementById('log-interruption-btn')?.addEventListener('click', () => { if (interruptModal) interruptModal.style.display = 'flex'; });
  if (saveInterruptBtn) saveInterruptBtn.addEventListener('click', () => {
    const reason = interruptReason?.value.trim();
    if (reason) {
      if (!window.pendingInterruptions) window.pendingInterruptions = [];
      window.pendingInterruptions.push({ reason, time: new Date().toISOString() });
    }
    if (interruptModal) interruptModal.style.display = 'none';
    if (interruptReason) interruptReason.value = '';
    if (!isRunning && !pendingInterruption) startTimer();
  });

  const originalComplete = completeSession;
  completeSession = function(isSkipped) {
    originalComplete.call(this, isSkipped);
    if (window.pendingInterruptions && sessionsHistory.length) {
      const last = sessionsHistory[sessionsHistory.length-1];
      if (!last.interruptions) last.interruptions = [];
      last.interruptions.push(...window.pendingInterruptions);
      window.pendingInterruptions = [];
      saveToStorage();
      renderHistoryList();
    }
  };

  if (logPartialBtn) logPartialBtn.addEventListener('click', showPartialOptions);
  if (partialResetOption) partialResetOption.addEventListener('click', logPartialSessionAndReset);
  if (partialCompleteOption) partialCompleteOption.addEventListener('click', setupPartialCompleteMode);

  document.getElementById('close-break-overlay')?.addEventListener('click', () => { if (breakOverlay) breakOverlay.style.display = 'none'; });
  document.getElementById('close-work-overlay')?.addEventListener('click', () => { if (workOverlay) workOverlay.style.display = 'none'; });

  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'history') {
      if (chartContainer) chartContainer.style.display = 'none';
      if (historyPanel) historyPanel.style.display = 'block';
      renderHistoryList();
    } else {
      if (chartContainer) chartContainer.style.display = 'block';
      if (historyPanel) historyPanel.style.display = 'none';
      updateChart(tab);
    }
  }));

  if (exportDataBtn) exportDataBtn.addEventListener('click', () => {
    let csv = "Type,Duration,Timestamp,Task,Partial,Half\n";
    sessionsHistory.forEach(s => csv += `${s.type},${s.duration},${s.timestamp},${s.taskName || ''},${s.partial ? 'Yes' : 'No'},${s.halfPomodoro ? 'Yes' : 'No'}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pomodoro_sessions.csv';
    a.click();
  });

  if (historyListDiv) historyListDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item) {
      const idx = parseInt(item.dataset.sessionIndex);
      if (!isNaN(idx) && sessionsHistory[idx]) showSessionDetail(sessionsHistory[idx]);
    }
  });

  if (focusToggle) focusToggle.addEventListener('click', () => {
    document.body.classList.add('focus-mode');
    if (exitFocusBtn) exitFocusBtn.style.display = 'flex';
  });
  if (exitFocusBtn) exitFocusBtn.addEventListener('click', () => {
    document.body.classList.remove('focus-mode');
    exitFocusBtn.style.display = 'none';
  });

  if (toggleCompletedBtn) toggleCompletedBtn.addEventListener('click', () => {
    showCompleted = !showCompleted;
    toggleCompletedBtn.textContent = showCompleted ? '▼' : '▶';
    renderTasks();
  });

  if (Notification.permission === 'default') Notification.requestPermission();
  initAudioContext();
}

// Start
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
