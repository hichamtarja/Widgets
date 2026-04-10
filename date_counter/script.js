// Elements
const inputSection = document.getElementById('input-section');
const counterSection = document.getElementById('counter-section');

const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');

const titleInput = document.getElementById('title');
const startInput = document.getElementById('start-date');
const endInput = document.getElementById('end-date');
const quoteInput = document.getElementById('quote');

const counterTitle = document.getElementById('counter-title');
const displayStart = document.getElementById('display-start');
const displayEnd = document.getElementById('display-end');
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

let countdownInterval = null;
let milestones = [];
let showingMilestoneView = false;

injectRunnerAnimationStyle();

// Number animation
function animateValue(element, value) {
  element.classList.add('tick');
  setTimeout(() => element.classList.remove('tick'), 300);
  element.textContent = value;
}

function getTimeParts(totalMilliseconds) {
  const totalSeconds = Math.max(0, Math.floor(totalMilliseconds / 1000));

  const years = Math.floor(totalSeconds / (365 * 24 * 3600));
  const months = Math.floor((totalSeconds % (365 * 24 * 3600)) / (30 * 24 * 3600));
  const weeks = Math.floor((totalSeconds % (30 * 24 * 3600)) / (7 * 24 * 3600));
  const days = Math.floor((totalSeconds % (7 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { years, months, weeks, days, hours, minutes, seconds };
}

function getRandomMilestonePalette() {
  const hue = Math.floor(Math.random() * 360);
  return {
    start: `hsl(${hue}, 85%, 60%)`,
    end: `hsl(${(hue + 35) % 360}, 85%, 68%)`
  };
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[ch] || ch;
  });
}

function ensureMilestoneView() {
  let view = document.getElementById('milestone-view');

  if (!view) {
    view = document.createElement('div');
    view.id = 'milestone-view';
    Object.assign(view.style, {
      display: 'none',
      marginTop: '18px',
      padding: '18px',
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'center',
      cursor: 'pointer',
      userSelect: 'none'
    });

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
    Object.assign(msg.style, {
      display: 'none',
      marginTop: '18px',
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(255,106,0,0.12)',
      border: '1px solid rgba(255,106,0,0.35)',
      textAlign: 'center',
      fontWeight: '700',
      color: '#ffb37a'
    });

    countdownDisplay.insertAdjacentElement('beforebegin', msg);
  }

  return msg;
}

function injectRunnerAnimationStyle() {
  if (document.getElementById('runner-anim-style')) return;

  const style = document.createElement('style');
  style.id = 'runner-anim-style';
  style.textContent = `
    @keyframes runnerBounce {
      0% { transform: translateY(0px) rotate(-2deg); }
      100% { transform: translateY(-4px) rotate(2deg); }
    }
  `;
  document.head.appendChild(style);
}

function renderStartEndFlags() {
  if (!progressContainer) return;

  document.querySelectorAll('.flag-start, .flag-end').forEach((el) => el.remove());

  const mainStart = new Date(startInput.value);
  const mainEnd = new Date(endInput.value);

  const startFlag = document.createElement('div');
  startFlag.classList.add('flag', 'flag-start');
  startFlag.style.left = '0px';
  startFlag.style.top = '-25px';
  startFlag.style.zIndex = '20';
  startFlag.innerHTML = `
    <span class="flag-anchor">🚩</span>
    <span class="flag-tooltip">Start: ${mainStart.toDateString()}</span>
  `;
  progressContainer.appendChild(startFlag);

  const endFlag = document.createElement('div');
  endFlag.classList.add('flag', 'flag-end');
  endFlag.style.left = 'auto';
  endFlag.style.right = '0px';
  endFlag.style.top = '-25px';
  endFlag.style.zIndex = '20';
  endFlag.innerHTML = `
    <span class="flag-anchor">🚩</span>
    <span class="flag-tooltip">End: ${mainEnd.toDateString()}</span>
  `;
  progressContainer.appendChild(endFlag);
}

function renderMilestones() {
  if (!progressContainer) return;

  document.querySelectorAll('.ms-pin').forEach((el) => el.remove());

  if (!milestones.length || !startInput.value || !endInput.value) return;

  const mainStart = new Date(startInput.value);
  const mainEnd = new Date(endInput.value);
  const totalDuration = mainEnd - mainStart;

  if (totalDuration <= 0) return;

  const stackCounts = {};

  milestones
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title))
    .forEach((ms) => {
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
  pin.title =
    kind === 'start'
      ? `${ms.title} Start: ${ms.start.toDateString()}`
      : `${ms.title} End: ${ms.end.toDateString()}`;

  Object.assign(pin.style, {
    position: 'absolute',
    left: `calc(${percent}% )`,
    top: `${-6 - stackIndex * 16}px`,
    transform: 'translateX(-50%)',
    zIndex: `${20 + stackIndex}`,
    cursor: 'pointer'
  });

  const dotColor = kind === 'start' ? ms.colors.start : ms.colors.end;

  pin.innerHTML = `
    <div class="pin-line" style="background:${dotColor}"></div>
    <div class="pin-dot" style="background:${dotColor}; box-shadow: 0 0 12px ${dotColor};"></div>
    <span class="flag-tooltip">${kind === 'start' ? ms.title + ' Start' : ms.title + ' End'}</span>
  `;

  progressContainer.appendChild(pin);
}

  progressContainer.appendChild(dot);
}

function getNextMilestone(now = new Date()) {
  const upcoming = milestones
    .filter((ms) => ms.end > now)
    .sort((a, b) => a.end - b.end || a.start - b.start || a.title.localeCompare(b.title));

  return upcoming[0] || null;
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

  const remaining = Math.max(0, next.start - now);
  const parts = getTimeParts(remaining);

  view.innerHTML = `
    <div style="font-size:14px;opacity:.75;margin-bottom:8px;">Next milestone</div>
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
    countdownDisplay.style.display = 'none';
    view.style.display = 'block';
    updateMilestoneView(new Date());
  } else {
    view.style.display = 'none';
    countdownDisplay.style.display = 'flex';
  }
}

// Start Button
startBtn.addEventListener('click', () => {
  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);

  if (!startInput.value || !endInput.value) {
    alert('Please enter dates!');
    return;
  }

  if (isNaN(startDate) || isNaN(endDate)) {
    alert('Invalid dates!');
    return;
  }

  inputSection.style.display = 'none';
  counterSection.style.display = 'block';

  showingMilestoneView = false;

  const milestoneView = ensureMilestoneView();
  milestoneView.style.display = 'none';

  const deadlineMessage = ensureDeadlineMessage();
  deadlineMessage.style.display = 'none';

  countdownDisplay.style.display = 'flex';
  countdownDisplay.style.opacity = '1';

  // Title (optional)
  const title = titleInput.value.trim();
  if (title === '') {
    counterTitle.style.display = 'none';
  } else {
    counterTitle.style.display = 'block';
    counterTitle.textContent = title;
  }

  // Dates
  displayStart.textContent = startDate.toDateString();
  displayEnd.textContent = endDate.toDateString();

  // Quote (optional)
  const quote = quoteInput.value.trim();
  if (quote === '') {
    displayQuote.style.display = 'none';
  } else {
    displayQuote.style.display = 'block';
    displayQuote.textContent = `“ ${quote} ”`;
  }

  renderStartEndFlags();
  renderMilestones();

  updateCountdown(startDate, endDate);

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    updateCountdown(startDate, endDate);
  }, 1000);
});

// Reset Button
resetBtn.addEventListener('click', () => {
  clearInterval(countdownInterval);

  inputSection.style.display = 'block';
  counterSection.style.display = 'none';

  titleInput.value = '';
  startInput.value = '';
  endInput.value = '';
  quoteInput.value = '';

  milestones = [];
  showingMilestoneView = false;

  document.querySelectorAll('.flag-start, .flag-end, .ms-dot').forEach((el) => el.remove());

  const milestoneView = document.getElementById('milestone-view');
  if (milestoneView) {
    milestoneView.style.display = 'none';
    milestoneView.innerHTML = '';
  }

  const deadlineMessage = document.getElementById('deadline-message');
  if (deadlineMessage) {
    deadlineMessage.style.display = 'none';
    deadlineMessage.innerHTML = '';
  }

  countdownDisplay.style.display = 'flex';
  countdownDisplay.style.opacity = '1';
});

// Countdown Function
function updateCountdown(start, end) {
  const now = new Date();
  let diff = end - now;

  const deadlineMessage = ensureDeadlineMessage();

  if (diff <= 0) {
    diff = 0;
    clearInterval(countdownInterval);

    deadlineMessage.textContent = "⏳ Time's Up!";
    deadlineMessage.style.display = 'block';
    countdownDisplay.style.opacity = '0.35';
    progressFill.style.width = '100%';
    runner.style.left = '100%';
    runner.style.animation = 'runnerBounce 0.7s ease-in-out infinite alternate';
    return;
  }

  deadlineMessage.style.display = 'none';
  countdownDisplay.style.opacity = '1';

  const { years, months, weeks, days, hours, minutes, seconds } = getTimeParts(diff);

  animateValue(yearsSpan, years);
  animateValue(monthsSpan, months);
  animateValue(weeksSpan, weeks);
  animateValue(daysSpan, days);
  animateValue(hoursSpan, hours);
  animateValue(minutesSpan, minutes);
  animateValue(secondsSpan, seconds);

  // Glow panels if less than 1 day remains
  if (diff < 86400000) {
    document.querySelectorAll('#countdown div').forEach((d) => d.classList.add('danger'));
  } else {
    document.querySelectorAll('#countdown div').forEach((d) => d.classList.remove('danger'));
  }

  // Progress bar & runner
  const totalDuration = end - start;
  const elapsed = now - start;

  let progress = (elapsed / totalDuration) * 100;
  progress = Math.max(0, Math.min(100, progress));

  progressFill.style.width = progress + '%';
  runner.style.left = progress + '%';
  runner.style.animation = 'runnerBounce 0.7s ease-in-out infinite alternate';

  if (showingMilestoneView) {
    updateMilestoneView(now);
  }
}

// Milestone modal
const addMsBtn = document.getElementById('add-milestone-btn');
const modal = document.getElementById('milestone-modal');
const closeModal = document.querySelector('.modal .close');
const msTitle = document.getElementById('ms-title');
const msStart = document.getElementById('ms-start');
const msEnd = document.getElementById('ms-end');
const msSave = document.getElementById('ms-save');

if (addMsBtn && modal && closeModal && msTitle && msStart && msEnd && msSave) {
  addMsBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  msSave.addEventListener('click', () => {
    const title = msTitle.value.trim();
    const start = new Date(msStart.value);
    const end = new Date(msEnd.value);
    const mainStart = new Date(startInput.value);
    const mainEnd = new Date(endInput.value);

    if (!title || isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Fill all fields correctly!');
      return;
    }

    if (start < mainStart || end > mainEnd || start > end) {
      alert('Milestone must be within countdown start & end!');
      return;
    }

    const colors = getRandomMilestonePalette();

    milestones.push({
      title,
      start,
      end,
      colors
    });

    modal.style.display = 'none';
    msTitle.value = '';
    msStart.value = '';
    msEnd.value = '';

    renderMilestones();

    // If the user is currently looking at the milestone view, refresh it.
    if (showingMilestoneView) {
      updateMilestoneView(new Date());
    }
  });
}

// Click the counter to toggle next milestone view / back
countdownDisplay.addEventListener('click', toggleMilestoneView);
