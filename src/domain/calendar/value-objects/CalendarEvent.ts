/**
 * Value object representing a single calendar event.
 * Intentionally minimal — only the fields needed for display.
 */
export interface CalendarEvent {
  /** Event title. */
  summary: string;
  /** Local start time, or undefined for all-day events. */
  startTime?: string; // "HH:mm"
  /** Local end time, or undefined for all-day / no-end events. */
  endTime?: string;   // "HH:mm"
  /** True when the event has no specific time (full-day). */
  allDay: boolean;
}
