import i18next from "i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

/**
 * Detects the current locale from Obsidian's moment.js instance.
 * Falls back to "en" if not available.
 */
function detectLocale(): string {
  try {
    // Obsidian exposes moment globally; its locale reflects the app language
    const locale = (window as unknown as { moment?: { locale(): string } }).moment?.locale();
    if (locale && typeof locale === "string") {
      // Normalize: "es-419" → "es", "en-US" → "en"
      return locale.split("-")[0];
    }
  } catch {
    // ignore
  }
  return "en";
}

/**
 * Initializes i18next with English and Spanish resources.
 * Must be called once during plugin load.
 */
export async function initI18n(): Promise<void> {
  const lng = detectLocale();

  await i18next.init({
    lng,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    interpolation: { escapeValue: false },
  });
}

/**
 * Translate a key using the current language.
 * Usage: t("dashboard.openDailyNote")
 */
export function t(key: string): string {
  return i18next.t(key);
}

/**
 * Returns the currently active locale string (e.g. "en", "es").
 */
export function getLocale(): string {
  return detectLocale();
}
