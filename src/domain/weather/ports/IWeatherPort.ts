import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";

/**
 * Port for fetching weather data for a specific local date (YYYY-MM-DD).
 * Implementations pick the right API endpoint based on whether the date
 * is today, in the past, or in the future.
 */
export interface IWeatherPort {
  fetchWeatherForDate(config: WeatherConfig, dateStr: string): Promise<WeatherData>;
}
