import { CalendarDate } from "@domain/calendar/value-objects/CalendarDate";
import { t, getLocale } from "@infrastructure/i18n/i18n";

/**
 * Returns the ISO week number for a given date (ISO 8601).
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86_400_000 + 1) / 7);
}

/**
 * Returns a greeting string based on the current hour.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return t("daily.greetingMorning");
  if (hour >= 12 && hour < 19) return t("daily.greetingAfternoon");
  return t("daily.greetingEvening");
}

/**
 * Returns the 3-letter month abbreviation in the given locale, uppercased.
 * e.g. "ABR", "APR", "NOV"
 */
function getMonthAbbr(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

/**
 * Renders the left date card:
 *   ┌─────────────────┐
 *   │   07            │  ← big day number
 *   │   ABR           │  ← 3-letter month abbr
 *   └─────────────────┘
 *   Lunes • Semana 15    ← day name + week number
 *   Buenos días          ← greeting
 */
export function renderDateCard(container: HTMLElement, calendarDate: CalendarDate): void {
  const wrapper = container.createDiv({ cls: "widget-daily__date-section" });

  // Card with big number + month abbreviation
  const card = wrapper.createDiv({ cls: "widget-daily__date-card" });

  card.createEl("span", {
    cls: "widget-daily__day-number",
    text: String(calendarDate.dayNumber).padStart(2, "0"),
  });

  card.createEl("span", {
    cls: "widget-daily__month-abbr",
    text: getMonthAbbr(calendarDate.raw, getLocale()),
  });

  // Day name + week number row
  const meta = wrapper.createDiv({ cls: "widget-daily__date-meta" });

  meta.createEl("span", {
    cls: "widget-daily__day-name",
    text: calendarDate.dayName,
  });

  meta.createEl("span", {
    cls: "widget-daily__week-number",
    text: `${t("daily.week")} ${getISOWeekNumber(calendarDate.raw)}`,
  });

  // Greeting
  wrapper.createEl("span", {
    cls: "widget-daily__greeting",
    text: getGreeting(),
  });
}
