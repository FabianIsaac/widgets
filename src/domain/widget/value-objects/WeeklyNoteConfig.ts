import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";

/**
 * Full configuration parsed from a widget-weekly code block.
 */
export interface WeeklyNoteConfig {
  /** ISO week number (1–53). Defaults to current week if omitted. */
  week?: number;
  /** Full year (e.g. 2026). Required when week is provided, defaults to current year. */
  year?: number;
  /** Optional weather section for the 7-day forecast */
  weather?: WeatherConfig;
}
