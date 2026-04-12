import { WeatherData } from "@domain/weather/value-objects/WeatherData";
import { getWeatherCondition } from "@infrastructure/weather/WmoWeatherConditions";
import { t, getLocale } from "@infrastructure/i18n/i18n";

/**
 * Renders a loading placeholder while weather is being fetched.
 */
export function renderWeatherLoading(container: HTMLElement): void {
  container.createEl("span", {
    cls: "widget-daily__weather-loading",
    text: t("daily.fetchingWeather"),
  });
}

/**
 * Renders an error state when weather fetch fails.
 */
export function renderWeatherError(container: HTMLElement): void {
  container.createEl("span", {
    cls: "widget-daily__weather-error",
    text: t("daily.weatherError"),
  });
}

/**
 * Renders the weather card with current conditions.
 *
 * Layout:
 *   ☀️  22°C
 *   Cielo despejado
 *   📍 CDMX  💨 12 km/h
 */
export function renderWeatherData(
  container: HTMLElement,
  data: WeatherData
): void {
  const condition = getWeatherCondition(data.weatherCode, getLocale());
  const unitSymbol = data.units === "fahrenheit" ? "°F" : "°C";

  // Main row: emoji + min/max temperature
  const mainRow = container.createDiv({ cls: "widget-daily__weather-main" });

  mainRow.createEl("span", {
    cls: "widget-daily__weather-emoji",
    text: condition.emoji,
  });

  const tempEl = mainRow.createEl("span", { cls: "widget-daily__weather-temp" });
  tempEl.createEl("span", {
    cls: "widget-daily__weather-temp-min",
    text: `${data.tempMin}°`,
  });
  tempEl.createEl("span", {
    cls: "widget-daily__weather-temp-sep",
    text: " / ",
  });
  tempEl.createEl("span", {
    cls: "widget-daily__weather-temp-max",
    text: `${data.tempMax}${unitSymbol}`,
  });

  // Condition label
  container.createEl("span", {
    cls: "widget-daily__weather-condition",
    text: condition.label,
  });

  // Location + wind row
  const detailRow = container.createDiv({ cls: "widget-daily__weather-details" });

  if (data.location) {
    detailRow.createEl("span", {
      cls: "widget-daily__weather-location",
      text: `📍 ${data.location}`,
    });
  }

  detailRow.createEl("span", {
    cls: "widget-daily__weather-wind",
    text: `💨 ${data.windSpeed} km/h`,
  });
}
