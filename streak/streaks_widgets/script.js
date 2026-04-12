/**
 * Streak Widget – Customizable & Milestone-Aware
 * Features:
 * - Color & size customization (persisted per widget)
 * - Milestone messages and progress bar up to 365 days
 * - Special confetti celebration at 365 days
 * - Inline title editing
 */

const WIDGET_LIST_KEY = "streak_widget_list";
const CUSTOMIZATION_KEY_PREFIX = "streak_custom_";

// DOM Elements
const widgetContainer = document.getElementById('widgetContainer');
const widgetTitleEl = document.getElementById('widget-title');
const counterEl = document.getElementById('counter');
const statusEl = document.getElementById('status');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const increaseBtn = document.getElementById('increase-btn');
const decreaseBtn = document.getElementById('decrease-btn');
const resetBtn = document.getElementById('reset-btn');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const colorPicker = document.getElementById('color-picker');
const accentPicker = document.getElementById('accent-picker');
const sizeSlider = document.getElementById('size-slider');
const sizeValue = document.getElementById('size-value');
const closeSettings = document.getElementById('close-settings');

// State
let currentCount = 0;
let widgetId = null;
let widgetTitle = 'Streak';
let hasReached365 = false; // to prevent multiple celebrations

// =============================================
// UTILITIES
// =============================================
function getWidgetList() {
  try { return JSON.parse(localStorage.getItem(WIDGET_LIST_KEY)) || []; }
  catch { return []; }
}

function saveWidgetList(list) {
  localStorage.setItem(WIDGET_LIST_KEY, JSON.stringify(list));
}

function getWidgetIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function getCountKey(id) {
  return `streak_count_${id}`;
}

function getCount(id) {
  const raw = localStorage.getItem(getCountKey(id));
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function setCount(id, value) {
  localStorage.setItem(getCountKey(id), String(value));
}

function getCustomizationKey(id) {
  return `${CUSTOMIZATION_KEY_PREFIX}${id}`;
}

function loadCustomization(id) {
  const saved = localStorage.getItem(getCustomizationKey(id));
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch { return {}; }
  }
  return {};
}

function saveCustomization(id, settings) {
  localStorage.setItem(getCustomizationKey(id), JSON.stringify(settings));
}

// =============================================
// MILESTONE MESSAGES (up to 365)
// =============================================
function getMilestoneMessage(count) {
  if (count === 0) return { text: 'Start your streak 🚀', color: '#888' };
  if (count === 1) return { text: 'First day! Keep going!', color: '#4caf50' };
  if (count < 7) return { text: 'Building momentum...', color: '#4caf50' };
  if (count < 14) return { text: 'One week down! 🎉', color: '#00bcd4' };
  if (count < 21) return { text: 'Two weeks strong 💪', color: '#00bcd4' };
  if (count < 30) return { text: 'Almost a month!', color: '#ff9800' };
  if (count === 30) return { text: '🌟 30 DAYS! Amazing!', color: '#ff9800' };
  if (count < 50) return { text: 'You\'re on fire 🔥', color: '#ff5722' };
  if (count === 50) return { text: '🏅 50 DAYS! Half century!', color: '#ff5722' };
  if (count < 69) return { text: 'Unstoppable!', color: '#e91e63' };
  if (count === 69) return { text: '😏 Nice.', color: '#e91e63' };
  if (count < 100) return { text: 'Legend in the making', color: '#9c27b0' };
  if (count === 100) return { text: '💯 100 DAYS! CENTURY!', color: '#9c27b0' };
  if (count < 200) return { text: 'Beyond legendary', color: '#3f51b5' };
  if (count === 200) return { text: '🎖️ 200 DAYS! Incredible!', color: '#3f51b5' };
  if (count < 300) return { text: 'Mythical status', color: '#673ab7' };
  if (count === 300) return { text: '🏆 300 DAYS! Unreal!', color: '#673ab7' };
  if (count < 365) return { text: 'Approaching the summit...', color: '#ffd700' };
  if (count === 365) return { text: '👑 ONE FULL YEAR! YOU DID IT! 👑', color: '#ffd700' };
  return { text: 'ETERNAL LEGEND 🌌', color: '#ffd700' };
}

// =============================================
// UPDATE UI
// =============================================
function updateUI() {
  // Counter
  counterEl.textContent = currentCount;
  
  // Progress bar (capped at 365)
  const progressPercent = Math.min((currentCount / 365) * 100, 100);
  progressBar.style.width = `${progressPercent}%`;
  progressText.textContent = `${currentCount}/365`;
  
  // Milestone message
  const milestone = getMilestoneMessage(currentCount);
  statusEl.textContent = milestone.text;
  statusEl.style.color = milestone.color;
  
  // Special celebration at 365
  if (currentCount === 365 && !hasReached365) {
    hasReached365 = true;
    celebrate365();
  }
  if (currentCount < 365) hasReached365 = false;
  
  // Counter pop animation
  counterEl.classList.add('counter-pop');
  setTimeout(() => counterEl.classList.remove('counter-pop'), 300);
  
  // Save count
  if (widgetId) setCount(widgetId, currentCount);
}

function celebrate365() {
  // Confetti blast
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
  confetti({ particleCount: 150, spread: 120, origin: { y: 0.6, x: 0.2 }, colors: ['#ffd700', '#ff6a00'] });
  confetti({ particleCount: 150, spread: 120, origin: { y: 0.6, x: 0.8 }, colors: ['#ffd700', '#ee0979'] });
  setTimeout(() => {
    confetti({ particleCount: 200, spread: 150, origin: { y: 0.5 } });
  }, 200);
  
  // Extra message
  statusEl.textContent = '🎊 CONGRATULATIONS! ONE FULL YEAR! 🎊';
}

// =============================================
// APPLY CUSTOMIZATION
// =============================================
function applyCustomization(settings) {
  // Counter color
  if (settings.counterColor) {
    document.documentElement.style.setProperty('--counter-color', settings.counterColor);
    colorPicker.value = settings.counterColor;
  }
  // Accent color
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    accentPicker.value = settings.accentColor;
  }
  // Size
  if (settings.widgetSize) {
    const scale = settings.widgetSize / 100;
    widgetContainer.style.transform = `scale(${scale})`;
    sizeSlider.value = settings.widgetSize;
    sizeValue.textContent = settings.widgetSize;
  }
}

function saveCurrentCustomization() {
  if (!widgetId) return;
  const settings = {
    counterColor: colorPicker.value,
    accentColor: accentPicker.value,
    widgetSize: parseInt(sizeSlider.value)
  };
  saveCustomization(widgetId, settings);
  applyCustomization(settings);
}

// =============================================
// EVENT LISTENERS
// =============================================
increaseBtn.addEventListener('click', () => {
  currentCount++;
  updateUI();
});

decreaseBtn.addEventListener('click', () => {
  if (currentCount > 0) {
    currentCount--;
    updateUI();
  }
});

resetBtn.addEventListener('click', () => {
  if (confirm('Reset streak to 0?')) {
    currentCount = 0;
    updateUI();
  }
});

// Title editing
widgetTitleEl.addEventListener('click', () => {
  if (!widgetId) return;
  const widgets = getWidgetList();
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return;
  
  const newTitle = prompt('Edit widget title:', widget.title);
  if (!newTitle || !newTitle.trim()) return;
  
  widget.title = newTitle.trim();
  saveWidgetList(widgets);
  widgetTitleEl.textContent = `🔥 ${widget.title}`;
  widgetTitle = widget.title;
});

// Settings panel toggle
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

closeSettings.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  saveCurrentCustomization();
});

// Real-time customization preview
colorPicker.addEventListener('input', () => {
  document.documentElement.style.setProperty('--counter-color', colorPicker.value);
});
accentPicker.addEventListener('input', () => {
  document.documentElement.style.setProperty('--accent-color', accentPicker.value);
});
sizeSlider.addEventListener('input', () => {
  const val = sizeSlider.value;
  sizeValue.textContent = val;
  widgetContainer.style.transform = `scale(${val / 100})`;
});

// Save on change (debounced)
[colorPicker, accentPicker, sizeSlider].forEach(el => {
  el.addEventListener('change', saveCurrentCustomization);
});

// =============================================
// INITIALIZATION
// =============================================
widgetId = getWidgetIdFromUrl();

if (!widgetId) {
  widgetTitleEl.textContent = '🔥 Streak';
  statusEl.textContent = 'No widget selected.';
  counterEl.textContent = '—';
} else {
  const widgets = getWidgetList();
  const widget = widgets.find(w => w.id === widgetId);
  
  if (widget) {
    widgetTitle = widget.title;
    widgetTitleEl.textContent = `🔥 ${widget.title}`;
  } else {
    widgetTitleEl.textContent = '🔥 Streak';
  }
  
  // Load count
  currentCount = getCount(widgetId);
  
  // Load customizations
  const savedSettings = loadCustomization(widgetId);
  if (Object.keys(savedSettings).length === 0) {
    // Defaults
    savedSettings.counterColor = '#ffffff';
    savedSettings.accentColor = '#ff6a00';
    savedSettings.widgetSize = 100;
  }
  applyCustomization(savedSettings);
  
  updateUI();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '+' || e.key === '=') {
    increaseBtn.click();
  } else if (e.key === '-' || e.key === '_') {
    decreaseBtn.click();
  } else if (e.key === 'r' || e.key === 'R') {
    resetBtn.click();
  }
});
