// 音量設定：儲存在瀏覽器裡，遊戲頁面會讀取這個設定
(function initVolumeControl() {
  const slider = document.getElementById('volume-slider');
  const valueLabel = document.getElementById('volume-value');
  if (!slider) return;

  const saved = localStorage.getItem('clubGameVolume');
  if (saved !== null) {
    slider.value = saved;
    valueLabel.textContent = saved + '%';
  }

  slider.addEventListener('input', () => {
    valueLabel.textContent = slider.value + '%';
    localStorage.setItem('clubGameVolume', slider.value);
  });
})();
