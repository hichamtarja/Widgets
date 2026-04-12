/**
 * Productivity Toolkit
 * - Bookmark Manager with custom categories
 * - Password Generator with optional history
 * - Link Checker (HEAD request)
 * - QR Code Generator (qrcode library)
 */

// =============================================
// STATE & DOM ELEMENTS
// =============================================
let bookmarks = [];
let categories = ['General', 'Work', 'Personal']; // default categories
let currentCategory = 'General';
let editingBookmarkId = null;
let passwordHistory = [];
let historyEnabled = false;

// Bookmark elements
const categoryList = document.getElementById('categoryList');
const bookmarksContainer = document.getElementById('bookmarksContainer');
const noBookmarksMsg = document.getElementById('noBookmarksMsg');
const bookmarkForm = document.getElementById('bookmarkForm');
const formContainer = document.getElementById('bookmarkFormContainer');
const formTitle = document.getElementById('formTitle');
const bookmarkIdInput = document.getElementById('bookmarkId');
const bookmarkTitleInput = document.getElementById('bookmarkTitle');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const bookmarkCategorySelect = document.getElementById('bookmarkCategory');
const cancelBookmarkBtn = document.getElementById('cancelBookmarkBtn');
const showAddBookmarkBtn = document.getElementById('showAddBookmarkBtn');
const bookmarkSearch = document.getElementById('bookmarkSearch');
const newCategoryInput = document.getElementById('newCategoryInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');

// Password elements
const generatedPassword = document.getElementById('generatedPassword');
const copyPasswordBtn = document.getElementById('copyPasswordBtn');
const passwordLength = document.getElementById('passwordLength');
const lengthValue = document.getElementById('lengthValue');
const includeUppercase = document.getElementById('includeUppercase');
const includeLowercase = document.getElementById('includeLowercase');
const includeNumbers = document.getElementById('includeNumbers');
const includeSymbols = document.getElementById('includeSymbols');
const generatePasswordBtn = document.getElementById('generatePasswordBtn');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const enableHistory = document.getElementById('enableHistory');
const passwordHistoryList = document.getElementById('passwordHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Link Checker elements
const linkUrlInput = document.getElementById('linkUrlInput');
const checkLinkBtn = document.getElementById('checkLinkBtn');
const linkResult = document.getElementById('linkResult');
const statusIndicator = linkResult.querySelector('.status-indicator');
const statusText = linkResult.querySelector('.status-text');

// QR Code elements
const qrUrlInput = document.getElementById('qrUrlInput');
const generateQrBtn = document.getElementById('generateQrBtn');
const qrCanvas = document.getElementById('qrCanvas');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const downloadQrBtn = document.getElementById('downloadQrBtn');

// Import/Export
const exportBookmarksBtn = document.getElementById('exportBookmarksBtn');
const importBookmarksBtn = document.getElementById('importBookmarksBtn');
const importBookmarksFile = document.getElementById('importBookmarksFile');

// =============================================
// INITIALIZATION & STORAGE
// =============================================
function loadFromStorage() {
  const storedBookmarks = localStorage.getItem('toolkit_bookmarks');
  if (storedBookmarks) bookmarks = JSON.parse(storedBookmarks);
  const storedCategories = localStorage.getItem('toolkit_categories');
  if (storedCategories) categories = JSON.parse(storedCategories);
  else categories = ['General', 'Work', 'Personal'];
  // Ensure General exists
  if (!categories.includes('General')) categories.unshift('General');
}

function saveToStorage() {
  localStorage.setItem('toolkit_bookmarks', JSON.stringify(bookmarks));
  localStorage.setItem('toolkit_categories', JSON.stringify(categories));
}

loadFromStorage();

// =============================================
// CATEGORY MANAGEMENT
// =============================================
function renderCategories() {
  categoryList.innerHTML = '';
  categories.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = `category-chip ${cat === currentCategory ? 'active' : ''}`;
    chip.innerHTML = `
      ${cat}
      ${cat !== 'General' ? '<span class="delete-cat" data-cat="'+cat+'">✕</span>' : ''}
    `;
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-cat')) {
        e.stopPropagation();
        deleteCategory(cat);
      } else {
        currentCategory = cat;
        renderCategories();
        renderBookmarks();
      }
    });
    categoryList.appendChild(chip);
  });
  // Populate category select in form
  bookmarkCategorySelect.innerHTML = '';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    bookmarkCategorySelect.appendChild(option);
  });
}

function deleteCategory(cat) {
  if (cat === 'General') return;
  // Move bookmarks from this category to General
  bookmarks.forEach(b => { if (b.category === cat) b.category = 'General'; });
  categories = categories.filter(c => c !== cat);
  if (currentCategory === cat) currentCategory = 'General';
  saveToStorage();
  renderCategories();
  renderBookmarks();
}

addCategoryBtn.addEventListener('click', () => {
  const newCat = newCategoryInput.value.trim();
  if (newCat && !categories.includes(newCat)) {
    categories.push(newCat);
    saveToStorage();
    renderCategories();
    newCategoryInput.value = '';
  }
});

// =============================================
// BOOKMARK RENDERING & CRUD
// =============================================
function renderBookmarks() {
  const searchTerm = bookmarkSearch.value.toLowerCase();
  let filtered = bookmarks.filter(b => b.category === currentCategory);
  if (searchTerm) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(searchTerm) || 
      b.url.toLowerCase().includes(searchTerm)
    );
  }

  if (filtered.length === 0) {
    bookmarksContainer.innerHTML = '';
    noBookmarksMsg.classList.remove('hidden');
    return;
  }
  noBookmarksMsg.classList.add('hidden');
  bookmarksContainer.innerHTML = filtered.map(bookmark => {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bookmark.url)}&sz=32`;
    return `
      <div class="bookmark-card" data-id="${bookmark.id}" data-url="${bookmark.url}">
        <img src="${faviconUrl}" class="bookmark-favicon" alt="" loading="lazy" onerror="this.style.display='none'">
        <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
        <div class="bookmark-url">${escapeHtml(new URL(bookmark.url).hostname)}</div>
        <div class="bookmark-actions">
          <button class="edit-bookmark" data-id="${bookmark.id}" title="Edit">✏️</button>
          <button class="delete-bookmark" data-id="${bookmark.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners to cards
  document.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const url = card.dataset.url;
      window.open(url, '_blank');
    });
  });
  document.querySelectorAll('.edit-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      editBookmark(id);
    });
  });
  document.querySelectorAll('.delete-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      deleteBookmark(id);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function editBookmark(id) {
  const bookmark = bookmarks.find(b => b.id === id);
  if (!bookmark) return;
  editingBookmarkId = id;
  bookmarkIdInput.value = id;
  bookmarkTitleInput.value = bookmark.title;
  bookmarkUrlInput.value = bookmark.url;
  bookmarkCategorySelect.value = bookmark.category;
  formTitle.textContent = 'Edit Bookmark';
  formContainer.classList.remove('hidden');
}

function deleteBookmark(id) {
  bookmarks = bookmarks.filter(b => b.id !== id);
  saveToStorage();
  renderBookmarks();
}

bookmarkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = bookmarkTitleInput.value.trim();
  let url = bookmarkUrlInput.value.trim();
  const category = bookmarkCategorySelect.value;

  if (!title || !url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (editingBookmarkId) {
    const index = bookmarks.findIndex(b => b.id === editingBookmarkId);
    if (index !== -1) {
      bookmarks[index] = { ...bookmarks[index], title, url, category };
    }
    editingBookmarkId = null;
  } else {
    const newBookmark = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title,
      url,
      category
    };
    bookmarks.push(newBookmark);
  }

  saveToStorage();
  formContainer.classList.add('hidden');
  bookmarkForm.reset();
  renderCategories();
  renderBookmarks();
});

cancelBookmarkBtn.addEventListener('click', () => {
  formContainer.classList.add('hidden');
  bookmarkForm.reset();
  editingBookmarkId = null;
});

showAddBookmarkBtn.addEventListener('click', () => {
  editingBookmarkId = null;
  formTitle.textContent = 'Add Bookmark';
  bookmarkIdInput.value = '';
  bookmarkForm.reset();
  formContainer.classList.remove('hidden');
});

bookmarkSearch.addEventListener('input', renderBookmarks);

// =============================================
// IMPORT/EXPORT
// =============================================
exportBookmarksBtn.addEventListener('click', () => {
  const data = { bookmarks, categories };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bookmarks_backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

importBookmarksBtn.addEventListener('click', () => importBookmarksFile.click());
importBookmarksFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.bookmarks && Array.isArray(data.bookmarks)) {
        bookmarks = data.bookmarks;
      }
      if (data.categories && Array.isArray(data.categories)) {
        categories = data.categories;
      }
      saveToStorage();
      renderCategories();
      renderBookmarks();
    } catch (err) {
      alert('Invalid file format.');
    }
  };
  reader.readAsText(file);
  importBookmarksFile.value = '';
});

// =============================================
// PASSWORD GENERATOR
// =============================================
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function generatePassword() {
  let charset = '';
  if (includeUppercase.checked) charset += UPPERCASE;
  if (includeLowercase.checked) charset += LOWERCASE;
  if (includeNumbers.checked) charset += NUMBERS;
  if (includeSymbols.checked) charset += SYMBOLS;

  if (charset === '') {
    alert('Select at least one character type');
    return '';
  }

  const length = parseInt(passwordLength.value);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

function updateStrength(password) {
  let strength = 0;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  let level = 'weak';
  if (strength >= 4) level = 'strong';
  else if (strength >= 3) level = 'medium';
  else if (strength >= 5) level = 'very-strong';

  strengthBar.dataset.strength = level;
  strengthText.textContent = level.charAt(0).toUpperCase() + level.slice(1);
  if (level === 'very-strong') strengthText.textContent = 'Very Strong';
}

function refreshPassword() {
  const pwd = generatePassword();
  generatedPassword.value = pwd;
  updateStrength(pwd);
  if (historyEnabled && pwd) {
    passwordHistory.unshift(pwd);
    if (passwordHistory.length > 10) passwordHistory.pop();
    renderHistory();
  }
}

function renderHistory() {
  if (passwordHistory.length === 0) {
    passwordHistoryList.innerHTML = '<div class="history-item">No history</div>';
    return;
  }
  passwordHistoryList.innerHTML = passwordHistory.map(p => `<div class="history-item"><span>${p}</span><button class="copy-history" data-pwd="${p}">📋</button></div>`).join('');
  document.querySelectorAll('.copy-history').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.pwd);
    });
  });
}

passwordLength.addEventListener('input', () => {
  lengthValue.textContent = passwordLength.value;
});

generatePasswordBtn.addEventListener('click', refreshPassword);
copyPasswordBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(generatedPassword.value);
  alert('Password copied!');
});

enableHistory.addEventListener('change', (e) => {
  historyEnabled = e.target.checked;
  passwordHistoryList.classList.toggle('hidden', !historyEnabled);
  clearHistoryBtn.classList.toggle('hidden', !historyEnabled);
  if (!historyEnabled) passwordHistory = [];
  else renderHistory();
});

clearHistoryBtn.addEventListener('click', () => {
  passwordHistory = [];
  renderHistory();
});

// Initialize password
refreshPassword();

// =============================================
// LINK CHECKER
// =============================================
async function checkLink(url) {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-cache' });
    clearTimeout(timeoutId);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    return { ok: response.ok, status: response.status, duration };
  } catch (err) {
    return { ok: false, status: err.name === 'AbortError' ? 'Timeout' : 'Network Error', duration: 0 };
  }
}

checkLinkBtn.addEventListener('click', async () => {
  let url = linkUrlInput.value.trim();
  if (!url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  statusIndicator.className = 'status-indicator';
  statusText.textContent = 'Checking...';
  const result = await checkLink(url);
  if (result.ok) {
    statusIndicator.classList.add('success');
    statusText.textContent = `✅ Reachable (HTTP ${result.status}) · ${result.duration}ms`;
  } else {
    statusIndicator.classList.add('error');
    statusText.textContent = `❌ ${result.status}`;
  }
});

// =============================================
// QR CODE GENERATOR
// =============================================
generateQrBtn.addEventListener('click', () => {
  const text = qrUrlInput.value.trim();
  if (!text) return;

  qrPlaceholder.style.display = 'none';
  qrCanvas.style.display = 'block';
  QRCode.toCanvas(qrCanvas, text, { width: 200, margin: 2 }, (error) => {
    if (error) {
      alert('Failed to generate QR code');
      qrCanvas.style.display = 'none';
      qrPlaceholder.style.display = 'flex';
    } else {
      downloadQrBtn.disabled = false;
    }
  });
});

downloadQrBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'qrcode.png';
  link.href = qrCanvas.toDataURL();
  link.click();
});

// =============================================
// INITIAL RENDER
// =============================================
renderCategories();
renderBookmarks();

// Re-attach sortable for bookmarks (drag-and-drop)
new Sortable(bookmarksContainer, {
  animation: 150,
  ghostClass: 'sortable-ghost',
  onEnd: function(evt) {
    // Update order in bookmarks array based on current category
    const cards = [...bookmarksContainer.querySelectorAll('.bookmark-card')];
    const newOrderIds = cards.map(card => card.dataset.id);
    const categoryBookmarks = bookmarks.filter(b => b.category === currentCategory);
    const otherBookmarks = bookmarks.filter(b => b.category !== currentCategory);
    const reordered = newOrderIds.map(id => categoryBookmarks.find(b => b.id === id)).filter(b => b);
    bookmarks = [...otherBookmarks, ...reordered];
    saveToStorage();
  }
});
