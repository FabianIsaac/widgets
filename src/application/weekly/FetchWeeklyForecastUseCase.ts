import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { DailyForecast } from "@domain/weather/value-objects/DailyForecast";
import { IWeatherForecastPort } from "@domain/weather/ports/IWeatherForecastPort";

export class FetchWeeklyForecastUseCase {
  constructor(private readonly forecastPort: IWeatherForecastPort) {}

  async execute(config: WeatherConfig, weekMonday: Date): Promise<DailyForecast[]> {
    return this.forecastPort.fetchWeekForecast(config, weekMonday);
  }
}
