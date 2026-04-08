import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";

/**
 * Port for fetching current weather data.
 * Implementations live in the infrastructure layer.
 */
export interface IWeatherPort {
  fetchCurrentWeather(config: WeatherConfig): Promise<WeatherData>;
}
