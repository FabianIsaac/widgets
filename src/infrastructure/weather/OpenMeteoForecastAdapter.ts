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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Infrastructure adapter: fetches a 7-day weekly forecast from Open-Meteo.
 * Uses past_days=6&forecast_days=7 to guarantee coverage of any day of the week,
 * then filters the response to the exact Mon–Sun of the requested week.
 */
export class OpenMeteoForecastAdapter implements IWeatherForecastPort {
  async fetchWeekForecast(
    config: WeatherConfig,
    weekMonday: Date
  ): Promise<DailyForecast[]> {
    const tempUnit = config.units === "fahrenheit" ? "fahrenheit" : "celsius";

    const params = new URLSearchParams({
      latitude: config.latitude.toString(),
      longitude: config.longitude.toString(),
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      temperature_unit: tempUnit,
      timezone: "auto",
      past_days: "6",
      forecast_days: "7",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo forecast error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenMeteoDailyResponse;
    const { time, weather_code, temperature_2m_max, temperature_2m_min } = data.daily;

    // Build the 7 ISO date strings for Mon–Sun of the requested week
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekMonday);
      d.setDate(d.getDate() + i);
      return toLocalISODate(d);
    });

    return weekDates.map((isoDate, i) => {
      const idx = time.indexOf(isoDate);
      const fallbackDate = new Date(weekMonday);
      fallbackDate.setDate(weekMonday.getDate() + i);

      if (idx === -1) {
        // Day not in API response — return placeholder with code -1
        return { date: fallbackDate, weatherCode: -1, maxTemp: 0, minTemp: 0 };
      }

      return {
        date: fallbackDate,
        weatherCode: weather_code[idx],
        maxTemp: Math.round(temperature_2m_max[idx]),
        minTemp: Math.round(temperature_2m_min[idx]),
      };
    });
  }
}
