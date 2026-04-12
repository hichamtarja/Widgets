// ======================== GLOBAL STATE & DOM ELEMENTS ========================
// ---------- Timer state ----------
let timerInterval = null;
let currentSessionType = 'work';        // 'work', 'shortBreak', 'longBreak'
let sessionCount = 1;                  // 1-based, resets after long break
let timeLeft = 25 * 60;                // in seconds
let isRunning = false;
let totalSessionTime = 25 * 60;

// ---------- Statistics ----------
let todayPomodoros = 0;
let streakDays = 0;
let lastActiveDate = null;
let sessionsHistory = [];              // array of session objects

// ---------- Tasks ----------
let tasks = [];
let activeTaskId = null;               // ID of the task currently being worked on

// ---------- Settings (with defaults) ----------
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
  fullscreenWork: false,               // New: full-screen back to work reminder
  accentColor: '#ff6a00'
};

// ---------- Quotes ----------
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

// ---------- Chart instance ----------
let statsChart = null;
let currentChartTab = 'daily';

// ---------- DOM Elements ----------
// Timer
const timerCanvas = document.getElementById('timer-canvas');
const ctx = timerCanvas.getContext('2d');
const minutesSpan = document.getElementById('timer-minutes');
const secondsSpan = document.getElementById('timer-seconds');
const sessionTypeLabel = document.getElementById('session-type-label');
const sessionCounterSpan = document.getElementById('session-counter');
const startPauseBtn = document.getElementById('timer-start-pause');
const resetBtn = document.getElementById('timer-reset');
const skipBtn = document.getElementById('timer-skip');
const autoStartCheck = document.getElementById('auto-start-checkbox');
const todayPomodorosSpan = document.getElementById('today-pomodoros');
const streakDaysSpan = document.getElementById('streak-days');
const quoteText = document.getElementById('quote-text');

// Tasks
const tasksListDiv = document.getElementById('tasks-list');
const addTaskBtn = document.getElementById('add-task-btn');
const tasksCompletedSpan = document.getElementById('tasks-completed-count');

// Modals
const settingsModal = document.getElementById('settings-modal');
const taskModal = document.getElementById('task-modal');
const interruptModal = document.getElementById('interrupt-modal');
const breakOverlay = document.getElementById('break-overlay');
const workOverlay = document.getElementById('work-overlay'); // New overlay

// Settings inputs
const setWork = document.getElementById('set-work');
const setShort = document.getElementById('set-short');
const setLong = document.getElementById('set-long');
const setInterval = document.getElementById('set-interval');
const setAccent = document.getElementById('set-accent');
const setSound = document.getElementById('set-sound');
const setVoice = document.getElementById('set-voice');
const setDesktopNotify = document.getElementById('set-desktop-notify');
const setFullscreenBreak = document.getElementById('set-fullscreen-break');
const setFullscreenWork = document.getElementById('set-fullscreen-work'); // New
const saveSettingsBtn = document.getElementById('save-settings-btn');

// Task edit
const editTaskId = document.getElementById('edit-task-id');
const editTaskTitle = document.getElementById('edit-task-title');
const editTaskEstimate = document.getElementById('edit-task-estimate');
const editTaskNotes = document.getElementById('edit-task-notes');
const saveTaskBtn = document.getElementById('save-task-btn');
const deleteTaskBtn = document.getElementById('delete-task-btn');

// Interruption
const interruptReason = document.getElementById('interrupt-reason');
const saveInterruptBtn = document.getElementById('save-interrupt-btn');

// Stats & History
const tabBtns = document.querySelectorAll('.tab-btn');
const historyPanel = document.getElementById('history-log-panel');
const chartContainer = document.querySelector('.chart-container');
const historyListDiv = document.getElementById('history-list');
const exportDataBtn = document.getElementById('export-data-btn');

// Focus mode
const focusToggle = document.getElementById('focus-mode-toggle');

// Accent color swatch
const accentSwatch = document.getElementById('accent-swatch');

// ======================== INITIALIZATION & LOCAL STORAGE ========================
function loadFromStorage() {
  const saved = localStorage.getItem('pomodoro_suite');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      settings = data.settings || settings;
      tasks = data.tasks || [];
      sessionsHistory = data.sessions || [];
      todayPomodoros = data.todayPomodoros || 0;
      streakDays = data.streakDays || 0;
      lastActiveDate = data.lastActiveDate || null;
      activeTaskId = data.activeTaskId || null;
    } catch (e) { console.warn('Failed to load data'); }
  }
  applySettingsToUI();
  updateStreak();
  renderTasks();
  updateQuickStats();
  drawTimer(1);
}

function saveToStorage() {
  const data = {
    settings,
    tasks,
    sessions: sessionsHistory,
    todayPomodoros,
    streakDays,
    lastActiveDate,
    activeTaskId
  };
  localStorage.setItem('pomodoro_suite', JSON.stringify(data));
}

function applySettingsToUI() {
  setWork.value = settings.workDuration;
  setShort.value = settings.shortBreak;
  setLong.value = settings.longBreak;
  setInterval.value = settings.longBreakInterval;
  setAccent.value = settings.accentColor;
  setSound.value = settings.sound;
  setVoice.checked = settings.voiceEnabled;
  setDesktopNotify.checked = settings.desktopNotify;
  setFullscreenBreak.checked = settings.fullscreenBreak;
  if (setFullscreenWork) setFullscreenWork.checked = settings.fullscreenWork;
  autoStartCheck.checked = settings.autoStart;
  document.documentElement.style.setProperty('--accent', settings.accentColor);
  if (accentSwatch) accentSwatch.style.backgroundColor = settings.accentColor;
  
  if (!isRunning) {
    timeLeft = settings.workDuration * 60;
    totalSessionTime = timeLeft;
    updateTimerDisplay();
    drawTimer(1);
  }
}

// Streak update
function updateStreak() {
  const today = new Date().toDateString();
  if (lastActiveDate !== today) {
    if (lastActiveDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastActiveDate === yesterday.toDateString()) {
        streakDays++;
      } else {
        streakDays = 1;
      }
    } else {
      streakDays = 1;
    }
    lastActiveDate = today;
    todayPomodoros = 0;
  }
  streakDaysSpan.textContent = streakDays;
}

// ======================== TIMER CORE ========================
function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  minutesSpan.textContent = String(mins).padStart(2, '0');
  secondsSpan.textContent = String(secs).padStart(2, '0');
  document.title = `${mins}:${String(secs).padStart(2,'0')} - ${currentSessionType}`;
}

function drawTimer(progress = null) {
  const w = timerCanvas.width;
  const h = timerCanvas.height;
  const radius = 120;
  const centerX = w/2;
  const centerY = h/2;
  
  ctx.clearRect(0, 0, w, h);
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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

function tick() {
  if (timeLeft <= 0) {
    completeSession();
    return;
  }
  timeLeft--;
  updateTimerDisplay();
  drawTimer(timeLeft / totalSessionTime);
  document.title = `${minutesSpan.textContent}:${secondsSpan.textContent} - ${currentSessionType}`;
}

function completeSession() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  startPauseBtn.textContent = 'Start';
  
  // Play sound (using simple Audio element to avoid autoplay restrictions)
  playSound(settings.sound);
  
  // Desktop notification
  if (settings.desktopNotify && Notification.permission === 'granted') {
    new Notification(`Pomodoro Suite`, {
      body: `${currentSessionType} session completed!`,
    });
  }
  
  // Voice announcement BEFORE session type changes
  if (settings.voiceEnabled) {
    const msgText = currentSessionType === 'work' ? 'Time for a break.' : 'Back to work.';
    const msg = new SpeechSynthesisUtterance(msgText);
    window.speechSynthesis.speak(msg);
  }
  
  // Log session
  const session = {
    type: currentSessionType,
    duration: totalSessionTime / 60,
    timestamp: new Date().toISOString(),
    interruptions: []
  };
  sessionsHistory.push(session);
  
  // If work session completed, increment active task's completed pomodoros
  if (currentSessionType === 'work') {
    todayPomodoros++;
    updateStreak();
    
    if (activeTaskId) {
      const activeTask = tasks.find(t => t.id === activeTaskId);
      if (activeTask && !activeTask.completed) {
        activeTask.completedPomodoros = Math.min(
          activeTask.completedPomodoros + 1,
          activeTask.estimatedPomodoros
        );
        if (activeTask.completedPomodoros >= activeTask.estimatedPomodoros) {
          activeTask.completed = true;
        }
      }
    }
  }
  
  // Show overlays if enabled
  if (settings.fullscreenBreak && currentSessionType === 'work') {
    breakOverlay.style.display = 'flex';
  }
  if (settings.fullscreenWork && currentSessionType !== 'work') {
    if (workOverlay) workOverlay.style.display = 'flex';
  }
  
  // Show quote
  if (currentSessionType === 'work') {
    quoteText.textContent = `“${quotes[Math.floor(Math.random() * quotes.length)]}”`;
  } else {
    quoteText.textContent = `“${workQuotes[Math.floor(Math.random() * workQuotes.length)]}”`;
  }
  
  // Determine next session
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
  
  // Set timer for next session
  switch (currentSessionType) {
    case 'work': timeLeft = settings.workDuration * 60; break;
    case 'shortBreak': timeLeft = settings.shortBreak * 60; break;
    case 'longBreak': timeLeft = settings.longBreak * 60; break;
  }
  totalSessionTime = timeLeft;
  updateSessionLabel();
  updateTimerDisplay();
  drawTimer(1);
  
  updateQuickStats();
  renderTasks();
  saveToStorage();
  updateChart(currentChartTab);
  renderHistoryList();
  
  if (settings.autoStart) {
    startTimer();
  }
}

function startTimer() {
  if (isRunning) return;
  // Resume AudioContext if needed? Not needed with simple Audio.
  isRunning = true;
  startPauseBtn.textContent = 'Pause';
  timerInterval = setInterval(tick, 1000);
  
  if (settings.desktopNotify && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  startPauseBtn.textContent = 'Start';
}

function resetTimer() {
  pauseTimer();
  switch (currentSessionType) {
    case 'work': timeLeft = settings.workDuration * 60; break;
    case 'shortBreak': timeLeft = settings.shortBreak * 60; break;
    case 'longBreak': timeLeft = settings.longBreak * 60; break;
  }
  totalSessionTime = timeLeft;
  updateTimerDisplay();
  drawTimer(1);
}

function skipSession() {
  pauseTimer();
  completeSession();
}

function updateSessionLabel() {
  sessionTypeLabel.textContent = currentSessionType === 'work' ? 'FOCUS' : 
                                 currentSessionType === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  sessionCounterSpan.textContent = `${sessionCount} / ${settings.longBreakInterval}`;
}

// ======================== SOUND (using simple Audio) ========================
function playSound(type) {
  let soundUrl = '';
  // Using base64 or simple oscillator? For simplicity, use a short beep with Web Audio but wrapped in user gesture check.
  // Since start is user-initiated, we can use AudioContext safely now.
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    let freq = 800;
    if (type === 'bell') freq = 1200;
    else if (type === 'chime') freq = 1000;
    else if (type === 'digital') freq = 600;
    
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch(e) {
    console.warn('Sound play failed:', e);
  }
}

// ======================== TASKS ========================
function renderTasks() {
  if (!tasksListDiv) return;
  tasksListDiv.innerHTML = '';
  let completed = 0;
  tasks.forEach((task) => {
    const taskEl = document.createElement('div');
    taskEl.className = `task-item ${activeTaskId === task.id ? 'active' : ''}`;
    taskEl.dataset.id = task.id;
    
    const completedDots = Math.min(task.completedPomodoros, task.estimatedPomodoros);
    const dotsHtml = Array.from({ length: task.estimatedPomodoros }, (_, i) => 
      `<span class="pomodoro-dot ${i < completedDots ? 'completed' : ''}"></span>`
    ).join('');
    
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
    `;
    taskEl.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') {
        task.completed = e.target.checked;
        saveToStorage();
        renderTasks();
      } else {
        // Set as active task
        activeTaskId = task.id;
        renderTasks();
        saveToStorage();
      }
    });
    taskEl.addEventListener('dblclick', () => {
      openTaskModal(task);
    });
    tasksListDiv.appendChild(taskEl);
    if (task.completed) completed++;
  });
  tasksCompletedSpan.textContent = `${completed}/${tasks.length} completed`;
}

function openTaskModal(task = null) {
  if (task) {
    editTaskId.value = task.id;
    editTaskTitle.value = task.title;
    editTaskEstimate.value = task.estimatedPomodoros;
    editTaskNotes.value = task.notes || '';
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    deleteTaskBtn.style.display = 'block';
  } else {
    editTaskId.value = '';
    editTaskTitle.value = '';
    editTaskEstimate.value = 1;
    editTaskNotes.value = '';
    document.getElementById('task-modal-title').textContent = 'New Task';
    deleteTaskBtn.style.display = 'none';
  }
  taskModal.style.display = 'flex';
}

function saveTask() {
  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  if (!title) return alert('Title required');
  const estimate = parseInt(editTaskEstimate.value) || 1;
  const notes = editTaskNotes.value.trim();
  
  if (id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.estimatedPomodoros = estimate;
      task.notes = notes;
      // Reset completed pomodoros if estimate changed? Keep as is.
    }
  } else {
    tasks.push({
      id: Date.now().toString(),
      title,
      estimatedPomodoros: estimate,
      completedPomodoros: 0,
      notes,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }
  saveToStorage();
  renderTasks();
  taskModal.style.display = 'none';
}

function deleteTask() {
  const id = editTaskId.value;
  if (id && confirm('Delete this task?')) {
    tasks = tasks.filter(t => t.id !== id);
    if (activeTaskId === id) activeTaskId = null;
    saveToStorage();
    renderTasks();
    taskModal.style.display = 'none';
  }
}

// ======================== STATISTICS & CHART (real data) ========================
function getChartData(tab) {
  const sessions = sessionsHistory.filter(s => s.type === 'work');
  const now = new Date();
  
  if (tab === 'daily') {
    // Last 7 days
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = sessions.filter(s => s.timestamp.startsWith(dateStr)).length;
      days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      counts.push(count);
    }
    return { labels: days, data: counts };
  } else if (tab === 'weekly') {
    // Last 4 weeks
    const weeks = [];
    const counts = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i*7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const count = sessions.filter(s => {
        const d = new Date(s.timestamp);
        return d >= start && d <= end;
      }).length;
      weeks.push(`W${4-i}`);
      counts.push(count);
    }
    return { labels: weeks, data: counts };
  } else {
    // Monthly: last 6 months
    const months = [];
    const counts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const monthStr = d.toISOString().slice(0,7);
      const count = sessions.filter(s => s.timestamp.startsWith(monthStr)).length;
      months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      counts.push(count);
    }
    return { labels: months, data: counts };
  }
}

function updateChart(tab) {
  currentChartTab = tab;
  const ctxChart = document.getElementById('stats-chart').getContext('2d');
  if (statsChart) statsChart.destroy();
  
  const { labels, data } = getChartData(tab);
  
  statsChart = new Chart(ctxChart, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Pomodoros',
        data,
        backgroundColor: settings.accentColor,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

function renderHistoryList() {
  const recent = sessionsHistory.slice(-20).reverse();
  historyListDiv.innerHTML = recent.map(s => `
    <div class="history-item">
      <span>${s.type} · ${s.duration} min</span>
      <span>${new Date(s.timestamp).toLocaleString()}</span>
    </div>
  `).join('');
}

// ======================== EVENT LISTENERS & INIT ========================
function init() {
  loadFromStorage();
  updateSessionLabel();
  updateTimerDisplay();
  drawTimer(1);
  updateChart('daily');
  renderHistoryList();
  
  // Timer controls
  startPauseBtn.addEventListener('click', () => isRunning ? pauseTimer() : startTimer());
  resetBtn.addEventListener('click', resetTimer);
  skipBtn.addEventListener('click', skipSession);
  autoStartCheck.addEventListener('change', (e) => {
    settings.autoStart = e.target.checked;
    saveToStorage();
  });
  
  // Settings
  document.getElementById('settings-toggle').addEventListener('click', () => settingsModal.style.display = 'flex');
  saveSettingsBtn.addEventListener('click', () => {
    settings.workDuration = parseInt(setWork.value);
    settings.shortBreak = parseInt(setShort.value);
    settings.longBreak = parseInt(setLong.value);
    settings.longBreakInterval = parseInt(setInterval.value);
    settings.accentColor = setAccent.value;
    settings.sound = setSound.value;
    settings.voiceEnabled = setVoice.checked;
    settings.desktopNotify = setDesktopNotify.checked;
    settings.fullscreenBreak = setFullscreenBreak.checked;
    if (setFullscreenWork) settings.fullscreenWork = setFullscreenWork.checked;
    
    applySettingsToUI();
    if (!isRunning) resetTimer();
    saveToStorage();
    settingsModal.style.display = 'none';
    updateChart(currentChartTab);
  });
  
  // Accent color live preview
  setAccent.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--accent', e.target.value);
    if (accentSwatch) accentSwatch.style.backgroundColor = e.target.value;
  });
  
  // Modals close
  document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    taskModal.style.display = 'none';
    interruptModal.style.display = 'none';
  }));
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
  
  // Tasks
  addTaskBtn.addEventListener('click', () => openTaskModal(null));
  saveTaskBtn.addEventListener('click', saveTask);
  deleteTaskBtn.addEventListener('click', deleteTask);
  
  // Interruption
  document.getElementById('log-interruption-btn').addEventListener('click', () => {
    interruptModal.style.display = 'flex';
  });
  saveInterruptBtn.addEventListener('click', () => {
    const reason = interruptReason.value.trim();
    if (reason && sessionsHistory.length) {
      const lastSession = sessionsHistory[sessionsHistory.length-1];
      if (!lastSession.interruptions) lastSession.interruptions = [];
      lastSession.interruptions.push({ reason, time: new Date().toISOString() });
      saveToStorage();
    }
    interruptModal.style.display = 'none';
    interruptReason.value = '';
  });
  
  // Break overlay close
  document.getElementById('close-break-overlay').addEventListener('click', () => {
    breakOverlay.style.display = 'none';
  });
  if (workOverlay) {
    document.getElementById('close-work-overlay').addEventListener('click', () => {
      workOverlay.style.display = 'none';
    });
  }
  
  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'history') {
        chartContainer.style.display = 'none';
        historyPanel.style.display = 'block';
        renderHistoryList();
      } else {
        chartContainer.style.display = 'block';
        historyPanel.style.display = 'none';
        updateChart(tab);
      }
    });
  });
  
  // Export CSV
  exportDataBtn.addEventListener('click', () => {
    let csv = "Type,Duration,Timestamp\n";
    sessionsHistory.forEach(s => {
      csv += `${s.type},${s.duration},${s.timestamp}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pomodoro_sessions.csv';
    a.click();
  });
  
  // Focus mode
  focusToggle.addEventListener('click', () => {
    document.body.classList.toggle('focus-mode');
  });
  
  // Request notification permission
  if (Notification.permission === 'default') Notification.requestPermission();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function updateQuickStats() {
  todayPomodorosSpan.textContent = todayPomodoros;
  streakDaysSpan.textContent = streakDays;
}

// Start
init();
