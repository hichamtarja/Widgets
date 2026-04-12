/**
 * Streak Widget – Refined with draggable settings, flip on counter, etc.
 */

// =============================================
// GLOBALS & STORAGE
// =============================================
const WIDGET_LIST_KEY = "streak_widget_list";
const CUSTOM_KEY_PREFIX = "streak_custom_";
const LAST_STREAK_KEY_PREFIX = "streak_last_";

let widgetId = null;
let currentCount = 0;
let hasReached365 = false;

// DOM Elements
const widgetContainer = document.getElementById('widgetContainer');
const widgetTitleEl = document.getElementById('widget-title');
const widgetEmoji = document.getElementById('widgetEmoji');
const counterEl = document.getElementById('counter');
const streakLabel = document.getElementById('streak-label');
const statusEl = document.getElementById('status');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const increaseBtn = document.getElementById('increase-btn');
const decreaseBtn = document.getElementById('decrease-btn');
const flipContainer = document.getElementById('flipContainer');
const counterWrapper = document.getElementById('counterWrapper');
const flipToFront = document.getElementById('flip-to-front');
const menuToggle = document.getElementById('menu-toggle');
const menuDropdown = document.getElementById('menu-dropdown');
const menuSettings = document.getElementById('menu-settings');
const menuReset = document.getElementById('menu-reset');
const settingsPanel = document.getElementById('settings-panel');
const closeSettings = document.getElementById('close-settings');

// Customization inputs
const emojiInput = document.getElementById('emoji-input');
const fontSelect = document.getElementById('font-select');
const fontColorPicker = document.getElementById('font-color-picker');
const bgTypeSelect = document.getElementById('bg-type-select');
const solidColorItem = document.getElementById('solid-color-item');
const gradientColorItem = document.getElementById('gradient-color-item');
const bgColorPicker = document.getElementById('bg-color-picker');
const gradientStartPicker = document.getElementById('gradient-start-picker');
const gradientEndPicker = document.getElementById('gradient-end-picker');
const accentPicker = document.getElementById('accent-picker');
const counterColorPicker = document.getElementById('counter-color-picker');
const sizeSlider = document.getElementById('size-slider');
const sizeValue = document.getElementById('size-value');

// Last streak display
const lastStreakDate = document.getElementById('last-streak-date');
const lastStreakTime = document.getElementById('last-streak-time');

// =============================================
// STORAGE HELPERS (unchanged)
// =============================================
function getWidgetList() {
  try { return JSON.parse(localStorage.getItem(WIDGET_LIST_KEY)) || []; }
  catch { return []; }
}
function saveWidgetList(list) { localStorage.setItem(WIDGET_LIST_KEY, JSON.stringify(list)); }
function getWidgetIdFromUrl() { return new URLSearchParams(window.location.search).get('id'); }
function getCountKey(id) { return `streak_count_${id}`; }
function getCount(id) { const v = Number(localStorage.getItem(getCountKey(id))); return isFinite(v) ? v : 0; }
function setCount(id, val) { localStorage.setItem(getCountKey(id), String(val)); }

function getLastStreakKey(id) { return `${LAST_STREAK_KEY_PREFIX}${id}`; }
function getLastStreak(id) {
  const saved = localStorage.getItem(getLastStreakKey(id));
  return saved ? JSON.parse(saved) : null;
}
function setLastStreak(id, date) {
  if (date === null) localStorage.removeItem(getLastStreakKey(id));
  else localStorage.setItem(getLastStreakKey(id), JSON.stringify(date));
}

function getCustomizationKey(id) { return `${CUSTOM_KEY_PREFIX}${id}`; }
function loadCustomization(id) {
  const saved = localStorage.getItem(getCustomizationKey(id));
  return saved ? JSON.parse(saved) : {};
}
function saveCustomization(id, settings) {
  localStorage.setItem(getCustomizationKey(id), JSON.stringify(settings));
}

// =============================================
// MILESTONE MESSAGES
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
  counterEl.textContent = currentCount;
  streakLabel.textContent = `${currentCount} day streak`;
  const progressPercent = Math.min((currentCount / 365) * 100, 100);
  progressBar.style.width = `${progressPercent}%`;
  progressText.textContent = `${currentCount}/365`;

  const milestone = getMilestoneMessage(currentCount);
  statusEl.textContent = milestone.text;
  statusEl.style.color = milestone.color;

  if (currentCount === 365 && !hasReached365) {
    hasReached365 = true;
    celebrate365();
  }
  if (currentCount < 365) hasReached365 = false;

  counterEl.classList.add('counter-pop');
  setTimeout(() => counterEl.classList.remove('counter-pop'), 300);

  if (widgetId) setCount(widgetId, currentCount);
}

function celebrate365() {
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
  confetti({ particleCount: 150, spread: 120, origin: { y: 0.6, x: 0.2 }, colors: ['#ffd700', '#ff6a00'] });
  confetti({ particleCount: 150, spread: 120, origin: { y: 0.6, x: 0.8 }, colors: ['#ffd700', '#ee0979'] });
  setTimeout(() => confetti({ particleCount: 200, spread: 150, origin: { y: 0.5 } }), 200);
}

// =============================================
// APPLY CUSTOMIZATION
// =============================================
function applyCustomization(settings) {
  if (settings.emoji) widgetEmoji.textContent = settings.emoji;
  if (settings.fontFamily) {
    document.documentElement.style.setProperty('--font-family', settings.fontFamily);
    fontSelect.value = settings.fontFamily;
  }
  if (settings.fontColor) {
    document.documentElement.style.setProperty('--text-primary', settings.fontColor);
    fontColorPicker.value = settings.fontColor;
  }
  if (settings.bgType === 'gradient') {
    const start = settings.gradientStart || '#1f1f1f';
    const end = settings.gradientEnd || '#2a2a2a';
    widgetContainer.style.background = `linear-gradient(135deg, ${start}, ${end})`;
    document.querySelector('.back-container').style.background = `linear-gradient(135deg, ${start}, ${end})`;
  } else {
    const bg = settings.bgColor || '#1f1f1f';
    widgetContainer.style.background = bg;
    document.querySelector('.back-container').style.background = bg;
  }
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    accentPicker.value = settings.accentColor;
  }
  if (settings.counterColor) {
    document.documentElement.style.setProperty('--counter-color', settings.counterColor);
    counterColorPicker.value = settings.counterColor;
  }
  if (settings.widgetSize) {
    const scale = settings.widgetSize / 100;
    widgetContainer.style.transform = `scale(${scale})`;
    document.querySelector('.back-container').style.transform = `scale(${scale})`;
    sizeSlider.value = settings.widgetSize;
    sizeValue.textContent = settings.widgetSize;
  }
  bgTypeSelect.value = settings.bgType || 'solid';
  toggleBgInputs();
  if (settings.bgColor) bgColorPicker.value = settings.bgColor;
  if (settings.gradientStart) gradientStartPicker.value = settings.gradientStart;
  if (settings.gradientEnd) gradientEndPicker.value = settings.gradientEnd;
  emojiInput.value = settings.emoji || '🔥';
}

function toggleBgInputs() {
  if (bgTypeSelect.value === 'gradient') {
    solidColorItem.classList.add('hidden');
    gradientColorItem.classList.remove('hidden');
  } else {
    solidColorItem.classList.remove('hidden');
    gradientColorItem.classList.add('hidden');
  }
}

function saveCurrentCustomization() {
  if (!widgetId) return;
  const settings = {
    emoji: emojiInput.value || '🔥',
    fontFamily: fontSelect.value,
    fontColor: fontColorPicker.value,
    bgType: bgTypeSelect.value,
    bgColor: bgColorPicker.value,
    gradientStart: gradientStartPicker.value,
    gradientEnd: gradientEndPicker.value,
    accentColor: accentPicker.value,
    counterColor: counterColorPicker.value,
    widgetSize: parseInt(sizeSlider.value)
  };
  saveCustomization(widgetId, settings);
  applyCustomization(settings);
}

// =============================================
// EVENT LISTENERS
// =============================================
// Increase
increaseBtn.addEventListener('click', () => {
  currentCount++;
  setLastStreak(widgetId, new Date().toISOString());
  updateUI();
  confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
});

// Decrease with shake
decreaseBtn.addEventListener('click', () => {
  if (currentCount > 0) {
    currentCount--;
    updateUI();
    widgetContainer.classList.add('shake');
    setTimeout(() => widgetContainer.classList.remove('shake'), 300);
  }
});

// Flip on counter click
counterWrapper.addEventListener('click', () => {
  flipContainer.classList.add('flipped');
  updateLastStreakDisplay();
});
flipToFront.addEventListener('click', () => flipContainer.classList.remove('flipped'));

function updateLastStreakDisplay() {
  const last = getLastStreak(widgetId);
  if (last) {
    const d = new Date(last);
    lastStreakDate.textContent = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    lastStreakTime.textContent = d.toLocaleTimeString();
  } else {
    lastStreakDate.textContent = 'Never';
    lastStreakTime.textContent = '';
  }
}

// Menu
menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle('hidden');
});
document.addEventListener('click', () => menuDropdown.classList.add('hidden'));

menuSettings.addEventListener('click', () => {
  settingsPanel.classList.remove('hidden');
  menuDropdown.classList.add('hidden');
});

menuReset.addEventListener('click', () => {
  if (confirm('Reset streak to 0?')) {
    currentCount = 0;
    setLastStreak(widgetId, null); // clear last streak
    updateUI();
  }
  menuDropdown.classList.add('hidden');
});

// Title editing
widgetTitleEl.addEventListener('click', () => {
  if (!widgetId) return;
  const widgets = getWidgetList();
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return;
  const newTitle = prompt('Edit widget title:', widget.title);
  if (newTitle?.trim()) {
    widget.title = newTitle.trim();
    saveWidgetList(widgets);
    widgetTitleEl.textContent = widget.title;
  }
});

// Emoji editing
widgetEmoji.addEventListener('click', () => {
  const newEmoji = prompt('Enter an emoji:', widgetEmoji.textContent);
  if (newEmoji) {
    widgetEmoji.textContent = newEmoji;
    saveCurrentCustomization();
  }
});

// Settings panel
closeSettings.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  saveCurrentCustomization();
});

bgTypeSelect.addEventListener('change', toggleBgInputs);
sizeSlider.addEventListener('input', () => sizeValue.textContent = sizeSlider.value);
[fontSelect, fontColorPicker, bgColorPicker, gradientStartPicker, gradientEndPicker, accentPicker, counterColorPicker].forEach(el => {
  el.addEventListener('input', () => {
    if (el === fontSelect) document.documentElement.style.setProperty('--font-family', el.value);
    if (el === fontColorPicker) document.documentElement.style.setProperty('--text-primary', el.value);
    if (el === accentPicker) document.documentElement.style.setProperty('--accent-color', el.value);
    if (el === counterColorPicker) document.documentElement.style.setProperty('--counter-color', el.value);
  });
  el.addEventListener('change', saveCurrentCustomization);
});
sizeSlider.addEventListener('change', saveCurrentCustomization);
emojiInput.addEventListener('change', saveCurrentCustomization);

// =============================================
// DRAGGABLE SETTINGS PANEL
// =============================================
const settingsHeader = document.getElementById('settings-header');
let isDragging = false;
let offsetX, offsetY;

settingsHeader.addEventListener('mousedown', (e) => {
  isDragging = true;
  const rect = settingsPanel.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  settingsPanel.style.transition = 'none';
  settingsPanel.style.transform = 'none';
  settingsPanel.style.left = rect.left + 'px';
  settingsPanel.style.top = rect.top + 'px';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  let left = e.clientX - offsetX;
  let top = e.clientY - offsetY;
  // keep within viewport
  left = Math.max(0, Math.min(left, window.innerWidth - settingsPanel.offsetWidth));
  top = Math.max(0, Math.min(top, window.innerHeight - settingsPanel.offsetHeight));
  settingsPanel.style.left = left + 'px';
  settingsPanel.style.top = top + 'px';
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  settingsPanel.style.transition = '';
});

// =============================================
// INIT
// =============================================
widgetId = getWidgetIdFromUrl();

if (widgetId) {
  const widgets = getWidgetList();
  const widget = widgets.find(w => w.id === widgetId);
  if (widget) {
    widgetTitleEl.textContent = widget.title;
  }
  currentCount = getCount(widgetId);
  const savedSettings = loadCustomization(widgetId);
  applyCustomization(savedSettings);
  updateUI();
} else {
  widgetTitleEl.textContent = 'Streak';
  statusEl.textContent = 'No widget selected.';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === '+' || e.key === '=') increaseBtn.click();
  if (e.key === '-' || e.key === '_') decreaseBtn.click();
});
