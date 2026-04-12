/**
 * Polished Image Slider
 * - Dot indicators with click navigation
 * - Slide counter
 * - Pause auto-slide on hover
 * - Keyboard arrow support
 * - Smooth transitions
 */

document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');
  const currentSpan = document.getElementById('current-slide');
  const totalSpan = document.getElementById('total-slides');
  const dotsContainer = document.getElementById('dots-container');
  const slider = document.getElementById('slider');

  let currentIndex = 0;
  const totalSlides = slides.length;
  let autoSlideInterval = null;
  const AUTO_SLIDE_DELAY = 4000;

  // Update total slides display
  totalSpan.textContent = totalSlides;

  // Create dot indicators
  function createDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.classList.add('dot');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
    updateDots();
  }

  // Update active dot
  function updateDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  }

  // Show slide by index
  function goToSlide(index) {
    // Remove active class from all slides
    slides.forEach(slide => slide.classList.remove('active'));
    // Add active class to current slide
    slides[index].classList.add('active');
    currentIndex = index;
    
    // Update counter
    currentSpan.textContent = currentIndex + 1;
    
    // Update dots
    updateDots();
  }

  // Next slide
  function nextSlide() {
    const newIndex = (currentIndex + 1) % totalSlides;
    goToSlide(newIndex);
  }

  // Previous slide
  function prevSlide() {
    const newIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    goToSlide(newIndex);
  }

  // Auto slide control
  function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextSlide, AUTO_SLIDE_DELAY);
  }

  function stopAutoSlide() {
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
    }
  }

  // Event listeners
  nextBtn.addEventListener('click', () => {
    nextSlide();
    stopAutoSlide();
    startAutoSlide(); // restart timer after manual interaction
  });

  prevBtn.addEventListener('click', () => {
    prevSlide();
    stopAutoSlide();
    startAutoSlide();
  });

  // Pause auto-slide on hover
  slider.addEventListener('mouseenter', stopAutoSlide);
  slider.addEventListener('mouseleave', startAutoSlide);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
      stopAutoSlide();
      startAutoSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
      stopAutoSlide();
      startAutoSlide();
    }
  });

  // Touch swipe support (basic)
  let touchStartX = 0;
  let touchEndX = 0;

  slider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoSlide();
  }, { passive: true });

  slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoSlide();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      nextSlide();
    } else if (touchEndX > touchStartX + swipeThreshold) {
      prevSlide();
    }
  }

  // Initialize
  createDots();
  goToSlide(0); // Ensure first slide is active
  startAutoSlide();

  // Cleanup interval on page unload (optional)
  window.addEventListener('beforeunload', () => stopAutoSlide());
});
