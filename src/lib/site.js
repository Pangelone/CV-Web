import shared from '../content/shared.json';
import en from '../content/en.json';
import es from '../content/es.json';
import pt from '../content/pt.json';
import it from '../content/it.json';
import fr from '../content/fr.json';

export const LANGS = ['en', 'es', 'pt', 'it', 'fr'];
export const CONTENT = { en, es, pt, it, fr };
export { shared };

export const SITE = shared.person.site;

/**
 * Canonical path for a language. English lives at the root.
 * No trailing slash: Firebase Hosting is configured with trailingSlash:false,
 * so a canonical ending in "/" would point at a URL that 301s.
 */
export const pathFor = (lang) => (lang === 'en' ? '/' : `/${lang}`);

/** Absolute URL for a language. */
export const urlFor = (lang) => (lang === 'en' ? `${SITE}/` : `${SITE}/${lang}`);

/** Where the generated PDF for a language lives. */
export const cvFor = (lang) => `/cv/CV-Pablo-Angelone-${lang.toUpperCase()}.pdf`;

/** Human duration for a job, e.g. "3 yrs". `to` may be "Present". */
export function duration(from, to, ui) {
  const start = Number(from);
  const end = /^\d{4}$/.test(String(to)) ? Number(to) : new Date().getFullYear();
  const years = Math.max(1, end - start);
  return `${years} ${years === 1 ? ui.yr : ui.yrs}`;
}

/** "2024 — 2025" / "2025 — Present", localised. */
export function range(from, to, ui) {
  return `${from} — ${/^\d{4}$/.test(String(to)) ? to : ui.present}`;
}

export const waLink = (text) =>
  `https://api.whatsapp.com/send?phone=${shared.person.phoneDigits}&text=${encodeURIComponent(text)}`;
