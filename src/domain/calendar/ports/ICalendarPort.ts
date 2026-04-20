import { CalendarEvent } from "@domain/calendar/value-objects/CalendarEvent";

/**
 * Port: fetches calendar events for a given date from an external source.
 * The URL identifies the feed; `dateStr` is a YYYY-MM-DD string in local time.
 */
export interface ICalendarPort {
  fetchEventsForDate(url: string, dateStr: string): Promise<CalendarEvent[]>;
}
