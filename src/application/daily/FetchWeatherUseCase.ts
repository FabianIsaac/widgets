import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";
import { IWeatherPort } from "@domain/weather/ports/IWeatherPort";

/**
 * Application use case: fetch current weather for the configured location.
 */
export class FetchWeatherUseCase {
  constructor(private readonly weatherPort: IWeatherPort) {}

  async execute(config: WeatherConfig): Promise<WeatherData> {
    return this.weatherPort.fetchCurrentWeather(config);
  }
}
