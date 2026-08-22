// 自動更新頁尾年份
document.getElementById("year").textContent = new Date().getFullYear();

// 導覽列連結平滑捲動
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// 語錄輪播：自動播放 + 按鈕 + 手機滑動
(function initQuoteCarousel() {
  const carousel = document.getElementById('quote-carousel');
  const track = document.getElementById('quote-track');
  const dotsWrap = document.getElementById('carousel-dots');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (!carousel || !track) return;

  const slides = Array.from(track.children);
  let index = 0;
  let autoTimer = null;
  const AUTO_MS = 4000;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `第 ${i + 1} 張`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }
  function goTo(i) {
    index = (i + slides.length) % slides.length;
    update();
    restartAuto();
  }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }
  function startAuto() { autoTimer = setInterval(next, AUTO_MS); }
  function stopAuto() { clearInterval(autoTimer); }
  function restartAuto() { stopAuto(); startAuto(); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);

  let startX = 0;
  let isDragging = false;
  track.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    stopAuto();
  });
  track.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.clientX - startX;
    if (diff > 40) prev();
    else if (diff < -40) next();
    startAuto();
  });
  track.addEventListener('pointerleave', () => { isDragging = false; });

  update();
  startAuto();
})();

// 星空背景：隨機分布星星並讓它們微微閃爍
(function initStarfield() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createStars();
  }

  function createStars() {
    const count = Math.floor((canvas.width * canvas.height) / 8000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.4 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.3,
      speed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
      const twinkle = reduceMotion ? 0 : Math.sin(time * star.speed + star.phase) * 0.3;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(237, 237, 242, ${Math.max(0, star.baseAlpha + twinkle)})`;
      ctx.fill();
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();
