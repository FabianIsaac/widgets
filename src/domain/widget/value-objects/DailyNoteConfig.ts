import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";

/**
 * Full configuration parsed from a widget-daily code block.
 */
export interface DailyNoteConfig {
  /** Optional weather section configuration */
  weather?: WeatherConfig;
}
