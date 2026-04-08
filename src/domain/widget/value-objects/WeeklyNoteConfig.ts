import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";

/**
 * Full configuration parsed from a widget-weekly code block.
 */
export interface WeeklyNoteConfig {
  /** Optional weather section for the 7-day forecast */
  weather?: WeatherConfig;
}
