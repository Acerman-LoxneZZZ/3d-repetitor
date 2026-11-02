/** Authored teaching examples. All graphs are computed from the stated functions. */
let graphId = 0;

export function graphSVG() {
  const id = `quadratic-graph-${++graphId}`;
  const x = value => 56 + value * 81.6;
  const y = value => 303 - value * 35;
  const curve = Array.from({ length: 161 }, (_, index) => {
    const value = index / 32;
    return `${index ? 'L' : 'M'}${x(value).toFixed(2)},${y(value * value - 5 * value + 6).toFixed(2)}`;
  }).join(' ');
  return `<svg class="math-graph" viewBox="0 0 520 390" role="img" aria-labelledby="${id}-title ${id}-desc" xmlns="http://www.w3.org/2000/svg">
    <title id="${id}-title">График функции y = x² − 5x + 6</title>
    <desc id="${id}-desc">Парабола направлена вверх, пересекает ось x в точках 2 и 3. Вершина: x = 2,5, y = −0,25.</desc>
    <g class="math-graph-grid" fill="none" stroke="currentColor" stroke-width="1" opacity=".12">
      ${[1, 2, 3, 4, 5].map(value => `<path d="M${x(value)} 45V338"/>`).join('')}
      ${[0, 2, 4, 6].map(value => `<path d="M56 ${y(value)}H476"/>`).join('')}
    </g>
    <g class="math-graph-axes" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".65"><path d="M42 303H484m-7-5 7 5-7 5M56 350V31m-5 7 5-7 5 7"/></g>
    <g fill="currentColor" font-family="inherit" font-size="14" opacity=".75">
      ${[0, 1, 2, 3, 4, 5].map(value => `<text x="${x(value)}" y="331" text-anchor="middle" stroke="none">${value}</text>`).join('')}
      ${[2, 4, 6].map(value => `<text x="40" y="${y(value) + 5}" text-anchor="end" stroke="none">${value}</text>`).join('')}
      <text x="493" y="308" stroke="none">x</text><text x="48" y="23" stroke="none">y</text>
    </g>
    <path class="math-graph-curve" d="${curve}" fill="none" stroke="var(--accent, #455ce9)" stroke-width="3.5" stroke-linecap="round"/>
    <g class="math-graph-roots" fill="var(--accent, #455ce9)" stroke="none"><circle cx="${x(2)}" cy="${y(0)}" r="5.5"/><circle cx="${x(3)}" cy="${y(0)}" r="5.5"/></g>
    <circle class="math-graph-vertex" cx="${x(2.5)}" cy="${y(-.25)}" r="3" fill="currentColor" stroke="none"/>
    <text x="260" y="375" fill="currentColor" stroke="none" font-size="14" text-anchor="middle" font-family="inherit">Нули функции: 2 и 3</text>
  </svg>`;
}

const steps = [
  {
    title: 'Сначала — что нужно найти',
    equation: 'x² − 5x + 6 = 0',
    copy: 'Найдём все значения x, при которых левая часть равна нулю. Можно применить формулу дискриминанта, но здесь есть более короткий путь.'
  },
  {
    title: 'Замечаем связь между числами',
    equation: '(x − 2)(x − 3) = 0',
    copy: 'Ищем два числа с суммой 5 и произведением 6. Это 2 и 3: 2 + 3 = 5, а 2 × 3 = 6. Поэтому x² − 5x + 6 = (x − 2)(x − 3).'
  },
  {
    title: 'Получаем ответ. И проверяем',
    equation: 'x = 2 или x = 3',
    copy: 'Произведение равно нулю, если хотя бы один множитель равен нулю. Значит, x − 2 = 0 или x − 3 = 0. Проверка: 4 − 10 + 6 = 0; 9 − 15 + 6 = 0. Оба корня подходят.'
  }
];

function initDemo(scene) {
  if (scene.dataset.lessonReady) return;
  scene.dataset.lessonReady = 'true';
  const title = scene.querySelector('[data-lesson-title]');
  const copy = scene.querySelector('[data-lesson-copy]');
  const equation = scene.querySelector('[data-lesson-equation]');
  const graph = scene.querySelector('[data-lesson-graph]');
  const previous = scene.querySelector('[data-lesson-prev]');
  const next = scene.querySelector('[data-lesson-next]');
  const buttons = [...scene.querySelectorAll('[data-step]')];
  let current = 0;
  if (graph) graph.innerHTML = graphSVG();
  const curve = graph?.querySelector('.math-graph-curve');
  const roots = graph?.querySelector('.math-graph-roots');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const textTargets = [equation, title, copy].filter(Boolean);
  const graphTargets = [curve, roots].filter(Boolean);
  let stepAnimation;

  function stopStepAnimation() {
    stepAnimation?.kill();
    stepAnimation = undefined;
    const gsap = window.gsap;
    if (!gsap) return;
    gsap.killTweensOf([...textTargets, ...graphTargets]);
    if (textTargets.length) gsap.set(textTargets, { clearProps: 'opacity,transform' });
    if (graphTargets.length) gsap.set(graphTargets, { clearProps: 'opacity,transform,strokeDasharray,strokeDashoffset' });
  }

  function animateStep() {
    let paused = document.documentElement.classList.contains('motion-paused');
    try { paused ||= localStorage.getItem('math-motion-paused') === 'true'; } catch { /* Optional storage. */ }
    const gsap = window.gsap;
    if (!gsap || paused || reduced.matches || document.hidden) return;
    stepAnimation = gsap.timeline({ defaults: { overwrite: 'auto', ease: 'power3.out' }, onComplete: () => { stepAnimation = undefined; } });
    if (equation) stepAnimation.fromTo(equation, { y: 7, opacity: .7 }, { y: 0, opacity: 1, duration: .38, clearProps: 'opacity,transform' }, 0);
    const explanationTargets = [title, copy].filter(Boolean);
    if (explanationTargets.length) stepAnimation.fromTo(explanationTargets, { y: 4, opacity: .7 }, { y: 0, opacity: 1, duration: .36, stagger: .04, clearProps: 'opacity,transform' }, .05);
    if (current > 0 && curve && typeof curve.getTotalLength === 'function') {
      const length = curve.getTotalLength();
      stepAnimation.fromTo(curve, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .65, clearProps: 'strokeDasharray,strokeDashoffset' }, 0);
    }
    if (current > 0 && roots) stepAnimation.fromTo(roots, { opacity: .15 }, { opacity: 1, duration: .4, clearProps: 'opacity' }, .2);
  }

  const preferenceChanged = () => { if (reduced.matches) stopStepAnimation(); };
  const pauseObserver = new MutationObserver(() => {
    if (document.documentElement.classList.contains('motion-paused')) stopStepAnimation();
  });
  const visibilityChanged = () => { if (document.hidden) stopStepAnimation(); };
  const bindPreferences = () => {
    reduced.addEventListener('change', preferenceChanged);
    pauseObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', visibilityChanged);
  };
  bindPreferences();
  window.addEventListener('pagehide', () => {
    stopStepAnimation();
    pauseObserver.disconnect();
    reduced.removeEventListener('change', preferenceChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) bindPreferences(); });
  const announcement = document.createElement('p');
  announcement.className = 'lesson-sr-only';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  scene.append(announcement);
  if (title) title.tabIndex = -1;

  function show(index, announce = true) {
    stopStepAnimation();
    current = Math.max(0, Math.min(steps.length - 1, index));
    const step = steps[current];
    scene.dataset.currentStep = String(current);
    if (title) title.textContent = step.title;
    if (copy) copy.textContent = step.copy;
    if (equation) equation.textContent = step.equation;
    scene.querySelectorAll('[data-lesson-step]').forEach(item => {
      item.textContent = `${current + 1} / ${steps.length}`;
      item.removeAttribute('aria-live');
    });
    buttons.forEach(button => {
      const active = Number(button.dataset.step) === current;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    if (previous) previous.disabled = current === 0;
    if (next) next.disabled = current === steps.length - 1;
    if (announce) announcement.textContent = `Шаг ${current + 1} из 3. ${step.title}. ${step.equation}. ${step.copy}`;
    if (announce) animateStep();
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => show(Number(button.dataset.step)));
    button.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = buttons.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      buttons[target].focus();
      show(Number(buttons[target].dataset.step));
    });
  });
  previous?.addEventListener('click', () => show(current - 1));
  next?.addEventListener('click', () => show(current + 1));
  scene.querySelectorAll('[data-lesson-start]').forEach(button => button.addEventListener('click', () => {
    show(0);
    title?.focus({ preventScroll: true });
  }));
  show(0, false);
}

function triangleSVG() {
  return `<svg class="math-triangle" viewBox="0 0 520 360" role="img" aria-labelledby="triangle-title triangle-desc" xmlns="http://www.w3.org/2000/svg"><title id="triangle-title">Прямоугольный треугольник с катетами 3 и 4</title><desc id="triangle-desc">Катет AB имеет длину 4, катет AC — 3. Угол A прямой. Гипотенуза BC равна 5.</desc><path d="M98 65V290H398Z" fill="none" stroke="var(--accent, #455ce9)" stroke-width="3.5" stroke-linejoin="round"/><path d="M98 265h25v25" fill="none" stroke="currentColor" stroke-width="1.5"/><g fill="currentColor" font-size="21" font-family="inherit"><text x="62" y="185">3</text><text x="240" y="326">4</text><text x="262" y="156">5</text><text x="76" y="318">A</text><text x="409" y="308">B</text><text x="79" y="51">C</text></g></svg>`;
}

const articles = {
  linear: {
    title: 'Уравнение — это равновесие',
    description: 'Как решить 2x + 3 = 11 и понять, почему можно менять обе части уравнения одинаково.',
    equation: '2x + 3 = 11',
    content: `<section class="lesson-explanation"><h2>Сохраняем равенство</h2><p>Представьте весы в равновесии. Чтобы они не наклонились, с двух сторон нужно убрать одинаковый вес. С уравнением работает та же идея: одинаковое действие с обеими частями сохраняет равенство.</p><div class="lesson-worked-step"><span>1</span><div><h3>Убираем лишнее с обеих сторон</h3><p>Вычитаем 3 из левой и правой частей.</p><p class="lesson-worked-formula">2x + 3 − 3 = 11 − 3</p><p class="lesson-worked-formula">2x = 8</p></div></div><div class="lesson-worked-step"><span>2</span><div><h3>Находим одно неизвестное</h3><p>Делим обе части на 2. На ненулевое число делить можно.</p><p class="lesson-worked-formula">x = 8 : 2 = 4</p></div></div><div class="lesson-worked-step"><span>3</span><div><h3>Возвращаемся к условию</h3><p>Подставляем 4 вместо x: 2 × 4 + 3 = 11. Получилось верное равенство, значит, ответ подходит.</p></div></div></section>`,
    practice: '3x + 2 = 17',
    answerLabel: 'Значение x',
    answerHelp: 'Введите одно число.',
    answer: [5],
    success: 'Верно: x = 5. Проверка: 3 × 5 + 2 = 17.',
    hint: 'Вычтите 2 из обеих частей, а затем разделите обе части на 3.',
    solution: '3x + 2 = 17 → 3x = 15 → x = 5. Проверка: 3 × 5 + 2 = 17.'
  },
  geometry: {
    title: 'Увидеть связь между сторонами',
    description: 'Разбираем прямоугольный треугольник и находим его гипотенузу по теореме Пифагора.',
    equation: '3² + 4² = c²',
    content: `<section class="lesson-explanation"><h2>Один угол меняет всё</h2><p>В прямоугольном треугольнике сторона напротив прямого угла называется гипотенузой. Две остальные стороны — катеты. Именно для такого треугольника работает теорема Пифагора.</p><div class="lesson-detail-figure">${triangleSVG()}</div><div class="lesson-worked-step"><span>1</span><div><h3>Записываем связь</h3><p>Квадрат гипотенузы равен сумме квадратов катетов.</p><p class="lesson-worked-formula">c² = a² + b²</p></div></div><div class="lesson-worked-step"><span>2</span><div><h3>Подставляем известные длины</h3><p>Если катеты равны 3 и 4, получаем:</p><p class="lesson-worked-formula">c² = 3² + 4² = 9 + 16 = 25</p></div></div><div class="lesson-worked-step"><span>3</span><div><h3>Берём положительный корень</h3><p>Длина стороны положительна, поэтому c = 5. Отрицательное число −5 тоже даёт 25 при возведении в квадрат, но длиной быть не может.</p><p class="lesson-worked-formula">c = √25 = 5</p></div></div></section>`,
    practice: 'a = 5, b = 12. Найдите c.',
    answerLabel: 'Длина гипотенузы',
    answerHelp: 'Катеты прямоугольного треугольника равны 5 и 12. Введите одно число.',
    answer: [13],
    success: 'Верно: c = 13. Проверка: 5² + 12² = 25 + 144 = 169 = 13².',
    hint: 'Сложите квадраты катетов: 25 + 144. Затем найдите положительный квадратный корень.',
    solution: 'c² = 5² + 12² = 25 + 144 = 169. Длина положительна, поэтому c = √169 = 13.'
  },
  quadratic: {
    title: 'Два корня. Одна понятная идея.',
    description: 'Разбираем квадратное уравнение: от связи между числами до проверки обоих корней.',
    equation: 'x² − 5x + 6 = 0',
    content: '',
    practice: 'x² − 7x + 12 = 0',
    answerLabel: 'Два корня уравнения',
    answerHelp: 'Введите два числа через пробел, например 1 2. Порядок не важен.',
    answer: [3, 4],
    success: 'Верно: x = 3 или x = 4. Проверка: 9 − 21 + 12 = 0; 16 − 28 + 12 = 0.',
    hint: 'Нужны два числа, сумма которых равна 7, а произведение — 12.',
    solution: '3 + 4 = 7, 3 × 4 = 12. Значит, (x − 3)(x − 4) = 0 и x = 3 или x = 4. Оба значения обращают исходное выражение в ноль.'
  }
};

function initDetailPage() {
  const page = document.querySelector('[data-lesson-detail]');
  if (!page || page.dataset.detailReady) return;
  page.dataset.detailReady = 'true';
  const requested = new URLSearchParams(location.search).get('topic');
  const topic = Object.hasOwn(articles, requested) ? requested : 'quadratic';
  const article = articles[topic];
  const articleOrder = Object.keys(articles);
  const nextTopic = articleOrder[(articleOrder.indexOf(topic) + 1) % articleOrder.length];
  const nextArticle = articles[nextTopic];
  const nextLink = page.querySelector('[data-next-lesson]');
  if (nextLink) {
    nextLink.setAttribute('href', `/lesson.html?topic=${encodeURIComponent(nextTopic)}`);
    nextLink.querySelector('[data-next-title]').textContent = nextArticle.title;
    nextLink.querySelector('[data-next-equation]').textContent = nextArticle.equation;
  }
  document.title = `${article.title} — Разбор математики`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', article.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', article.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', article.description);
  page.querySelector('[data-detail-title]').textContent = article.title;
  page.querySelector('[data-detail-description]').textContent = article.description;
  page.querySelector('[data-detail-equation]').textContent = article.equation;
  if (topic !== 'quadratic') page.querySelector('[data-detail-body]').innerHTML = article.content;
  else page.querySelector('[data-detail-graph]').innerHTML = graphSVG();
  page.querySelector('[data-practice-equation]').textContent = article.practice;
  page.querySelector('[data-practice-label]').textContent = article.answerLabel;
  page.querySelector('[data-practice-help]').textContent = article.answerHelp;
  page.querySelector('[data-practice-solution]').textContent = article.solution;
  const form = page.querySelector('[data-practice-form]');
  const input = form.elements.answer;
  const status = page.querySelector('[data-practice-status]');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = input.value.trim();
    const values = raw.split(/[\s;,]+/).filter(Boolean).map(Number);
    const validNumbers = raw !== '' && values.every(value => Number.isFinite(value));
    const complete = validNumbers && values.length === article.answer.length;
    const correct = complete && values.sort((a, b) => a - b).every((value, index) => Math.abs(value - article.answer[index]) < 1e-9);
    input.setAttribute('aria-invalid', String(!correct));
    status.dataset.result = correct ? 'correct' : 'retry';
    if (correct) status.textContent = article.success;
    else if (!complete) status.textContent = `Введите ${article.answer.length === 2 ? 'два числа через пробел' : 'одно число'}. ${article.answerHelp}`;
    else status.textContent = `Попробуйте ещё раз. ${article.hint}`;
  });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    if (status.dataset.result) {
      delete status.dataset.result;
      status.textContent = '';
    }
  });
  form.hidden = false;
  page.querySelector('[data-practice-nojs]')?.remove();
}

export function initLesson() {
  document.querySelectorAll('[data-lesson]').forEach(initDemo);
  initDetailPage();
}
