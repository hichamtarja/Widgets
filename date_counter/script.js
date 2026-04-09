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
const runner = document.querySelector(".runner");

let countdownInterval;

// Number animation
function animateValue(element, value){
  element.classList.add("tick");
  setTimeout(()=> element.classList.remove("tick"),300);
  element.textContent = value;
}

// Start Button
startBtn.addEventListener('click', () => {

  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);

  if(!startInput.value || !endInput.value) { alert("Please enter dates!"); return; }
  if(isNaN(startDate) || isNaN(endDate)) { alert("Invalid dates!"); return; }

  inputSection.style.display = "none";
  counterSection.style.display = "block";

  // Title
  const title = titleInput.value.trim();
  if(title==="") counterTitle.style.display="none";
  else { counterTitle.style.display="block"; counterTitle.textContent = title; }

  // Dates
  displayStart.textContent = startDate.toDateString();
  displayEnd.textContent = endDate.toDateString();

  // Quote
  const quote = quoteInput.value.trim();
  if(quote==="") displayQuote.style.display="none";
  else { displayQuote.style.display="block"; displayQuote.textContent = "“ "+quote+" ”"; }

  // Start countdown
  updateCountdown(startDate, endDate);
  clearInterval(countdownInterval);
  countdownInterval = setInterval(()=> updateCountdown(startDate,endDate),1000);
});

// Reset Button
resetBtn.addEventListener('click', () => {
  clearInterval(countdownInterval);
  inputSection.style.display="block";
  counterSection.style.display="none";
  titleInput.value=""; startInput.value=""; endInput.value=""; quoteInput.value="";
});

// Countdown Function
function updateCountdown(start,end){
  const now = new Date();
  let diff = end - now;

  if(diff<=0){
    diff=0;
    clearInterval(countdownInterval);
    document.getElementById("countdown").innerHTML = `<h2 style="color:#ff6a00;">⏳ Time's Up!</h2>`;
    progressFill.style.width="100%";
    runner.style.left="100%";
    return;
  }

  const totalSeconds = Math.floor(diff/1000);
  const years = Math.floor(totalSeconds / (365*24*3600));
  const months = Math.floor((totalSeconds % (365*24*3600)) / (30*24*3600));
  const weeks = Math.floor((totalSeconds % (30*24*3600)) / (7*24*3600));
  const days = Math.floor((totalSeconds % (7*24*3600)) / (24*3600));
  const hours = Math.floor((totalSeconds % (24*3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600)/60);
  const seconds = totalSeconds % 60;

  // Animate numbers
  animateValue(yearsSpan, years);
  animateValue(monthsSpan, months);
  animateValue(weeksSpan, weeks);
  animateValue(daysSpan, days);
  animateValue(hoursSpan, hours);
  animateValue(minutesSpan, minutes);
  animateValue(secondsSpan, seconds);

  // Glow panels if < 1 day
  if(diff < 86400000){
    document.querySelectorAll("#countdown div").forEach(d=>d.classList.add("danger"));
  } else {
    document.querySelectorAll("#countdown div").forEach(d=>d.classList.remove("danger"));
  }

  // Progress bar & runner
  const totalDuration = end-start;
  const elapsed = now-start;
  let progress = (elapsed/totalDuration)*100;
  progress = Math.max(0,Math.min(100,progress));
  progressFill.style.width = progress+"%";
  runner.style.left = progress+"%";
}
