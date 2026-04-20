import { CalendarEvent } from "@domain/calendar/value-objects/CalendarEvent";
import { t } from "@infrastructure/i18n/i18n";

/**
 * Renders a list of calendar events into `container`.
 * Pure synchronous function — caller is responsible for fetching/caching data.
 */
export function renderCalendarEventsList(container: HTMLElement, events: CalendarEvent[]): void {
  if (events.length === 0) return;

  const section = container.createDiv({ cls: "widget-daily__events" });
  for (const event of events) {
    const row = section.createDiv({ cls: "widget-daily__event" });

    const timeEl = row.createSpan({ cls: "widget-daily__event-time" });
    if (event.allDay) {
      timeEl.setText(t("daily.calendarAllDay"));
    } else if (event.startTime) {
      timeEl.setText(
        event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime
      );
    }

    row.createSpan({ cls: "widget-daily__event-title", text: event.summary });
  }
}

/**
 * Renders a loading placeholder while events are being fetched.
 * Returns the placeholder element so the caller can remove it when done.
 */
export function renderCalendarEventsLoading(container: HTMLElement): HTMLElement {
  const el = container.createDiv({ cls: "widget-daily__events-loading" });
  el.setText(t("daily.calendarLoading"));
  return el;
}
