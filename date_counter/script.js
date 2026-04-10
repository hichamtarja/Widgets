// ---------- ELEMENTS ----------
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
const runner = document.querySelector(".runner");
const progressContainer = document.querySelector(".progress-container");

const addMsBtn = document.getElementById("add-milestone-btn");
const modal = document.getElementById("milestone-modal");
const closeModal = document.querySelector(".modal .close");
const msTitle = document.getElementById("ms-title");
const msStart = document.getElementById("ms-start");
const msEnd = document.getElementById("ms-end");
const msSave = document.getElementById("ms-save");

// ---------- STATE ----------
let countdownInterval;
let milestones = [];
let showMilestoneMode = false;

// ---------- ANIMATION ----------
function animateValue(element, value){
  element.classList.add("tick");
  setTimeout(()=> element.classList.remove("tick"),300);
  element.textContent = value;
}

// ---------- START ----------
startBtn.addEventListener('click', () => {

  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);

  if(!startInput.value || !endInput.value){
    alert("Enter dates!");
    return;
  }

  if(isNaN(startDate) || isNaN(endDate)){
    alert("Invalid dates!");
    return;
  }

  inputSection.style.display = "none";
  counterSection.style.display = "block";

  // Title
  const title = titleInput.value.trim();
  if(title==="") counterTitle.style.display="none";
  else {
    counterTitle.style.display="block";
    counterTitle.textContent = title;
  }

  // Dates
  displayStart.textContent = startDate.toDateString();
  displayEnd.textContent = endDate.toDateString();

  // Quote
  const quote = quoteInput.value.trim();
  if(quote==="") displayQuote.style.display="none";
  else {
    displayQuote.style.display="block";
    displayQuote.textContent = "“ " + quote + " ”";
  }

  renderStartEndFlags();
  renderMilestones();

  updateCountdown(startDate,endDate);

  clearInterval(countdownInterval);
  countdownInterval = setInterval(()=> updateCountdown(startDate,endDate),1000);
});

// ---------- RESET ----------
resetBtn.addEventListener('click', () => {
  clearInterval(countdownInterval);

  inputSection.style.display="block";
  counterSection.style.display="none";

  milestones = [];

  document.querySelectorAll(".flag, .ms-pin").forEach(el=>el.remove());

  titleInput.value="";
  startInput.value="";
  endInput.value="";
  quoteInput.value="";
});

// ---------- COUNTDOWN ----------
function updateCountdown(start,end){
  const now = new Date();

  let target = end;

  if(showMilestoneMode && milestones.length > 0){
    const future = milestones
      .map(m => m.start)
      .filter(d => d > now)
      .sort((a,b)=>a-b);

    if(future.length > 0){
      target = future[0];
    }
  }

  let diff = target - now;
  if(diff < 0) diff = 0;

  const totalSeconds = Math.floor(diff/1000);

  const years = Math.floor(totalSeconds / (365*24*3600));
  const months = Math.floor((totalSeconds % (365*24*3600)) / (30*24*3600));
  const weeks = Math.floor((totalSeconds % (30*24*3600)) / (7*24*3600));
  const days = Math.floor((totalSeconds % (7*24*3600)) / (24*3600));
  const hours = Math.floor((totalSeconds % (24*3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600)/60);
  const seconds = totalSeconds % 60;

  animateValue(yearsSpan, years);
  animateValue(monthsSpan, months);
  animateValue(weeksSpan, weeks);
  animateValue(daysSpan, days);
  animateValue(hoursSpan, hours);
  animateValue(minutesSpan, minutes);
  animateValue(secondsSpan, seconds);

  // Progress
  const totalDuration = end-start;
  const elapsed = now-start;
  let progress = (elapsed/totalDuration)*100;

  progress = Math.max(0,Math.min(100,progress));

  progressFill.style.width = progress+"%";
  runner.style.left = progress+"%";
}

// ---------- TOGGLE ----------
document.getElementById("countdown").addEventListener("click", ()=>{
  if(milestones.length === 0) return;
  showMilestoneMode = !showMilestoneMode;
});

// ---------- FLAGS ----------
function renderStartEndFlags(){
  document.querySelectorAll(".flag-start, .flag-end").forEach(f=>f.remove());

  const startFlag = document.createElement("div");
  startFlag.className = "flag flag-start";
  startFlag.style.left = "0%";
  startFlag.innerHTML = `<span class="flag-tooltip">Start</span>🚩`;

  const endFlag = document.createElement("div");
  endFlag.className = "flag flag-end";
  endFlag.style.left = "100%";
  endFlag.innerHTML = `<span class="flag-tooltip">End</span>🚩`;

  progressContainer.appendChild(startFlag);
  progressContainer.appendChild(endFlag);
}

// ---------- RANDOM COLOR ----------
function randomColor(){
  const colors = ["#ff6a00","#ee0979","#00c6ff","#00ff94","#ffd700","#9b59b6"];
  return colors[Math.floor(Math.random()*colors.length)];
}

// ---------- MODAL ----------
addMsBtn.addEventListener("click", ()=> modal.style.display="flex");
closeModal.addEventListener("click", ()=> modal.style.display="none");

window.addEventListener("click", (e)=>{
  if(e.target === modal) modal.style.display="none";
});

// ---------- SAVE MILESTONE ----------
msSave.addEventListener("click", ()=>{
  const title = msTitle.value.trim();
  const start = new Date(msStart.value);
  const end = new Date(msEnd.value);

  if(!title || isNaN(start.getTime()) || isNaN(end.getTime())){
    alert("Fill all fields correctly!");
    return;
  }

  milestones.push({
    title,
    start,
    end,
    color: randomColor()
  });

  renderMilestones();

  modal.style.display="none";
  msTitle.value="";
  msStart.value="";
  msEnd.value="";
});

// ---------- RENDER ----------
function renderMilestones(){
  document.querySelectorAll(".ms-pin").forEach(el=>el.remove());

  const mainStart = new Date(startInput.value);
  const mainEnd = new Date(endInput.value);
  const totalDuration = mainEnd - mainStart;

  let stack = {};

  milestones.forEach(ms=>{
    const perc = ((ms.start - mainStart)/totalDuration)*100;

    const key = Math.round(perc);
    if(!stack[key]) stack[key]=0;
    stack[key]++;

    const pin = document.createElement("div");
    pin.className = "ms-pin";
    pin.style.left = perc + "%";
    pin.style.bottom = (stack[key]*20) + "px";

    pin.innerHTML = `
      <div class="pin-line"></div>
      <div class="pin-dot" style="background:${ms.color}"></div>
      <span class="flag-tooltip">${ms.title}</span>
    `;

    progressContainer.appendChild(pin);
  });
}
