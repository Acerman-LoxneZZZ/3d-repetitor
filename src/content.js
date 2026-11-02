import { siteConfig, safeContactLinks } from './config.js';

const hasValue = value => value !== null && value !== undefined && value !== '';
const previewName = '[Имя Фамилия]';

/** Content only: shared by the browser, local HTML server and static build. */
export function applyContent(document, config = siteConfig) {
  const { owner, preview, services } = config;
  const name = hasValue(owner.name) && (preview || !/^\[.*\]$/.test(owner.name))
    ? owner.name : preview ? previewName : 'Математика';
  document.querySelectorAll('[data-owner-name]').forEach(element => { element.textContent = name; });
  document.querySelectorAll('[data-preview]').forEach(element => { element.hidden = !preview; });
  document.querySelectorAll('[data-year],[data-current-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
  const role = owner.role || 'Репетитор по математике';
  document.querySelectorAll('[data-owner-role],.hero-role,.brand small,.lesson-page-brand small').forEach(element => {
    if (element.classList.contains('hero-role') && role === 'Репетитор по математике') {
      element.replaceChildren(document.createTextNode('Репетитор'), document.createElement('br'), document.createTextNode('по математике'));
    } else element.textContent = role;
  });

  const format = owner.format ? owner.format + (owner.city ? `, ${owner.city}` : '') : null;
  document.querySelectorAll('[data-format]').forEach(element => {
    if (format) element.textContent = format;
    else element.textContent = 'Разбираемся в математике';
  });
  document.querySelectorAll('[data-format-answer]').forEach(element => {
    element.textContent = format
      ? `Формат занятий: ${format}. Время согласуется при обсуждении занятий.`
      : 'Формат ещё уточняется. Перед началом занятий нужно согласовать, будут ли они проходить онлайн или очно, и выбрать удобное время.';
  });
  document.querySelectorAll('[data-condition]').forEach(row => {
    const key = row.dataset.condition;
    const value = owner[key];
    row.hidden = !preview && !hasValue(value);
    const output = row.querySelector('[data-value]');
    if (!output || !hasValue(value)) return;
    output.textContent = key === 'durationMinutes' ? `${value} минут`
      : key === 'price' ? `${value} ${owner.currency || '₽'} за занятие`
        : key === 'format' ? format : value;
  });
  const conditions = document.querySelector('#conditions');
  if (conditions) conditions.hidden = !preview && !document.querySelector('[data-condition]:not([hidden])');

  document.querySelectorAll('[data-approach]').forEach(element => {
    if (config.approach.text) element.textContent = config.approach.text;
    element.hidden = !preview && !config.approach.confirmed;
  });
  document.querySelectorAll('[data-approach-note]').forEach(element => { element.hidden = config.approach.confirmed || !preview; });
  document.querySelectorAll('[data-process-note]').forEach(element => { element.hidden = config.processConfirmed || !preview; });
  const process = document.querySelector('#process');
  if (process) process.hidden = !config.processConfirmed && !preview;

  const about = document.querySelector('.about-aside');
  if (about) for (const [key, label] of [['experience', 'Опыт'], ['education', 'Образование']]) {
    let element = about.querySelector(`[data-owner-${key}]`);
    if (!element && hasValue(owner[key])) {
      element = document.createElement('p');
      element.setAttribute(`data-owner-${key}`, '');
      element.className = 'content-note';
      about.insertBefore(element, about.querySelector('.circle-button'));
    }
    if (element) {
      element.hidden = !hasValue(owner[key]);
      element.textContent = hasValue(owner[key]) ? `${label}: ${owner[key]}` : '';
    }
  }

  const visibleServices = services.filter(service => preview || service.confirmed);
  const rows = [...document.querySelectorAll('[data-direction]')];
  const list = document.querySelector('[data-directions]');
  if (list && rows.length && visibleServices.length > rows.length) {
    while (rows.length < visibleServices.length) {
      const row = rows[0].cloneNode(true);
      list.append(row);
      rows.push(row);
    }
  }
  const topics = { linear: { index: 0, formula: '2x + 3 = 11' }, geometry: { index: 1, formula: 'a² + b² = c²' }, quadratic: { index: 2, formula: 'x² − 5x + 6 = 0' } };
  rows.forEach((row, index) => {
    const service = visibleServices[index];
    row.hidden = !service;
    if (!service) return;
    const topic = Object.hasOwn(topics, service.topic) ? service.topic : 'quadratic';
    row.querySelector('.direction-title').textContent = service.title;
    row.querySelector('.direction-description').textContent = service.description;
    const mobile = row.querySelector('.direction-mobile-preview');
    if (mobile) mobile.textContent = topics[topic].formula;
    row.setAttribute('href', `/lesson.html?topic=${encodeURIComponent(topic)}`);
    row.dataset.direction = String(topics[topic].index);
    row.dataset.directionName = service.title;
  });
  const note = document.querySelector('[data-services-note]');
  if (note) note.hidden = !preview || visibleServices.every(service => service.confirmed);
  const directionsTitle = document.querySelector('#directions-title');
  if (directionsTitle) directionsTitle.textContent = visibleServices.length ? 'С чем разберёмся' : 'Математика';
  if (list) {
    let generic = list.querySelector('[data-directions-generic]');
    if (!generic && !visibleServices.length) {
      generic = document.createElement('p');
      generic.className = 'directions-generic';
      generic.setAttribute('data-directions-generic', '');
      generic.textContent = 'Разберём сложную тему и поймём, как подступиться к задачам.';
      list.append(generic);
    }
    if (generic) generic.hidden = visibleServices.length > 0;
  }

  const portrait = document.querySelector('[data-portrait]');
  if (portrait && owner.photo) {
    portrait.parentElement.querySelector('source')?.remove();
    portrait.setAttribute('src', owner.photo);
    portrait.alt = `Преподаватель математики ${name}`;
  } else if (portrait) {
    portrait.setAttribute('src', owner.portrait);
    portrait.alt = 'Мультяшная иллюстрация преподавателя математики';
    const source = portrait.parentElement.querySelector('source');
    if (source) source.setAttribute('srcset', `${owner.portraitSmall} 640w, ${owner.portrait} 1200w`);
  }
  document.querySelectorAll('.contact-avatar').forEach(image => {
    image.setAttribute('src', owner.photo || owner.avatar);
    image.alt = owner.photo ? `Преподаватель математики ${name}` : 'Тот же мультяшный преподаватель';
  });

  const links = safeContactLinks(config.contact);
  const makeLink = link => {
    const anchor = document.createElement('a');
    anchor.textContent = link.title;
    anchor.setAttribute('href', link.href);
    if (link.href.startsWith('https:')) { anchor.target = '_blank';anchor.rel = 'noopener noreferrer'; }
    return anchor;
  };
  document.querySelectorAll('[data-contact-links]').forEach(element => { element.replaceChildren(...links.map(makeLink)); });
  document.querySelectorAll('[data-contact-placeholder]').forEach(element => { element.hidden = links.length > 0 || !preview; });
  document.querySelectorAll('[data-menu-contact]').forEach(element => {
    element.hidden = !links.length && !preview;
    if (links[0]) element.replaceChildren(makeLink(links[0]));
    else element.textContent = 'Контакт будет добавлен';
  });
  const form = document.querySelector('#contact-form');
  if (form) form.hidden = true;
  document.querySelectorAll('[data-contact-note]').forEach(element => {
    element.hidden = !links.length && !preview && !config.contact.endpoint;
    element.textContent = links.length ? 'Свяжитесь напрямую удобным способом.'
      : config.contact.endpoint ? 'Для отправки обращения включите JavaScript.'
        : 'Это предпросмотр. Отправка обращений пока не подключена.';
  });
}
