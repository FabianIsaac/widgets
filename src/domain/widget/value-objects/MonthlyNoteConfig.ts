/**
 * Full configuration parsed from a widget-monthly code block.
 */
export interface MonthlyNoteConfig {
  /** Month number (1–12). Defaults to current month if omitted. */
  month?: number;
  /** Full year (e.g. 2026). Defaults to current year if omitted. */
  year?: number;
  /** When true, renders a tag-color legend below the calendar grid. */
  legend?: boolean;
}
