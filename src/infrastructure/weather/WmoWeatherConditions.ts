/**
 * WMO Weather Interpretation Code descriptions and emojis.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */

interface WmoCondition {
  emoji: string;
  en: string;
  es: string;
}

const WMO_CONDITIONS: Record<number, WmoCondition> = {
  0:  { emoji: "☀️",  en: "Clear sky",                   es: "Cielo despejado" },
  1:  { emoji: "🌤️", en: "Mainly clear",                es: "Mayormente despejado" },
  2:  { emoji: "⛅",  en: "Partly cloudy",               es: "Parcialmente nublado" },
  3:  { emoji: "☁️",  en: "Overcast",                    es: "Nublado" },
  45: { emoji: "🌫️", en: "Foggy",                       es: "Neblina" },
  48: { emoji: "🌫️", en: "Rime fog",                    es: "Niebla helada" },
  51: { emoji: "🌦️", en: "Light drizzle",               es: "Llovizna ligera" },
  53: { emoji: "🌦️", en: "Drizzle",                     es: "Llovizna" },
  55: { emoji: "🌧️", en: "Heavy drizzle",               es: "Llovizna intensa" },
  56: { emoji: "🌧️", en: "Freezing drizzle",            es: "Llovizna helada" },
  57: { emoji: "🌧️", en: "Heavy freezing drizzle",      es: "Llovizna helada intensa" },
  61: { emoji: "🌧️", en: "Light rain",                  es: "Lluvia ligera" },
  63: { emoji: "🌧️", en: "Rain",                        es: "Lluvia" },
  65: { emoji: "🌧️", en: "Heavy rain",                  es: "Lluvia intensa" },
  66: { emoji: "🌧️", en: "Freezing rain",               es: "Lluvia helada" },
  67: { emoji: "🌧️", en: "Heavy freezing rain",         es: "Lluvia helada intensa" },
  71: { emoji: "❄️",  en: "Light snow",                  es: "Nieve ligera" },
  73: { emoji: "❄️",  en: "Snow",                        es: "Nieve" },
  75: { emoji: "❄️",  en: "Heavy snow",                  es: "Nieve intensa" },
  77: { emoji: "🌨️", en: "Snow grains",                 es: "Granizo de nieve" },
  80: { emoji: "🌦️", en: "Light rain showers",          es: "Chubascos ligeros" },
  81: { emoji: "🌧️", en: "Rain showers",                es: "Chubascos" },
  82: { emoji: "⛈️",  en: "Violent rain showers",        es: "Chubascos violentos" },
  85: { emoji: "🌨️", en: "Snow showers",                es: "Nieve con viento" },
  86: { emoji: "🌨️", en: "Heavy snow showers",          es: "Nieve intensa con viento" },
  95: { emoji: "⛈️",  en: "Thunderstorm",                es: "Tormenta eléctrica" },
  96: { emoji: "⛈️",  en: "Thunderstorm with hail",      es: "Tormenta con granizo" },
  99: { emoji: "⛈️",  en: "Thunderstorm, heavy hail",    es: "Tormenta con granizo intenso" },
};

const FALLBACK: WmoCondition = { emoji: "🌡️", en: "Unknown", es: "Desconocido" };

/**
 * Returns the emoji and localized description for a WMO weather code.
 * @param code - WMO weather interpretation code
 * @param locale - language code ("en" | "es")
 */
export function getWeatherCondition(
  code: number,
  locale: string
): { emoji: string; label: string } {
  const condition = WMO_CONDITIONS[code] ?? FALLBACK;
  const lang = locale.startsWith("es") ? "es" : "en";
  return { emoji: condition.emoji, label: condition[lang] };
}
