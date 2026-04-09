// Navigation to widget pages
function goTo(url) {
  window.location.href = url;
}

// Optional: update badge dynamically (example for streak)
const streakBadge = document.getElementById('streak-badge');
if(streakBadge){
  let streakDays = 3; // this could be dynamically fetched from your streak widget in the future
  streakBadge.textContent = `${streakDays} days`;
}

// Optional: randomly move floating emojis
const floatingEmojis = document.querySelectorAll('.floating span');
floatingEmojis.forEach((el, i) => {
  el.style.left = `${Math.random() * window.innerWidth}px`;
  el.style.animationDelay = `${Math.random() * 5}s`;
});
