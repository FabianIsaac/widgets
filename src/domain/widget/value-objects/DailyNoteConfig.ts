import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";

/**
 * Full configuration parsed from a widget-daily code block.
 */
export interface DailyNoteConfig {
  /** Date for this note in YYYY-MM-DD format. Defaults to today if omitted. */
  date?: string;
  /** Optional weather section configuration */
  weather?: WeatherConfig;
  /** Optional name for personalized greeting ("Buenos días, Fabian") */
  name?: string;
  /**
   * Configuration for the gratitude input section.
   * `heading` is the markdown heading to append bullets to.
   * `after` is the hour (0–23) from which the input becomes visible. Defaults to 0.
   */
  gratitude?: {
    heading: string;
    after?: number;
  };
}
