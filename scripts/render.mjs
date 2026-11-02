import { parseHTML } from '../tests/vendor/linkedom.mjs';
import { siteConfig } from '../src/config.js';
import { applyContent } from '../src/content.js';

/** Render the same configured content without running browser behavior. */
export function renderHTML(html, config = siteConfig) {
  const { document } = parseHTML(html);
  applyContent(document, config);
  return document.toString();
}
