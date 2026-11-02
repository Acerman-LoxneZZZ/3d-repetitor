/** Shared motion lifecycle. All decorative work obeys OS preference, manual pause and page visibility. */
const read = (key, fallback = null) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage is optional */ } };

export function initMotion() {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  let paused = read('math-motion-paused') === 'true';
  let decorations;
  const cleanups = [];
  const interactionResets = [];
  const state = {
    get reduced() { return media.matches; },
    get paused() { return paused; },
    get enabled() { return !media.matches && !paused; },
    get pointer() { return pointer.matches && state.enabled; },
    gsap,
    refresh() { ScrollTrigger?.refresh(); },
  };

  function updateControls() {
    document.documentElement.classList.toggle('motion-paused', paused || media.matches);
    document.querySelectorAll('[data-motion-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(paused || media.matches));
      button.querySelector('span').textContent = media.matches ? 'Движение уменьшено' : paused ? 'Включить движение' : 'Остановить движение';
      button.disabled = media.matches;
      button.title = media.matches ? 'Уменьшенное движение включено в настройках устройства' : '';
    });
  }

  function rebuild() {
    decorations?.revert();
    cleanups.splice(0).forEach(fn => fn());
    updateControls();
    interactionResets.forEach(reset => reset());
    if (!state.enabled && gsap) {
      const parts = [...document.querySelectorAll('.hero-portrait img,.hero-intro,.hero-name')];
      if (parts.length) { gsap.killTweensOf(parts);gsap.set(parts, { clearProps: 'transform,opacity,visibility,clipPath' }); }
      document.querySelector('[data-intro]')?.setAttribute('hidden', '');
    }
    if (!state.enabled || !gsap || !ScrollTrigger) return;
    decorations = gsap.matchMedia();
    decorations.add({ wide: '(min-width: 768px)', galleryWide: '(min-width: 1101px)', fine: '(hover: hover) and (pointer: fine)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
      if (context.conditions.reduce) return;
      const { wide, galleryWide, fine } = context.conditions;
      const hero = document.querySelector('.hero');
      const portrait = document.querySelector('[data-hero-portrait]');
      const ribbon = document.querySelector('[data-ribbon]');
      const loops = [];
      const localCleanups = [];
      const loopEntries = [];
      const observeLoop = (element, tween, rootMargin = '0px') => {
        const entry = { tween, visible: false };loopEntries.push(entry);
        const observer = new IntersectionObserver(entries => entries.forEach(item => { entry.visible = item.isIntersecting;entry.visible && !document.hidden ? tween.resume() : tween.pause(); }), { rootMargin });
        observer.observe(element);localCleanups.push(() => observer.disconnect());
      };

      if (ribbon) {
        const tween = gsap.to(ribbon, { xPercent: -50, duration: wide ? 36 : 48, repeat: -1, ease: 'none', onReverseComplete() { this.totalTime(this.rawTime() + this.duration() * 100); } });
        tween.totalTime(tween.duration() * 100);
        loops.push(tween);
        ScrollTrigger.create({ trigger: hero || ribbon, start: 'top top', end: 'bottom top', onUpdate: self => {
          gsap.to(tween, { timeScale: self.direction === 1 ? 1 : -.65, duration: .8, overwrite: true });
        }});
        observeLoop(ribbon.parentElement, tween, '100px');
      }

      if (wide && hero && portrait) {
        gsap.to(portrait, { y: 65, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .8 } });
        if (fine) {
          const image = portrait.querySelector('picture');
          const moveX = gsap.quickTo(image, 'x', { duration: 1, ease: 'power3.out' });
          const moveY = gsap.quickTo(image, 'y', { duration: 1, ease: 'power3.out' });
          let rect;
          const enter = () => { rect = hero.getBoundingClientRect(); };
          const move = event => { if (!rect || !state.pointer) return; moveX(((event.clientX - rect.left) / rect.width - .5) * 18); moveY(((event.clientY - rect.top) / rect.height - .5) * 12); };
          const leave = () => { moveX(0); moveY(0); };
          hero.addEventListener('pointerenter', enter);hero.addEventListener('pointermove', move);hero.addEventListener('pointerleave', leave);
          localCleanups.push(() => { hero.removeEventListener('pointerenter', enter);hero.removeEventListener('pointermove', move);hero.removeEventListener('pointerleave', leave); });
        }
      }

      document.querySelectorAll('[data-reveal-lines]').forEach(element => {
        const lines = [...element.children];
        if (!lines.length) return;
        gsap.from(lines, { y: wide ? 45 : 22, opacity: .25, clipPath: 'inset(0 0 100% 0)', duration: .85, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } });
      });

      const aboutAvatar = document.querySelector('.contact-avatar');
      if (aboutAvatar) gsap.from(aboutAvatar, { scale: .85, opacity: .4, duration: .75, ease: 'power3.out', scrollTrigger: { trigger: aboutAvatar, start: 'top 95%', once: true } });
      document.querySelectorAll('.material-preview svg').forEach(image => {
        gsap.from(image, { clipPath: 'inset(0 0 100% 0)', scale: .97, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: image, start: 'top 95%', once: true } });
      });
      if (galleryWide) {
        document.querySelectorAll('[data-material-row]').forEach(row => {
          const offset = direction => row.closest('.materials-section').dataset.materialFilter === 'all' ? Number(row.dataset.materialRow) * direction * 10 : 0;
          gsap.fromTo(row, { x: () => offset(-1) }, { x: () => offset(1), ease: 'none', scrollTrigger: { trigger: '.materials-section', start: 'top bottom', end: 'bottom top', scrub: .8, invalidateOnRefresh: true } });
        });
      }
      if (wide) {
        const process = document.querySelector('.process-steps');
        const steps = [...document.querySelectorAll('[data-process-step]')];
        if (process && steps.length) ScrollTrigger.create({ trigger: process, start: 'top 65%', end: 'bottom 65%', onUpdate: self => {
          const active = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
          steps.forEach((step, index) => step.classList.toggle('is-current', index === active));
          gsap.to('.process-orbit', { rotation: active * 35, duration: .6, ease: 'power3.out', overwrite: true });
        }});
      }
      const curve = document.querySelector('.contact-curve');
      if (curve) gsap.to(curve, { borderRadius: '0% 0% 0% 0%', height: 25, y: 42, ease: 'none', scrollTrigger: { trigger: '.contact-section', start: 'top bottom', end: 'top 30%', scrub: .6 } });
      const orbitDot = document.querySelector('.orbit-dot');
      if (orbitDot) {
        const orbit = gsap.to(orbitDot, { rotation: 360, duration: 18, repeat: -1, ease: 'none', svgOrigin: '110 110' });
        loops.push(orbit);
        observeLoop(orbitDot.closest('.process-orbit'), orbit);
      }

      const visibility = () => loopEntries.forEach(entry => document.hidden || !entry.visible ? entry.tween.pause() : entry.tween.resume());
      document.addEventListener('visibilitychange', visibility);
      localCleanups.push(() => document.removeEventListener('visibilitychange', visibility));
      return () => localCleanups.splice(0).forEach(fn => fn());
    });
    ScrollTrigger.refresh();
  }

  document.querySelectorAll('[data-motion-toggle]').forEach(button => button.addEventListener('click', () => { paused = !paused;write('math-motion-paused', String(paused));rebuild(); }));
  media.addEventListener('change', rebuild);
  pointer.addEventListener('change', rebuild);
  rebuild();
  initIntro(state, interactionResets);
  initMagnets(state, interactionResets);
  initPreviews(state, interactionResets);
  window.addEventListener('pagehide', () => {
    decorations?.revert();cleanups.splice(0).forEach(fn => fn());
  });
  window.addEventListener('pageshow', event => { if (event.persisted) rebuild(); });
  document.fonts?.ready.then(() => ScrollTrigger?.refresh());
  document.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', () => ScrollTrigger?.refresh(), { once: true }); });
  return state;
}

function initIntro(state, resets) {
  const intro = document.querySelector('[data-intro]');
  if (!intro || !state.enabled || !state.gsap) return;
  let seen = false;
  try { seen = sessionStorage.getItem('math-intro-seen') === 'true';sessionStorage.setItem('math-intro-seen', 'true'); } catch { /* still usable */ }
  const gsap = state.gsap;
  const animations = [];
  const mobile = matchMedia('(max-width: 767px)').matches;
  resets.push(() => {
    animations.forEach(animation => animation.kill());intro.hidden = true;
    gsap.set('.hero-portrait img,.hero-intro,.hero-name', { clearProps: 'transform,opacity,visibility,clipPath' });
  });
  if (!seen) {
    intro.hidden = false;
    const text = intro.querySelector('[data-intro-text]');
    const timeline = gsap.timeline({ onComplete: () => { intro.hidden = true;gsap.set(intro, { clearProps: 'all' }); } });
    animations.push(timeline);
    timeline.fromTo(text, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: mobile ? .18 : .25 })
      .to(text, { opacity: 0, y: -8, duration: mobile ? .13 : .18 }, mobile ? '+=.08' : '+=.1')
      .call(() => { text.textContent = 'Давайте разберёмся'; })
      .fromTo(text, { y: 12 }, { y: 0, opacity: 1, duration: mobile ? .15 : .2 })
      .to(intro, { yPercent: -120, duration: mobile ? .55 : .72, ease: 'power4.inOut' }, mobile ? '+=.08' : '+=.13');
  }
  const heroTimeline = gsap.timeline({ delay: seen ? 0 : mobile ? .75 : 1 });
  heroTimeline.from('.hero-portrait img', { y: mobile ? 20 : 36, opacity: .1, duration: mobile ? .7 : .95, ease: 'power3.out' }, 0)
    .from('.hero-intro,.hero-name', { y: mobile ? 14 : 22, opacity: .1, duration: mobile ? .65 : .85, stagger: .08, ease: 'power3.out' }, .1);
  animations.push(heroTimeline);
}

function initMagnets(state, resets) {
  const gsap = state.gsap;
  if (!gsap) return;
  document.querySelectorAll('[data-magnetic]').forEach(button => {
    const label = button.querySelector('.button-label');
    let rect;
    const x = gsap.quickTo(label, 'x', { duration: .5, ease: 'power3.out' });
    const y = gsap.quickTo(label, 'y', { duration: .5, ease: 'power3.out' });
    const fill = button.querySelector('.button-fill');
    const reset = () => { x(0);y(0);if (fill) fill.style.translate = ''; };
    resets.push(() => { gsap.killTweensOf(label);gsap.set(label, { clearProps: 'transform' });if (fill) fill.style.translate = ''; });
    button.addEventListener('pointerenter', () => { rect = button.getBoundingClientRect(); });
    button.addEventListener('pointermove', event => {
      if (!state.pointer || !rect) return;
      const dx = Math.max(-14, Math.min(14, (event.clientX - rect.left - rect.width / 2) * .12));
      const dy = Math.max(-14, Math.min(14, (event.clientY - rect.top - rect.height / 2) * .12));
      x(dx * .55);y(dy * .55);
      // Keep the anchor's hit region stationary; only its painted inner layers move.
      if (fill) fill.style.translate = `${dx}px ${dy}px`;
    });
    button.addEventListener('pointerleave', () => { reset();if (state.enabled) gsap.to(label, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.65)', overwrite: true }); });
    button.addEventListener('blur', reset);
  });
}

function initPreviews(state, resets) {
  const gsap = state.gsap;
  if (!gsap) return;
  const preview = document.querySelector('[data-preview-float]');
  const math = preview?.querySelector('[data-preview-math]');
  const formulas = ['2x + 3 = 11', '3² + 4² = 5²', 'x² − 5x + 6 = 0'];
  const colors = ['#e4e0d8', '#c5d1c8', '#c6d1ee'];
  resets.push(() => { const elements = [preview, document.querySelector('[data-context-cursor]')].filter(Boolean);if (elements.length) { gsap.killTweensOf(elements);gsap.set(elements, { autoAlpha: 0 }); }if (math) { gsap.killTweensOf(math);gsap.set(math, { clearProps: 'transform,clipPath' }); } });
  if (preview) {
    const moveX = gsap.quickTo(preview, 'x', { duration: .55, ease: 'power3.out' });
    const moveY = gsap.quickTo(preview, 'y', { duration: .55, ease: 'power3.out' });
    const position = (x, y) => { moveX(Math.min(innerWidth - 310, Math.max(16, x - 145)));moveY(Math.min(innerHeight - 260, Math.max(16, y - 110))); };
    document.querySelectorAll('[data-direction]').forEach(row => {
      const show = () => {
        if (!state.pointer) return;
        const index = Number(row.dataset.direction);
        math.textContent = formulas[index] || formulas[0];
        gsap.fromTo(math, { y: 12, clipPath: 'inset(0 0 100% 0)' }, { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .4, ease: 'power3.out', overwrite: true });
        gsap.set(preview, { backgroundColor: colors[index] || colors[0] });
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: .35, overwrite: true });
      };
      const hide = () => gsap.to(preview, { autoAlpha: 0, scale: .94, duration: .25, overwrite: true });
      row.addEventListener('pointerenter', event => { position(event.clientX, event.clientY);show(); });
      row.addEventListener('pointermove', event => { if (state.pointer) position(event.clientX, event.clientY); });
      row.addEventListener('pointerleave', hide);
      row.addEventListener('focus', () => { if (!state.enabled || !matchMedia('(min-width: 768px)').matches) return;const rect = row.getBoundingClientRect();position(innerWidth * .6, rect.top + rect.height / 2);const i = Number(row.dataset.direction);math.textContent = formulas[i];gsap.to(preview, { autoAlpha: 1, duration: .2 }); });
      row.addEventListener('blur', hide);
    });
  }
  const cursor = document.querySelector('[data-context-cursor]');
  if (!cursor) return;
  const moveX = gsap.quickTo(cursor, 'x', { duration: .28, ease: 'power3.out' });
  const moveY = gsap.quickTo(cursor, 'y', { duration: .28, ease: 'power3.out' });
  document.querySelectorAll('[data-cursor]').forEach(element => {
    element.addEventListener('pointerenter', () => { if (!state.pointer) return;cursor.textContent = element.dataset.cursor;gsap.to(cursor, { autoAlpha: 1, scale: 1, duration: .25 }); });
    element.addEventListener('pointermove', event => { if (state.pointer) { moveX(event.clientX - 45);moveY(event.clientY - 45); } });
    element.addEventListener('pointerleave', () => gsap.to(cursor, { autoAlpha: 0, scale: .8, duration: .2 }));
  });
  document.addEventListener('keydown', () => { gsap.set([cursor, preview].filter(Boolean), { autoAlpha: 0 }); });
}
