import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";
import { IWeatherPort } from "@domain/weather/ports/IWeatherPort";

/**
 * Application use case: fetch weather for the configured location on a specific
 * local date (YYYY-MM-DD). The adapter decides whether to call the current,
 * archive, or forecast endpoint based on the date.
 */
export class FetchWeatherUseCase {
  constructor(private readonly weatherPort: IWeatherPort) {}

  async execute(config: WeatherConfig, dateStr: string): Promise<WeatherData> {
    return this.weatherPort.fetchWeatherForDate(config, dateStr);
  }
}
