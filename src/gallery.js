/** Portfolio-style filtering; real links stay available with or without animation. */
export function initGallery(motion) {
  const section = document.querySelector('#materials');
  if (!section || section.dataset.galleryReady) return;
  section.dataset.galleryReady = 'true';
  const rows = [...section.querySelectorAll('[data-material-row]')];
  const cards = [...section.querySelectorAll('[data-material-category]')];
  const filters = [...section.querySelectorAll('[data-material-filter-button]')];
  const bar = section.querySelector('[data-material-filters]');
  const status = section.querySelector('[data-gallery-status]');
  const previous = section.querySelector('[data-gallery-prev]');
  const next = section.querySelector('[data-gallery-next]');
  const animations = new Set();
  const chartPaths = new Map();
  const matches = (card, filter) => filter === 'all' || card.dataset.materialCategory === filter;

  const updateArrows = () => {
    const visibleRows = rows.filter(row => !row.hidden);
    if (previous) previous.disabled = visibleRows.every(row => row.scrollLeft < 2);
    if (next) next.disabled = visibleRows.every(row => row.scrollLeft >= row.scrollWidth - row.clientWidth - 2);
  };
  const cancelAnimations = () => {
    animations.forEach(animation => animation.cancel());animations.clear();
    chartPaths.forEach((animation, path) => { animation.cancel();path.style.removeProperty('stroke-dasharray');path.style.removeProperty('stroke-dashoffset'); });
    chartPaths.clear();
  };
  const clearCardMotion = card => {
    card.style.removeProperty('--card-tilt-x');card.style.removeProperty('--card-tilt-y');card.style.removeProperty('--card-lift');
    const path = card.querySelector('.chart-curve');
    const animation = path && chartPaths.get(path);
    if (animation) { animation.cancel();chartPaths.delete(path);path.style.removeProperty('stroke-dasharray');path.style.removeProperty('stroke-dashoffset'); }
  };
  const drawChart = card => {
    const path = card.querySelector('.chart-curve');
    if (!path?.animate || !path.getTotalLength) return;
    const previous = chartPaths.get(path);
    previous?.cancel();
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}px`;
    path.style.strokeDashoffset = `${length}px`;
    const animation = path.animate([{ strokeDashoffset: `${length}px`, strokeWidth: 2.2 }, { strokeDashoffset: '0px', strokeWidth: 3.8 }], { duration: 720, easing: 'cubic-bezier(.22,1,.36,1)' });
    chartPaths.set(path, animation);animations.add(animation);
    animation.onfinish = () => { if (chartPaths.get(path) !== animation) return;chartPaths.delete(path);animations.delete(animation);path.style.removeProperty('stroke-dasharray');path.style.removeProperty('stroke-dashoffset'); };
    animation.oncancel = () => animations.delete(animation);
  };
  const animate = (card, keyframes) => {
    if (!motion.enabled || !card.animate) return;
    const animation = card.animate(keyframes, { duration: 430, easing: 'cubic-bezier(.22,1,.36,1)' });
    animations.add(animation);
    animation.onfinish = () => animations.delete(animation);
    animation.oncancel = () => animations.delete(animation);
  };
  const choose = (filter, announce = true) => {
    const before = new Map(cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
    cancelAnimations();
    section.dataset.materialFilter = filter;
    cards.forEach(card => { card.hidden = !matches(card, filter); });
    rows.forEach(row => {
      row.hidden = !cards.some(card => row.contains(card) && !card.hidden);
      row.scrollTo({ left: 0, behavior: 'instant' });
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.materialFilterButton === filter)));
    if (announce && status) {
      const label = filters.find(button => button.dataset.materialFilterButton === filter)?.querySelector('[data-filter-label]')?.textContent;
      status.textContent = `${label}. Материалов: ${cards.filter(card => !card.hidden).length}.`;
    }
    cards.filter(card => !card.hidden).forEach(card => {
      const old = before.get(card);
      const current = card.getBoundingClientRect();
      animate(card, old
        ? [{ transform: `translate(${old.left - current.left}px,${old.top - current.top}px)`, opacity: 1 }, { transform: 'translate(0,0)', opacity: 1 }]
        : [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]);
    });
    updateArrows();
    requestAnimationFrame(() => motion.refresh());
  };
  filters.forEach((button, index) => {
    const count = cards.filter(card => matches(card, button.dataset.materialFilterButton)).length;
    button.querySelector('[data-filter-count]').textContent = count;
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') !== 'true') choose(button.dataset.materialFilterButton);
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? filters.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + filters.length) % filters.length;
      filters[target].focus();choose(filters[target].dataset.materialFilterButton);
    });
  });
  const slide = direction => rows.filter(row => !row.hidden).forEach(row => {
    const card = row.querySelector('[data-material-category]:not([hidden])');
    const distance = card ? card.getBoundingClientRect().width + 16 : row.clientWidth;
    row.scrollBy({ left: direction * distance, behavior: motion.enabled ? 'smooth' : 'instant' });
  });
  previous?.addEventListener('click', () => slide(-1));
  next?.addEventListener('click', () => slide(1));
  cards.forEach(card => {
    card.addEventListener('pointerenter', event => {
      if (!motion.enabled || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      drawChart(card);
    });
    card.addEventListener('pointermove', event => {
      if (!motion.enabled || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * 2 - 1;
      const y = (event.clientY - rect.top) / rect.height * 2 - 1;
      card.style.setProperty('--card-tilt-x', `${-y * 5.5}deg`);
      card.style.setProperty('--card-tilt-y', `${x * 8.5}deg`);
      card.style.setProperty('--card-lift', '-16px');
    });
    card.addEventListener('pointerleave', () => clearCardMotion(card));
  });
  rows.forEach(row => row.addEventListener('scroll', updateArrows, { passive: true }));
  new ResizeObserver(updateArrows).observe(section);
  new MutationObserver(() => { if (!motion.enabled) { cancelAnimations();cards.forEach(clearCardMotion); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => { cancelAnimations();cards.forEach(clearCardMotion); });
  if (bar) bar.hidden = false;
  updateArrows();
}
