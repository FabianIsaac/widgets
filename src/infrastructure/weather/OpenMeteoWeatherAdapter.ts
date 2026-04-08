import { IWeatherPort } from "@domain/weather/ports/IWeatherPort";
import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

/**
 * Infrastructure adapter: fetches current weather from the Open-Meteo API.
 * Free, no API key required. Uses lat/lon coordinates.
 * Docs: https://open-meteo.com/en/docs
 */
export class OpenMeteoWeatherAdapter implements IWeatherPort {
  async fetchCurrentWeather(config: WeatherConfig): Promise<WeatherData> {
    const units = config.units ?? "celsius";
    const tempUnit = units === "celsius" ? "celsius" : "fahrenheit";

    const params = new URLSearchParams({
      latitude: config.latitude.toString(),
      longitude: config.longitude.toString(),
      current: "temperature_2m,weather_code,wind_speed_10m",
      temperature_unit: tempUnit,
      wind_speed_unit: "kmh",
      forecast_days: "1",
      timezone: "auto",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;

    return {
      temperature: Math.round(current.temperature_2m),
      weatherCode: current.weather_code,
      windSpeed: Math.round(current.wind_speed_10m),
      units,
      location: config.location,
    };
  }
}
