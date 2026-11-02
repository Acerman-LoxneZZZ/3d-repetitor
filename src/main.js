import { applyContent } from './content.js';
import { initMotion } from './motion.js';
import { initLesson } from './lesson.js';
import { initContact } from './contact.js';
import { initGallery } from './gallery.js';
import { initLessonFocus } from './lesson-focus.js';

const root = document.documentElement;
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* optional */ } },
};
root.dataset.theme = storage.get('math-theme') === 'red' ? 'red' : 'light';

function initNameFit() {
  const hero = document.querySelector('.hero');
  const heroName = document.querySelector('.hero-name');
  if (heroName) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fit = () => {
      if (!context) return;
      context.font = '450 100px Manrope';
      const text = heroName.textContent;
      const measured = context.measureText(text).width - Math.max(0, [...text].length - 1) * 4;
      const available = heroName.clientWidth;
      if (!available || !measured) return;
      heroName.style.fontSize = `${Math.min(235, innerWidth * .14, innerWidth >= 768 ? hero.clientHeight * .22 : Infinity, (available - 4) / measured * 100)}px`;
    };
    document.fonts?.ready.then(fit);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(document.querySelector('.hero'));
    else window.addEventListener('resize', fit, { passive: true });
    fit();
  }
}

function initTheme(motion) {
  const button = document.querySelector('[data-theme-toggle]');
  function reflect() {
    const red = root.dataset.theme === 'red';
    if (button) { button.setAttribute('aria-pressed', String(red));button.setAttribute('aria-label', red ? 'Включить светлую тему' : 'Включить красную тему'); }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', red ? '#c22127' : '#85898a');
  }
  reflect();
  let transition;
  let wipe;
  let chosen = root.dataset.theme;
  let request = 0;
  button?.addEventListener('click', async event => {
    const currentRequest = ++request;
    const next = chosen === 'red' ? 'light' : 'red';
    chosen = next;
    storage.set('math-theme', next);
    const update = () => { if (currentRequest === request) { root.dataset.theme = next;reflect(); } };
    if (!motion.enabled || !document.startViewTransition) { update();return; }
    transition?.skipTransition();
    const rect = button.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    transition = document.startViewTransition(update);
    try { await transition.ready;if (currentRequest !== request) return;wipe = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }); } catch { update(); }
  });
  new MutationObserver(() => { if (!motion.enabled) { transition?.skipTransition();wipe?.cancel();root.dataset.theme = chosen;reflect(); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
}

function initMenu(motion) {
  const dialog = document.querySelector('#site-menu');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (!dialog || !toggle) return;
  const panel = dialog.querySelector('.menu-panel');
  const gsap = motion.gsap;
  let animation;
  let closing;
  let closeResolve;
  const finishClose = () => { dialog.close();document.body.classList.remove('menu-is-open');toggle.setAttribute('aria-expanded', 'false');gsap?.set(panel, { clearProps: 'all' });closing = null;const resolve = closeResolve;closeResolve = null;resolve?.(); };
  function close() {
    if (!dialog.open) return Promise.resolve();
    if (closing) return closing;
    animation?.kill();
    if (!motion.enabled || !gsap) { finishClose();return Promise.resolve(); }
    closing = new Promise(resolve => { closeResolve = resolve;animation = gsap.to(panel, { xPercent: 110, borderTopLeftRadius: '35%', borderBottomLeftRadius: '35%', duration: .6, ease: 'power4.inOut', onComplete: finishClose }); });
    return closing;
  }
  toggle.addEventListener('click', () => {
    if (dialog.open) { close();return; }
    animation?.kill();dialog.showModal();document.body.classList.add('menu-is-open');toggle.setAttribute('aria-expanded', 'true');
    if (motion.enabled && gsap) {
      animation = gsap.timeline();
      animation.fromTo(panel, { xPercent: 110, borderTopLeftRadius: '35%', borderBottomLeftRadius: '35%' }, { xPercent: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, duration: .9, ease: 'power4.inOut' })
        .fromTo(dialog.querySelectorAll('nav a'), { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: .65, stagger: .07, ease: 'power3.out' }, .25);
    }
  });
  dialog.querySelector('[data-menu-close]').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault();close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.querySelectorAll('nav a').forEach(link => link.addEventListener('click', async event => {
    const id = link.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();await close();
    history.pushState(null, '', id);target.scrollIntoView({ behavior: motion.enabled ? 'smooth' : 'instant' });
    target.setAttribute('tabindex', '-1');target.focus({ preventScroll: true });target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }));
  const hero = document.querySelector('.hero');
  if (hero) {
    // Two boundaries leave a quiet band, so tiny scroll reversals do not flicker the control.
    const show = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) toggle.classList.add('is-visible'); }, { rootMargin: '24px 0px 0px 0px' });
    const hide = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) toggle.classList.remove('is-visible'); }, { rootMargin: '-70px 0px 0px 0px' });
    show.observe(hero);hide.observe(hero);
  }
  window.addEventListener('pagehide', () => { animation?.kill();if (dialog.open) finishClose(); });
  new MutationObserver(() => {
    if (motion.enabled || !dialog.open) return;
    animation?.kill();
    if (closing) finishClose();
    else { gsap?.set(panel, { clearProps: 'all' });gsap?.set(dialog.querySelectorAll('nav a'), { clearProps: 'transform,opacity' });panel.style.borderRadius = '0'; }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
}

function initFAQ(motion) {
  document.querySelectorAll('.faq-item').forEach(details => {
    const summary = details.querySelector('summary');
    const content = details.querySelector('.faq-answer');
    summary.setAttribute('aria-expanded', String(details.open));
    content.id ||= `faq-answer-${Math.random().toString(36).slice(2, 8)}`;
    summary.setAttribute('aria-controls', content.id);
    let animation;
    let intended = details.open;
    summary.addEventListener('click', event => {
      if (!motion.enabled || !details.animate) return;
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      animation?.cancel();
      intended = !intended;
      details.open = true;
      const end = summary.offsetHeight + (intended ? content.offsetHeight : 0);
      summary.setAttribute('aria-expanded', String(intended));
      animation = details.animate({ height: [`${start}px`, `${end}px`] }, { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
      animation.onfinish = () => { details.open = intended;animation = null;motion.refresh(); };
    });
    details.addEventListener('toggle', () => { if (!animation) { intended = details.open;summary.setAttribute('aria-expanded', String(details.open));motion.refresh(); } });
  });
}

function initPageTransitions(motion) {
  let curtain = document.querySelector('[data-curtain]');
  if (!curtain) { curtain = document.createElement('div');curtain.className = 'transition-curtain';curtain.dataset.curtain = '';curtain.hidden = true;curtain.setAttribute('aria-hidden', 'true');document.body.append(curtain); }
  let navigating = false;
  const reset = () => { navigating = false;curtain.hidden = true;motion.gsap?.killTweensOf(curtain);motion.gsap?.set(curtain, { clearProps: 'all' }); };
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-transition]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || link.target === '_blank') return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search) || !motion.enabled) return;
    if (!motion.gsap) return;
    event.preventDefault();if (navigating) return;navigating = true;
    try { sessionStorage.setItem('math-page-transition', 'true'); } catch { /* optional */ }
    curtain.hidden = false;
    motion.gsap.fromTo(curtain, { yPercent: 100, borderRadius: '50% 50% 0 0 / 20% 20% 0 0' }, { yPercent: 0, borderRadius: 0, duration: .55, ease: 'power4.inOut', onComplete: () => location.assign(url.href) });
  });
  try {
    if (sessionStorage.getItem('math-page-transition') === 'true') {
      sessionStorage.removeItem('math-page-transition');
      const target = location.hash ? document.querySelector(location.hash) : document.querySelector('h1');
      target?.setAttribute('tabindex', '-1');target?.focus({ preventScroll: true });
      if (motion.enabled && motion.gsap) {
        if (root.classList.contains('page-entering')) {
          curtain.hidden = true;
          getComputedStyle(root, '::after').transform;
          requestAnimationFrame(() => root.classList.add('page-revealing'));
          let finished = false;
          const finishReveal = event => {
            if (finished || (event && (event.pseudoElement !== '::after' || event.propertyName !== 'transform'))) return;
            finished = true;root.removeEventListener('transitionend', finishReveal);
            root.classList.remove('page-entering', 'page-revealing');
          };
          root.addEventListener('transitionend', finishReveal);
          setTimeout(() => finishReveal(), 850);
        } else {
          curtain.hidden = false;motion.gsap.fromTo(curtain, { yPercent: 0 }, { yPercent: -105, duration: .65, ease: 'power4.inOut', onComplete: reset });
        }
      } else root.classList.remove('page-entering', 'page-revealing');
    }
  } catch { reset(); }
}

applyContent(document);
initNameFit();
initLesson();
initContact();
const motion = initMotion();
initTheme(motion);
initMenu(motion);
initFAQ(motion);
initPageTransitions(motion);
initGallery(motion);
initLessonFocus(motion);
root.classList.add('app-ready');
