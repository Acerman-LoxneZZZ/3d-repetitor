/** One lesson, one state: move the existing scene into a native focus dialog. */
export function initLessonFocus(motion) {
  const scene = document.querySelector('[data-lesson]');
  const opener = scene?.querySelector('[data-lesson-expand]');
  const dialog = document.querySelector('#lesson-focus');
  if (!scene || !opener || !dialog) return;
  const slot = dialog.querySelector('[data-focus-slot]');
  const shell = dialog.querySelector('.lesson-focus-shell');
  let placeholder;
  let savedY = 0;
  let animation;
  let closing = false;
  const restore = () => {
    animation?.kill();animation = undefined;
    if (placeholder?.isConnected) placeholder.replaceWith(scene);
    placeholder = undefined;
    if (dialog.open) dialog.close();
    document.body.classList.remove('lesson-is-open');
    motion.gsap?.set(shell, { clearProps: 'transform,opacity' });
    closing = false;
    window.scrollTo({ top: savedY, behavior: 'instant' });
    motion.refresh();
    opener.focus({ preventScroll: true });
  };
  const close = () => {
    if (!dialog.open || closing) return;
    closing = true;animation?.kill();
    dialog.classList.add('is-closing');
    if (!motion.enabled || !motion.gsap) { restore();return; }
    animation = motion.gsap.to(shell, { y: 12, opacity: 0, duration: .22, ease: 'power3.in', onComplete: restore });
  };
  opener.addEventListener('click', () => {
    if (dialog.open) return;
    savedY = window.scrollY;
    placeholder = document.createElement('div');
    placeholder.style.height = `${scene.getBoundingClientRect().height}px`;
    placeholder.setAttribute('aria-hidden', 'true');
    scene.before(placeholder);slot.append(scene);
    dialog.classList.toggle('has-motion', Boolean(motion.enabled));
    dialog.classList.remove('is-closing');
    dialog.showModal();dialog.scrollTop = 0;
    document.body.classList.add('lesson-is-open');
    if (motion.enabled && motion.gsap) animation = motion.gsap.fromTo(shell, { y: 28, opacity: .4 }, { y: 0, opacity: 1, duration: .48, ease: 'power3.out' });
    dialog.querySelector('[data-focus-close]').focus({ preventScroll: true });
  });
  dialog.querySelector('[data-focus-close]').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault();close(); });
  dialog.addEventListener('click', event => {
    if (event.target.closest('a[href]') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) restore();
  });
  new MutationObserver(() => {
    if (motion.enabled || !dialog.open) return;
    if (closing) restore();
    else { animation?.kill();motion.gsap?.set(shell, { clearProps: 'transform,opacity' }); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => { if (dialog.open) restore(); });
  opener.hidden = false;
}
