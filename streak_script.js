let count = 0;

function updateUI() {
  const counter = document.getElementById("counter");
  const status = document.getElementById("status");

  counter.textContent = count;

  // 🔥 LEVEL SYSTEM (this is the magic)
  if (count === 0) {
    status.textContent = "Start your streak 🚀";
    counter.style.color = "#aaa";
  }

  else if (count < 5) {
    status.textContent = "Getting started...";
    counter.style.color = "#4caf50";
  }

  else if (count < 10) {
    status.textContent = "Nice consistency 👀";
    counter.style.color = "#00bcd4";
  }

  else if (count < 20) {
    status.textContent = "Impressive 🔥";
    counter.style.color = "#ff9800";
  }

  else if (count < 50) {
    status.textContent = "You're unstoppable 💪";
    counter.style.color = "#ff5722";
  }

  else {
    status.textContent = "LEGEND STATUS 👑";
    counter.style.color = "#ffd700";
  }
}

function increase() {
  count++;
  updateUI();
}

function decrease() {
  if (count > 0) {
    count--;
    updateUI();
  }
}

function reset() {
  count = 0;
  updateUI();
}

// Initialize
updateUI();