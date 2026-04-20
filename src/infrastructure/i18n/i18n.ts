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
 * @param language - explicit language code ("en" | "es"). Pass "auto" or omit to
 *                   auto-detect from Obsidian's moment locale.
 */
export async function initI18n(language?: string): Promise<void> {
  const lng = (language && language !== "auto") ? language : detectLocale();

  if (i18next.isInitialized) {
    await i18next.changeLanguage(lng);
    return;
  }

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
 * Changes the active language at runtime (e.g. from the settings tab).
 * Re-renders of open notes happen automatically when the user navigates away
 * and back, or when notes are reloaded.
 */
export async function changeLanguage(lang: string): Promise<void> {
  await i18next.changeLanguage(lang === "auto" ? detectLocale() : lang);
}

/**
 * Translate a key using the current language.
 * Usage: t("dashboard.openDailyNote")
 */
export function t(key: string, vars?: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return i18next.t(key as any, vars as any) as string;
}

/**
 * Returns the currently active locale string (e.g. "en", "es").
 * When language setting is "auto", returns the detected Obsidian locale.
 */
export function getLocale(): string {
  return i18next.language ?? detectLocale();
}
