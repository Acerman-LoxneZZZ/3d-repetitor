import { siteConfig, safeContactLinks } from './config.js';

export function validateContact(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Укажите, как к вам обращаться.';
  else if (values.name.trim().length > 100) errors.name = 'Оставьте имя длиной до 100 символов.';
  const contact = values.contact?.trim() || '';
  if (!contact) errors.contact = 'Добавьте контакт, по которому можно с вами связаться.';
  else if (values.method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) errors.contact = 'Проверьте email: например name@example.com.';
  else if (values.method === 'phone' && (!/^\+?[\d ()-]{7,24}$/.test(contact) || contact.replace(/\D/g, '').length < 7)) errors.contact = 'Укажите телефон с кодом страны.';
  else if (values.method === 'telegram' && !/^@?[a-zA-Z0-9_]{5,32}$/.test(contact) && !/^https:\/\/t\.me\/[a-zA-Z0-9_]{5,32}\/?$/.test(contact)) errors.contact = 'Укажите имя Telegram от 5 символов или ссылку https://t.me/username.';
  return errors;
}

export function initContact() {
  const { contact, preview } = siteConfig;
  const links = safeContactLinks();
  const linksContainer = document.querySelector('[data-contact-links]');
  linksContainer?.replaceChildren();
  if (linksContainer) links.forEach(link => {
    const anchor = document.createElement('a');anchor.textContent = link.title;anchor.href = link.href;
    if (link.href.startsWith('https:')) { anchor.target = '_blank';anchor.rel = 'noopener noreferrer'; }
    linksContainer.append(anchor);
  });
  const placeholder = document.querySelector('[data-contact-placeholder]');
  if (placeholder) placeholder.hidden = links.length > 0 || !preview;
  const menuContact = document.querySelector('[data-menu-contact]');
  if (menuContact && links[0]) { const anchor = document.createElement('a');anchor.href = links[0].href;anchor.textContent = links[0].title;menuContact.replaceChildren(anchor); }
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const note = document.querySelector('[data-contact-note]');
  let endpoint;
  try { endpoint = contact.endpoint ? new URL(contact.endpoint, location.origin) : null;if (endpoint && !['https:', 'http:'].includes(endpoint.protocol)) endpoint = null; } catch { endpoint = null; }
  if (!endpoint) {
    form.hidden = true;
    if (note) {
      note.hidden = !preview;
      note.textContent = links.length ? 'Свяжитесь напрямую удобным способом.' : 'Это предпросмотр. Отправка обращений пока не подключена.';
    }
    return;
  }
  form.hidden = false;
  if (note) { note.textContent = 'Оставьте контакт и коротко опишите вашу задачу.';note.hidden = false; }
  const privacy = form.querySelector('[data-privacy]');
  if (contact.privacyUrl && privacy) {
    let url;
    try { url = new URL(contact.privacyUrl, location.origin); } catch { url = null; }
    if (url && ['https:', 'http:'].includes(url.protocol)) {
      privacy.append('Перед отправкой ознакомьтесь с ');const anchor = document.createElement('a');anchor.href = url.href;anchor.textContent = 'политикой обработки данных';privacy.append(anchor, '.');
    }
  }
  let pending = false;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('[data-submit]');
  const originalButton = button.innerHTML;
  const fields = { name: form.elements.name, contact: form.elements.contact };
  function clearError(key) { fields[key].removeAttribute('aria-invalid');document.getElementById(key === 'name' ? 'name-error' : 'contact-error').textContent = ''; }
  Object.entries(fields).forEach(([key, input]) => input.addEventListener('input', () => clearError(key)));
  form.addEventListener('submit', async event => {
    event.preventDefault();if (pending) return;
    const values = Object.fromEntries(new FormData(form));
    const errors = validateContact(values);
    Object.keys(fields).forEach(clearError);
    status.textContent = '';status.dataset.state = '';
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([key, message]) => { fields[key].setAttribute('aria-invalid', 'true');document.getElementById(key === 'name' ? 'name-error' : 'contact-error').textContent = message; });
      fields[Object.keys(errors)[0]].focus();return;
    }
    pending = true;button.disabled = true;button.textContent = 'Отправляем…';form.setAttribute('aria-busy', 'true');
    const controller = new AbortController();const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint.href, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(values), signal: controller.signal, credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error('unconfirmed delivery');
      status.dataset.state = 'success';status.textContent = 'Обращение отправлено. Преподаватель получил ваш контакт.';
      form.reset();
    } catch (error) {
      status.dataset.state = 'error';status.textContent = error.name === 'AbortError' ? 'Не удалось дождаться ответа. Данные сохранены в форме. Попробуйте снова или свяжитесь напрямую.' : 'Не удалось подтвердить отправку. Данные сохранены в форме. Попробуйте снова или свяжитесь напрямую.';
    } finally { clearTimeout(timeout);pending = false;button.disabled = false;button.innerHTML = originalButton;form.removeAttribute('aria-busy'); }
  });
}
