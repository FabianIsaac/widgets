import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { DailyForecast } from "@domain/weather/value-objects/DailyForecast";

/**
 * Port for fetching a multi-day weather forecast.
 * Implementation lives in the infrastructure layer.
 */
export interface IWeatherForecastPort {
  /**
   * Fetches the 7-day forecast for the ISO week starting on the given Monday.
   * @param config  Weather location and unit settings
   * @param weekMonday  The Monday of the target ISO week (time is irrelevant)
   */
  fetchWeekForecast(config: WeatherConfig, weekMonday: Date): Promise<DailyForecast[]>;
}
