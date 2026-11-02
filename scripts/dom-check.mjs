/**
 * Functional DOM checks, without a browser, layout engine, server, or network.
 * Linkedom upstream: https://github.com/WebReflection/linkedom/blob/main/worker.js
 * Retrieved blob SHA: 31bb78a1d7c77d689ddaf3048b22b7b51a47b59e.
 * DOM, parsing, selectors, mutations and events use the actual Linkedom module.
 * Browser-boundary adapters: location, matchMedia, localStorage, FormData, fetch.
 * Linkedom lacks HTMLFormElement.elements/reset; small compatibility adapters
 * below read/reset the actual parsed DOM controls. No layout, focus trapping,
 * pointer geometry, animations, screenshots or delivery to a server are tested.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from '../tests/vendor/linkedom.mjs';
import { initLesson } from '../src/lesson.js';
import { initContact, validateContact } from '../src/contact.js';
import { siteConfig, safeContactLinks } from '../src/config.js';
import { renderHTML } from './render.mjs';

const html = {
  index: await readFile(new URL('../index.html', import.meta.url), 'utf8'),
  lesson: await readFile(new URL('../lesson.html', import.meta.url), 'utf8'),
};
const initialConfig = structuredClone(siteConfig);
let assertions = 0;
const checked = (condition, message) => { assert.ok(condition, message); assertions++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };

function mount(name, search = '') {
  const { window, document } = parseHTML(html[name]);
  const storage = new Map();
  const location = new URL(`https://dom-test.invalid/${name === 'index' ? '' : 'lesson.html'}${search}`);
  const media = {
    matches: true,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
  };
  Object.assign(globalThis, {
    window, document, location,
    MutationObserver: window.MutationObserver,
    CustomEvent: window.CustomEvent,
    matchMedia: () => media,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
  });
  // Explicit compatibility boundary for unimplemented Linkedom form APIs.
  for (const form of document.querySelectorAll('form')) {
    const controls = [...form.querySelectorAll('input,select,textarea,button')];
    const defaults = new Map(controls.map(control => [control, control.value ?? '']));
    const elements = Object.assign([...controls], Object.fromEntries(
      controls.filter(control => control.getAttribute('name')).map(control => [control.getAttribute('name'), control]),
    ));
    Object.defineProperty(form, 'elements', { value: elements });
    Object.defineProperty(form, 'reset', { value: () => {
      controls.forEach(control => {
        if (control.localName !== 'select') control.value = defaults.get(control);
      });
    } });
  }
  globalThis.FormData = class DOMFormData {
    constructor(form) {
      this.entries = [...form.querySelectorAll('input,select,textarea')]
        .filter(control => control.getAttribute('name') && !control.disabled
          && (!['checkbox', 'radio'].includes(control.type) || control.checked))
        .map(control => [control.getAttribute('name'), control.value ?? '']);
    }
    [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
  };
  return { window, document };
}

function event(target, type, extra = {}) {
  const value = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(value, extra);
  target.dispatchEvent(value);
  return value;
}

function submitPractice(value) {
  const form = document.querySelector('[data-practice-form]');
  form.elements.answer.value = value;
  event(form, 'submit');
  return document.querySelector('[data-practice-status]');
}

try {
  const published = structuredClone(siteConfig);
  published.preview = false;
  published.owner.name = 'Анна <Тест>';
  published.owner.format = 'Онлайн';
  published.owner.price = 1500;
  published.contact.email = 'teacher@example.com';
  published.services[1].confirmed = true;
  const rendered = parseHTML(renderHTML(html.index, published)).document;
  equal(rendered.querySelector('h1').textContent, 'Анна <Тест>', 'Static renderer uses configured name as safe text');
  checked(rendered.querySelector('h1').children.length === 0, 'Configured text never creates HTML nodes');
  checked([...rendered.querySelectorAll('[data-preview]')].every(element => element.hidden), 'Static publication hides preview labels');
  equal([...rendered.querySelectorAll('[data-direction]:not([hidden]) .direction-title')].map(element => element.textContent), ['Подготовка к ОГЭ'], 'Static publication shows only confirmed services');
  equal(rendered.querySelector('[data-direction]:not([hidden]) .direction-mobile-preview').textContent, 'a² + b² = c²', 'Filtered service keeps matching material');
  checked(rendered.querySelector('#process').hidden, 'Unconfirmed process hidden in no-JS publication');
  checked(rendered.querySelector('[data-approach]').hidden, 'Unconfirmed approach hidden in no-JS publication');
  equal(rendered.querySelector('[data-condition="price"] [data-value]').textContent, '1500 ₽ за занятие', 'Static price comes from single config');
  checked(rendered.querySelector('[data-condition="durationMinutes"]').hidden, 'Unknown condition hidden in no-JS publication');
  equal(rendered.querySelector('[data-contact-links] a').getAttribute('href'), 'mailto:teacher@example.com', 'No-JS contact is a real configured link');
  checked(rendered.querySelector('#contact-form').hidden, 'Static HTML never displays a nonfunctional fetch form');
  const repeated = parseHTML(renderHTML(rendered.toString(), published)).document;
  equal(repeated.querySelectorAll('[data-contact-links] a').length, 1, 'Repeated static rendering does not duplicate contacts');
  const noServices = structuredClone(published);
  noServices.services.forEach(service => { service.confirmed = false; });
  const generic = parseHTML(renderHTML(html.index, noServices)).document;
  equal(generic.querySelector('#directions-title').textContent, 'Математика', 'Unconfirmed service list becomes general mathematics');
  checked(!generic.querySelector('[data-directions-generic]').hidden, 'No-JS generic explanation remains visible');

  mount('index');
  initLesson();
  const scene = document.querySelector('[data-lesson]');
  const buttons = [...scene.querySelectorAll('[data-step]')];
  const equation = scene.querySelector('[data-lesson-equation]');
  const previous = scene.querySelector('[data-lesson-prev]');
  const next = scene.querySelector('[data-lesson-next]');
  equal(scene.dataset.currentStep, '0', 'Lesson starts at condition');
  checked(previous.disabled && !next.disabled, 'Initial button boundaries');
  equal(equation.textContent, 'x² − 5x + 6 = 0', 'Initial equation');
  event(next, 'click');
  equal(scene.dataset.currentStep, '1', 'Next selects idea');
  equal(equation.textContent, '(x − 2)(x − 3) = 0', 'Factorization equation');
  equal(buttons[1].getAttribute('aria-pressed'), 'true', 'Active step announced');
  event(buttons[1], 'keydown', { key: 'End' });
  equal(scene.dataset.currentStep, '2', 'End selects last step');
  checked(next.disabled && !previous.disabled, 'Final button boundaries');
  equal(equation.textContent, 'x = 2 или x = 3', 'Correct result');
  checked(scene.querySelector('[role="status"]').textContent.includes('Шаг 3 из 3'), 'Step live announcement');
  event(buttons[2], 'keydown', { key: 'ArrowRight' });
  equal(scene.dataset.currentStep, '0', 'ArrowRight wraps to first step');
  event(buttons[0], 'keydown', { key: 'ArrowLeft' });
  equal(scene.dataset.currentStep, '2', 'ArrowLeft wraps to last step');
  event(buttons[2], 'keydown', { key: 'Home' });
  equal(scene.dataset.currentStep, '0', 'Home selects first step');
  event(buttons[2], 'click');
  event(previous, 'click');
  equal(scene.dataset.currentStep, '1', 'Previous selects prior step');
  event(scene.querySelector('[data-lesson-start]'), 'click');
  equal(scene.dataset.currentStep, '0', 'Start restarts condition');
  const graph = scene.querySelector('svg.math-graph');
  checked(Boolean(graph?.querySelector('desc')), 'Computed graph has accessible description');
  equal([...graph.querySelectorAll('.math-graph-roots circle')].map(point => [point.getAttribute('cx'), point.getAttribute('cy')]),
    [['219.2', '303'], ['300.79999999999995', '303']], 'Graph roots match x=2 and x=3');
  const statuses = scene.querySelectorAll('[role="status"]').length;
  initLesson();
  equal(scene.querySelectorAll('[role="status"]').length, statuses, 'Repeated init does not duplicate scene');
  window.dispatchEvent(new window.Event('pagehide'));

  for (const [topic, correct, reversed, expected] of [
    ['linear', '5', '5', 'x = 5'],
    ['geometry', '13', '13', 'c = 13'],
    ['quadratic', '3 4', '4 3', 'x = 3'],
  ]) {
    mount('lesson', `?topic=${topic}`);
    initLesson();
    const form = document.querySelector('[data-practice-form]');
    checked(!form.hidden, `${topic}: practice enabled`);
    checked(!document.querySelector('[data-practice-nojs]'), `${topic}: fallback removed on initialization`);
    checked(document.title.length > 10, `${topic}: meaningful page title`);
    equal(submitPractice('').dataset.result, 'retry', `${topic}: empty answer rejected`);
    equal(form.elements.answer.getAttribute('aria-invalid'), 'true', `${topic}: empty answer marked invalid`);
    equal(submitPractice('nonsense').dataset.result, 'retry', `${topic}: non-number rejected`);
    equal(submitPractice(topic === 'quadratic' ? '1 2' : '99').dataset.result, 'retry', `${topic}: wrong answer rejected`);
    const status = submitPractice(correct);
    equal(status.dataset.result, 'correct', `${topic}: correct answer accepted`);
    checked(status.textContent.includes(expected), `${topic}: success explains answer`);
    equal(form.elements.answer.getAttribute('aria-invalid'), 'false', `${topic}: correct answer clears invalid state`);
    equal(submitPractice(reversed).dataset.result, 'correct', `${topic}: root order does not matter`);
    event(form.elements.answer, 'input');
    checked(!form.elements.answer.hasAttribute('aria-invalid'), `${topic}: editing removes error state`);
    equal(status.textContent, '', `${topic}: editing clears stale success`);
    initLesson();
    equal(document.querySelectorAll('[data-practice-form]').length, 1, `${topic}: repeated init remains singular`);
  }
  mount('lesson', '?topic=unknown');
  initLesson();
  equal(document.querySelector('[data-detail-equation]').textContent, 'x² − 5x + 6 = 0', 'Unknown topic falls back safely');

  equal(validateContact({ name: 'Анна', method: 'email', contact: 'anna@example.com' }), {}, 'Valid email accepted');
  checked('name' in validateContact({ name: '', contact: 'anna@example.com' }), 'Missing name rejected');
  checked('name' in validateContact({ name: 'a'.repeat(101), contact: 'anna@example.com' }), 'Oversized name rejected');
  checked('contact' in validateContact({ name: 'Анна', method: 'email', contact: 'invalid' }), 'Invalid email rejected');
  checked('contact' in validateContact({ name: 'Анна', method: 'phone', contact: '-------' }), 'Phone needs actual digits');
  equal(validateContact({ name: 'Анна', method: 'phone', contact: '+7 (999) 123-45-67' }), {}, 'Valid phone accepted');
  equal(validateContact({ name: 'Анна', method: 'telegram', contact: '@student_name' }), {}, 'Valid Telegram accepted');
  equal(safeContactLinks({ telegram: 'javascript:evil()', email: 'a<b@example.com', phone: '-------' }), [], 'Unsafe direct contacts rejected');

  mount('index');
  siteConfig.contact.endpoint = null;
  initContact();
  checked(document.querySelector('#contact-form').hidden, 'No endpoint: form stays hidden');
  checked(document.querySelector('[data-contact-note]').textContent.includes('не подключена'), 'No endpoint: honest preview message');

  function contactPage() {
    mount('index');
    siteConfig.contact.endpoint = '/api/contact';
    initContact();
    const form = document.querySelector('#contact-form');
    form.elements.name.value = 'Анна';
    // Linkedom does not implement select.value setters; setting the default
    // selection on the actual DOM is represented through an own value slot.
    Object.defineProperty(form.elements.method, 'value', { value: 'email', writable: true });
    form.elements.contact.value = 'anna@example.com';
    form.elements.message.value = 'Хочу понять уравнения';
    return { form, button: form.querySelector('[data-submit]'), status: form.querySelector('[data-form-status]') };
  }

  {
    const { form, button, status } = contactPage();
    checked(!form.hidden, 'Configured endpoint enables contact form');
    let calls = 0;
    let finish;
    globalThis.fetch = (url, options) => {
      calls++;
      equal(url, 'https://dom-test.invalid/api/contact', 'Request resolves configured endpoint');
      equal(options.method, 'POST', 'Request uses POST');
      equal(JSON.parse(options.body).name, 'Анна', 'Request contains entered name');
      return new Promise(resolve => { finish = resolve; });
    };
    event(form, 'submit');
    event(form, 'submit');
    equal(calls, 1, 'Pending request blocks duplicate submissions');
    checked(button.disabled && form.getAttribute('aria-busy') === 'true', 'Pending UI is disabled and busy');
    finish({ ok: true, json: async () => ({ success: true }) });
    await flush();
    equal(status.dataset.state, 'success', 'Only confirmed response gives success');
    checked(status.textContent.includes('отправлено'), 'Success feedback is readable');
    equal(form.elements.name.value, '', 'Confirmed success resets name');
    checked(!button.disabled && !form.hasAttribute('aria-busy'), 'Success releases pending state');
  }

  for (const mode of ['http500', 'network', 'unconfirmed']) {
    const { form, button, status } = contactPage();
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (mode === 'network') throw new Error('simulated network rejection');
      return { ok: mode !== 'http500', json: async () => mode === 'unconfirmed' ? {} : ({ success: false }) };
    };
    event(form, 'submit');
    await flush();
    equal(status.dataset.state, 'error', `${mode}: no false success`);
    equal(form.elements.name.value, 'Анна', `${mode}: name preserved`);
    equal(form.elements.contact.value, 'anna@example.com', `${mode}: contact preserved`);
    equal(form.elements.message.value, 'Хочу понять уравнения', `${mode}: message preserved`);
    checked(!button.disabled && !form.hasAttribute('aria-busy'), `${mode}: retry enabled`);
    event(form, 'submit');
    await flush();
    equal(calls, 2, `${mode}: retry can submit again`);
  }

  console.log(`DOM checks passed: ${assertions} assertions using real Linkedom DOM/events/selectors.`);
  console.log('Boundary adapters: form.elements/reset, select.value, FormData, matchMedia, storage, location, mocked fetch.');
  console.log('No browser/layout/motion/focus-trap QA, screenshots, network requests, or real message delivery were performed.');
} finally {
  Object.assign(siteConfig, initialConfig);
}
