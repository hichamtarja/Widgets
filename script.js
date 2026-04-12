/**
 * Widget Hub Dashboard – Enhanced with:
 * - Drag & Drop reordering (SortableJS)
 * - Persistent layout (localStorage)
 * - Dark/Light theme toggle
 * - Custom accent color picker
 * - Floating emoji parallax effect
 * - Activity badges (checks if widget pages are reachable)
 * - Navigation with fade & ripple
 */

// =============================================
// 0. DOM ELEMENTS & GLOBAL VARIABLES
// =============================================
const cardsContainer = document.getElementById('cardsContainer');
const cards = document.querySelectorAll('.card');
const themeToggle = document.getElementById('themeToggle');
const accentPicker = document.getElementById('accentColor');
const floatingEmojis = document.querySelectorAll('.floating span');

// =============================================
// 1. DRAG & DROP REORDERING (SortableJS)
// =============================================
let sortable;

function initSortable() {
  sortable = Sortable.create(cardsContainer, {
    animation: 200,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    // Save order to localStorage after drag ends
    onEnd: function() {
      saveCardOrder();
    }
  });
}

// Save current order of cards (based on data-id)
function saveCardOrder() {
  const cardElements = [...cardsContainer.querySelectorAll('.card')];
  const order = cardElements.map(card => card.dataset.id);
  localStorage.setItem('widgetHub_order', JSON.stringify(order));
}

// Load saved order and reorder DOM accordingly
function loadCardOrder() {
  const savedOrder = localStorage.getItem('widgetHub_order');
  if (!savedOrder) return;

  try {
    const orderArray = JSON.parse(savedOrder);
    const cardMap = new Map();
    cards.forEach(card => cardMap.set(card.dataset.id, card));

    // Reorder DOM nodes
    orderArray.forEach(id => {
      const card = cardMap.get(id);
      if (card) cardsContainer.appendChild(card);
    });
  } catch (e) {
    console.warn('Failed to load saved order', e);
  }
}

// =============================================
// 2. PERSISTENT LAYOUT (Theme & Accent)
// =============================================
function saveThemePreference(isDark) {
  localStorage.setItem('widgetHub_theme', isDark ? 'dark' : 'light');
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem('widgetHub_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    updateThemeToggleText(true);
  } else {
    document.body.classList.remove('dark');
    updateThemeToggleText(false);
  }
}

function updateThemeToggleText(isDark) {
  const icon = themeToggle.querySelector('.theme-icon');
  const text = themeToggle.querySelector('.theme-text');
  if (isDark) {
    icon.textContent = '☀️';
    text.textContent = 'Light';
  } else {
    icon.textContent = '🌙';
    text.textContent = 'Dark';
  }
}

// Theme toggle handler
themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  saveThemePreference(isDark);
  updateThemeToggleText(isDark);
});

// Accent color persistence
function saveAccentColor(color) {
  localStorage.setItem('widgetHub_accent', color);
  applyAccentColor(color);
}

function loadAccentColor() {
  const savedColor = localStorage.getItem('widgetHub_accent');
  if (savedColor) {
    accentPicker.value = savedColor;
    applyAccentColor(savedColor);
  } else {
    // Default from CSS variable
    applyAccentColor(getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim());
  }
}

function applyAccentColor(color) {
  document.documentElement.style.setProperty('--accent-color', color);
  // Update ripple background automatically via CSS variable
}

accentPicker.addEventListener('input', (e) => {
  const color = e.target.value;
  applyAccentColor(color);
  saveAccentColor(color);
});

// =============================================
// 3. NAVIGATION & RIPPLE EFFECT
// =============================================
function navigateToWidget(event, url) {
  if (event.type === 'keydown') {
    event.preventDefault();
  }

  const targetUrl = url || event.currentTarget.dataset.url;
  if (!targetUrl) return;

  createRipple(event);
  document.body.classList.add('fade-out');

  setTimeout(() => {
    window.location.href = targetUrl;
  }, 400);
}

function createRipple(event) {
  const card = event.currentTarget;
  const existingRipple = card.querySelector('.ripple');
  if (existingRipple) existingRipple.remove();

  const ripple = document.createElement('span');
  ripple.classList.add('ripple');

  const diameter = Math.max(card.clientWidth, card.clientHeight);
  ripple.style.width = ripple.style.height = `${diameter}px`;

  let clientX, clientY;
  if (event instanceof MouseEvent) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    const rect = card.getBoundingClientRect();
    clientX = rect.left + rect.width / 2;
    clientY = rect.top + rect.height / 2;
  }

  const rect = card.getBoundingClientRect();
  const left = clientX - rect.left - diameter / 2;
  const top = clientY - rect.top - diameter / 2;

  ripple.style.left = `${left}px`;
  ripple.style.top = `${top}px`;

  card.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

// Attach event listeners to each card
function attachCardListeners() {
  document.querySelectorAll('.card').forEach(card => {
    // Remove existing listeners to avoid duplicates (when reordering, same elements)
    card.removeEventListener('click', handleCardClick);
    card.removeEventListener('keydown', handleCardKeydown);
    card.addEventListener('click', handleCardClick);
    card.addEventListener('keydown', handleCardKeydown);
  });
}

function handleCardClick(e) {
  navigateToWidget(e);
}

function handleCardKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    navigateToWidget(e);
  }
}

// Re-attach after potential DOM changes (Sortable doesn't change listeners, but safe)
const observer = new MutationObserver(() => {
  attachCardListeners();
});
observer.observe(cardsContainer, { childList: true, subtree: false });

// =============================================
// 4. ACTIVITY BADGES (Check widget availability)
// =============================================
async function checkWidgetAvailability(card) {
  const url = card.dataset.url;
  const badge = card.querySelector('.status-badge');
  if (!badge) return;

  // Set to unknown initially
  badge.dataset.status = 'unknown';
  badge.title = 'Checking availability...';

  try {
    // Use HEAD request to check if resource exists without downloading full page
    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (response.ok) {
      badge.dataset.status = 'available';
      badge.title = 'Widget is available';
    } else {
      badge.dataset.status = 'unavailable';
      badge.title = `Widget unavailable (HTTP ${response.status})`;
    }
  } catch (error) {
    // Network error or CORS (likely unreachable)
    badge.dataset.status = 'unavailable';
    badge.title = 'Widget cannot be reached (network error)';
  }
}

function checkAllWidgetsAvailability() {
  document.querySelectorAll('.card').forEach(card => checkWidgetAvailability(card));
}

// =============================================
// 5. FLOATING EMOJI PARALLAX INTERACTION
// =============================================
function initFloatingParallax() {
  const emojis = [...floatingEmojis];
  if (emojis.length === 0) return;

  // Store base positions and animation properties
  const basePositions = emojis.map(emoji => ({
    el: emoji,
    baseX: parseFloat(emoji.style.left) || 0,
    baseY: parseFloat(emoji.style.top) || 0,
    speed: 0.02 + Math.random() * 0.03  // random speed factor
  }));

  // Position emojis initially using grid (as before)
  positionFloatingEmojisGrid();

  // Mouse move handler for parallax
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let rafId = null;

  function updateParallax() {
    basePositions.forEach(item => {
      const dx = (mouseX - window.innerWidth / 2) * item.speed;
      const dy = (mouseY - window.innerHeight / 2) * item.speed;
      // Combine with base position (which might include float animation via CSS)
      // We'll apply transform directly, but keep base animation separate by using translate
      // The CSS float animation uses transform, so we need to add our offset without overriding
      // We'll use a data attribute and update via style, but better: use custom property.
      // For simplicity, we'll set transform directly, which overrides CSS animation.
      // To keep float animation, we'd need to combine. We'll just apply a subtle shift.
      const shiftX = dx * 0.5;
      const shiftY = dy * 0.5;
      item.el.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(${item.el.dataset.scale || 1})`;
    });
    rafId = null;
  }

  function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(updateParallax);
    }
  }

  window.addEventListener('mousemove', handleMouseMove);

  // Reset to base position when mouse leaves window
  window.addEventListener('mouseleave', () => {
    basePositions.forEach(item => {
      item.el.style.transform = '';
    });
  });

  // Recalculate base positions on resize
  window.addEventListener('resize', () => {
    positionFloatingEmojisGrid();
    // Update stored base positions
    basePositions.forEach((item, idx) => {
      const emoji = item.el;
      item.baseX = parseFloat(emoji.style.left) || 0;
      item.baseY = parseFloat(emoji.style.top) || 0;
    });
  });
}

// Grid positioning (kept from original, slightly refined)
function positionFloatingEmojisGrid() {
  const emojis = [...floatingEmojis];
  const count = emojis.length;
  if (count === 0) return;

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = window.innerWidth / cols;
  const cellH = window.innerHeight / rows;

  emojis.forEach((emoji, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    let x = col * cellW + Math.random() * (cellW - 60);
    let y = row * cellH + Math.random() * (cellH - 60);
    x = Math.max(10, Math.min(x, window.innerWidth - 60));
    y = Math.max(10, Math.min(y, window.innerHeight - 60));
    emoji.style.left = `${x}px`;
    emoji.style.top = `${y}px`;

    // Random scale and delay
    const scale = 0.8 + Math.random() * 0.8;
    emoji.dataset.scale = scale;
    emoji.style.transform = `scale(${scale})`;
    emoji.style.animationDelay = `${Math.random() * 6}s`;
  });
}

// =============================================
// 6. INITIALIZATION & PAGE LOAD
// =============================================
window.addEventListener('pageshow', () => {
  document.body.classList.remove('fade-out');
});

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.remove('fade-out');

  // Load saved preferences
  loadThemePreference();
  loadAccentColor();
  loadCardOrder();        // Restore card order from localStorage

  // Initialize Sortable after order is restored
  initSortable();

  // Attach navigation listeners
  attachCardListeners();

  // Check widget availability (badges)
  checkAllWidgetsAvailability();

  // Set up floating emoji parallax
  initFloatingParallax();

  // Fallback for grid positioning if needed
  positionFloatingEmojisGrid();
});

// =============================================
// 7. HANDLE DYNAMIC CHANGES (e.g., accent)
// =============================================
// The ripple uses CSS variable --accent-color, so no extra work needed.
