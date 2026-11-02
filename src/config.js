/** Единственное место для замены сведений владельца. null не превращается в выдуманный факт. */
export const siteConfig = {
  preview: true,
  owner: {
    name: '[Имя Фамилия]',
    role: 'Репетитор по математике',
    audience: null,
    format: null,
    city: null,
    experience: null,
    education: null,
    durationMinutes: null,
    price: null,
    currency: '₽',
    photo: null,
    portrait: '/assets/character/tutor-1200.webp',
    portraitSmall: '/assets/character/tutor-640.webp',
    avatar: '/assets/character/avatar.webp',
  },
  contact: {
    telegram: null, // username без @, например 'my_username'
    email: null,
    phone: null, // международный формат
    endpoint: null, // ваш серверный HTTPS endpoint. Секреты в браузере не хранить.
    privacyUrl: null, // ссылка на предоставленную политику
  },
  services: [
    { title: 'Школьная математика', description: 'Разобраться в темах и укрепить базу', confirmed: false, topic: 'linear' },
    { title: 'Подготовка к ОГЭ', description: 'Системная практика и понимание решений', confirmed: false, topic: 'geometry' },
    { title: 'Подготовка к ЕГЭ', description: 'От базовых связей к сложным задачам', confirmed: false, topic: 'quadratic' },
  ],
  approach: {
    confirmed: false,
    text: 'Важен не только ответ. Важно разобраться, откуда берётся каждый шаг, и попробовать решить похожую задачу самостоятельно.',
  },
  processConfirmed: false,
  testimonials: [], // только реальные предоставленные отзывы
};

export function safeContactLinks(contact = siteConfig.contact) {
  const links = [];
  if (typeof contact.telegram === 'string' && /^[a-zA-Z0-9_]{5,32}$/.test(contact.telegram.replace(/^@/, ''))) {
    links.push({ title: 'Telegram', href: `https://t.me/${contact.telegram.replace(/^@/, '')}` });
  }
  if (typeof contact.email === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact.email)) {
    links.push({ title: contact.email, href: `mailto:${contact.email}` });
  }
  if (typeof contact.phone === 'string' && /^\+?[0-9 ()-]{7,24}$/.test(contact.phone) && contact.phone.replace(/\D/g, '').length >= 7) {
    links.push({ title: contact.phone, href: `tel:${contact.phone.replace(/[ ()-]/g, '')}` });
  }
  return links;
}
