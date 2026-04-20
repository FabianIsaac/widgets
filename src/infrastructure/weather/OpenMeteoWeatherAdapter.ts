import { IWeatherPort } from "@domain/weather/ports/IWeatherPort";
import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";

// ── Response shapes ───────────────────────────────────────────────────────────

interface TodayResponse {
  current: {
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    temperature_2m_min: number[];
    temperature_2m_max: number[];
  };
}

/** Shared shape for archive (past) and date-specific forecast (future) responses. */
interface DailyOnlyResponse {
  daily: {
    weather_code: number[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    wind_speed_10m_max: number[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Infrastructure adapter: routes weather requests to the correct Open-Meteo
 * endpoint based on the requested date:
 *
 *   - Today   → /v1/forecast with `current` + `forecast_days=1`
 *               (real-time weather code and wind speed)
 *   - Past    → archive-api.open-meteo.com/v1/archive with explicit date range
 *               (actual historical observations)
 *   - Future  → /v1/forecast with `start_date` / `end_date`
 *               (up to 16-day forecast; returns null data beyond that)
 *
 * All endpoints are free and require no API key.
 */
export class OpenMeteoWeatherAdapter implements IWeatherPort {
  async fetchWeatherForDate(config: WeatherConfig, dateStr: string): Promise<WeatherData> {
    const today = localDateStr();

    if (dateStr === today) {
      return this.fetchToday(config);
    } else if (dateStr < today) {
      return this.fetchArchive(config, dateStr);
    } else {
      return this.fetchForecastDate(config, dateStr);
    }
  }

  // ── Today: current conditions + daily min/max ─────────────────────────────

  private async fetchToday(config: WeatherConfig): Promise<WeatherData> {
    const tempUnit = config.units === "fahrenheit" ? "fahrenheit" : "celsius";
    const params = new URLSearchParams({
      latitude: String(config.latitude),
      longitude: String(config.longitude),
      current: "weather_code,wind_speed_10m",
      daily: "temperature_2m_min,temperature_2m_max",
      temperature_unit: tempUnit,
      wind_speed_unit: "kmh",
      forecast_days: "1",
      timezone: "auto",
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
    const data = (await res.json()) as TodayResponse;

    return {
      tempMin: Math.round(data.daily.temperature_2m_min[0]),
      tempMax: Math.round(data.daily.temperature_2m_max[0]),
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      units: config.units ?? "celsius",
      location: config.location,
    };
  }

  // ── Past: Open-Meteo archive API ──────────────────────────────────────────

  private async fetchArchive(config: WeatherConfig, dateStr: string): Promise<WeatherData> {
    const tempUnit = config.units === "fahrenheit" ? "fahrenheit" : "celsius";
    const params = new URLSearchParams({
      latitude: String(config.latitude),
      longitude: String(config.longitude),
      start_date: dateStr,
      end_date: dateStr,
      daily: "weather_code,temperature_2m_min,temperature_2m_max,wind_speed_10m_max",
      temperature_unit: tempUnit,
      wind_speed_unit: "kmh",
      timezone: "auto",
    });

    const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo archive: ${res.status}`);
    const data = (await res.json()) as DailyOnlyResponse;

    return {
      tempMin: Math.round(data.daily.temperature_2m_min[0]),
      tempMax: Math.round(data.daily.temperature_2m_max[0]),
      weatherCode: data.daily.weather_code[0],
      windSpeed: Math.round(data.daily.wind_speed_10m_max[0]),
      units: config.units ?? "celsius",
      location: config.location,
    };
  }

  // ── Future: forecast API with explicit date range ─────────────────────────

  private async fetchForecastDate(config: WeatherConfig, dateStr: string): Promise<WeatherData> {
    const tempUnit = config.units === "fahrenheit" ? "fahrenheit" : "celsius";
    const params = new URLSearchParams({
      latitude: String(config.latitude),
      longitude: String(config.longitude),
      start_date: dateStr,
      end_date: dateStr,
      daily: "weather_code,temperature_2m_min,temperature_2m_max,wind_speed_10m_max",
      temperature_unit: tempUnit,
      wind_speed_unit: "kmh",
      timezone: "auto",
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo forecast: ${res.status}`);
    const data = (await res.json()) as DailyOnlyResponse;

    return {
      tempMin: Math.round(data.daily.temperature_2m_min[0]),
      tempMax: Math.round(data.daily.temperature_2m_max[0]),
      weatherCode: data.daily.weather_code[0],
      windSpeed: Math.round(data.daily.wind_speed_10m_max[0]),
      units: config.units ?? "celsius",
      location: config.location,
    };
  }
}
