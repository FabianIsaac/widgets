import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WidgetPluginSettings } from "@presentation/settings/SettingsManager";

/**
 * Merges a widget-level WeatherConfig with plugin-level defaults.
 * Widget values always take precedence. Returns null if no coordinates
 * are available from either source.
 */
export function resolveWeatherConfig(
  widgetWeather: WeatherConfig | undefined,
  settings: WidgetPluginSettings
): WeatherConfig | null {
  const lat = widgetWeather?.latitude ?? Number(settings.latitude);
  const lon = widgetWeather?.longitude ?? Number(settings.longitude);

  if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;

  return {
    latitude: lat,
    longitude: lon,
    location: widgetWeather?.location || settings.location || undefined,
    units: widgetWeather?.units ?? settings.units,
  };
}
