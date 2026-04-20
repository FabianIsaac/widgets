import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";

/**
 * Configuration for a quick-capture button in the daily widget.
 */
export interface CaptureButtonConfig {
  /** Label shown on the button. Can include emoji, e.g. "💭 Pensamiento" */
  label: string;
  /**
   * Template for the line appended to the note.
   * Supports {text} (user input) and {time} (current HH:mm).
   * Example: "- {time} 💭 {text}"   or   "- [ ] {text}"
   */
  format: string;
  /** Markdown heading to append the line under. If omitted, appends at end of file. */
  heading?: string;
  /** Placeholder text for the input. Defaults to i18n "Agregar…" */
  placeholder?: string;
  /** Hour (0–23) from which this button is visible. Defaults to 0 (always). */
  after?: number;
  /**
   * Hour (0–23) until which this button is visible (exclusive).
   * When `after` > `until`, the range wraps midnight:
   * e.g. after:23 until:4 → visible from 23:00 to 03:59.
   * When omitted, the button stays visible for the rest of the day.
   */
  until?: number;
}

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
   * `tag` is an optional tag added to the note's frontmatter on first gratitude entry.
   */
  gratitude?: {
    heading: string;
    after?: number;
    tag?: string;
  };
  /** Configurable quick-capture buttons that append formatted lines to the daily note. */
  captures?: CaptureButtonConfig[];
  /**
   * One or more iCal feeds whose events are shown inside the widget.
   * In YAML either a single object or a list are accepted:
   *
   *   calendar:
   *     url: https://...
   *
   *   calendar:
   *     - url: https://...
   *     - url: https://...
   *
   * Normalized to an array at parse time.
   */
  calendars?: Array<{ url: string }>;
}
