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
let interruptionsLog = [];             // stored with sessions

// ---------- Tasks ----------
let tasks = [];

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
  accentColor: '#ff6a00'
};

// ---------- Quotes (for breaks) ----------
const quotes = [
  "Rest is not idleness.", 
  "Almost everything will work again if you unplug it for a few minutes.",
  "Your future self will thank you.",
  "Take a deep breath. You're doing great.",
  "Productivity is about sustainable rhythms.",
  "Step away to come back stronger."
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
      interruptionsLog = data.interruptions || [];
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
    interruptions: interruptionsLog
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
  autoStartCheck.checked = settings.autoStart;
  document.documentElement.style.setProperty('--accent', settings.accentColor);
  
  // Reset timer to work duration
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
  
  // Background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 12;
  ctx.stroke();
  
  // Progress arc
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
  
  // Update title
  document.title = `${minutesSpan.textContent}:${secondsSpan.textContent} - ${currentSessionType}`;
}

function completeSession() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  startPauseBtn.textContent = 'Start';
  
  // Play sound
  playSound(settings.sound);
  
  // Desktop notification
  if (settings.desktopNotify && Notification.permission === 'granted') {
    new Notification(`Pomodoro Suite`, {
      body: `${currentSessionType} session completed!`,
      icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%23ff6a00"/%3E%3C/svg%3E'
    });
  }
  
  // Voice announcement
  if (settings.voiceEnabled) {
    const msg = new SpeechSynthesisUtterance(
      currentSessionType === 'work' ? 'Time for a break.' : 'Back to work.'
    );
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
  
  if (currentSessionType === 'work') {
    todayPomodoros++;
    updateStreak();
    
    // Update task progress (if a task is selected? Not yet – we'll assign later)
    // For simplicity, we assume user works on first incomplete task? We'll add assignment later.
  }
  
  // Show full‑screen break if enabled and it's a break
  if (settings.fullscreenBreak && currentSessionType !== 'work') {
    breakOverlay.style.display = 'flex';
  }
  
  // Show a random quote during breaks
  if (currentSessionType !== 'work') {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteText.textContent = `“${randomQuote}”`;
  } else {
    quoteText.textContent = 'Stay focused, you\'re doing great.';
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
  isRunning = true;
  startPauseBtn.textContent = 'Pause';
  timerInterval = setInterval(tick, 1000);
  
  // Request notification permission if needed
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
  completeSession(); // handles transition
}

function updateSessionLabel() {
  sessionTypeLabel.textContent = currentSessionType === 'work' ? 'FOCUS' : 
                                 currentSessionType === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  sessionCounterSpan.textContent = `${sessionCount} / ${settings.longBreakInterval}`;
}

// ======================== SOUND ========================
function playSound(type) {
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
}

// ======================== TASKS ========================
function renderTasks() {
  if (!tasksListDiv) return;
  tasksListDiv.innerHTML = '';
  let completed = 0;
  tasks.forEach((task, index) => {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';
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
        openTaskModal(task);
      }
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
    saveToStorage();
    renderTasks();
    taskModal.style.display = 'none';
  }
}

// ======================== STATISTICS & CHART ========================
function updateChart(tab) {
  currentChartTab = tab;
  const ctxChart = document.getElementById('stats-chart').getContext('2d');
  if (statsChart) statsChart.destroy();
  
  // Generate mock data based on sessions
  const now = new Date();
  let labels = [], data = [];
  
  if (tab === 'daily') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    data = [3, 5, 2, 4, 6, 1, 0];
  } else if (tab === 'weekly') {
    labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    data = [18, 22, 15, 20];
  } else {
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    data = [60, 75, 50, 80, 90, 70];
  }
  
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
      plugins: { legend: { display: false } }
    }
  });
}

function renderHistoryList() {
  const recent = sessionsHistory.slice(-10).reverse();
  historyListDiv.innerHTML = recent.map(s => `
    <div class="history-item">
      <span>${s.type} · ${s.duration} min</span>
      <span>${new Date(s.timestamp).toLocaleTimeString()}</span>
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
    
    applySettingsToUI();
    if (!isRunning) resetTimer();
    saveToStorage();
    settingsModal.style.display = 'none';
    updateChart(currentChartTab);
  });
  
  // Modals close
  document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    taskModal.style.display = 'none';
    interruptModal.style.display = 'none';
  }));
  
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
      sessionsHistory[sessionsHistory.length-1].interruptions.push({ reason, time: new Date().toISOString() });
      saveToStorage();
    }
    interruptModal.style.display = 'none';
    interruptReason.value = '';
  });
  
  // Break overlay close
  document.getElementById('close-break-overlay').addEventListener('click', () => {
    breakOverlay.style.display = 'none';
  });
  
  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'history') {
        chartContainer.style.display = 'none';
        historyPanel.style.display = 'block';
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
  
  // Request notification permission early
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
