import { IWeatherForecastPort } from "@domain/weather/ports/IWeatherForecastPort";
import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { DailyForecast } from "@domain/weather/value-objects/DailyForecast";

interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

/** Formats a Date as "YYYY-MM-DD" in local time */
function toLocalISODate(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function localDateStr(): string {
  return toLocalISODate(new Date());
}

/**
 * Infrastructure adapter: fetches a 7-day weekly forecast from Open-Meteo.
 *
 * Endpoint selection:
 *   - Week entirely in the past (sunday < today):
 *       archive-api.open-meteo.com/v1/archive  — historical observations
 *   - Current week or future:
 *       api.open-meteo.com/v1/forecast         — forecast + recent history
 *
 * Both endpoints accept explicit start_date / end_date.
 */
export class OpenMeteoForecastAdapter implements IWeatherForecastPort {
  async fetchWeekForecast(
    config: WeatherConfig,
    weekMonday: Date
  ): Promise<DailyForecast[]> {
    const tempUnit = config.units === "fahrenheit" ? "fahrenheit" : "celsius";
    const sunday = new Date(weekMonday);
    sunday.setDate(weekMonday.getDate() + 6);

    const startStr = toLocalISODate(weekMonday);
    const endStr = toLocalISODate(sunday);
    const today = localDateStr();

    // Use archive for weeks entirely in the past; forecast for current/future
    const isPastWeek = endStr < today;
    const baseUrl = isPastWeek
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";

    const params = new URLSearchParams({
      latitude: config.latitude.toString(),
      longitude: config.longitude.toString(),
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      temperature_unit: tempUnit,
      timezone: "auto",
      start_date: startStr,
      end_date: endStr,
    });

    const response = await fetch(`${baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo forecast error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenMeteoDailyResponse;
    const { time, weather_code, temperature_2m_max, temperature_2m_min } = data.daily;

    // Map Mon–Sun, matching by ISO date string to handle any gaps
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekMonday);
      date.setDate(weekMonday.getDate() + i);
      const isoDate = toLocalISODate(date);
      const idx = time.indexOf(isoDate);

      if (idx === -1) {
        return { date, weatherCode: -1, maxTemp: 0, minTemp: 0 };
      }
      return {
        date,
        weatherCode: weather_code[idx],
        maxTemp: Math.round(temperature_2m_max[idx]),
        minTemp: Math.round(temperature_2m_min[idx]),
      };
    });
  }
}
