import { ICalendarPort } from "@domain/calendar/ports/ICalendarPort";
import { CalendarEvent } from "@domain/calendar/value-objects/CalendarEvent";

/**
 * Application use case: fetch calendar events for a specific local date (YYYY-MM-DD).
 */
export class FetchTodayEventsUseCase {
  constructor(private readonly calendarPort: ICalendarPort) {}

  execute(url: string, dateStr: string): Promise<CalendarEvent[]> {
    return this.calendarPort.fetchEventsForDate(url, dateStr);
  }
}
