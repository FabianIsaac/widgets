import { CalendarDate } from "@domain/calendar/value-objects/CalendarDate";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { t, getLocale } from "@infrastructure/i18n/i18n";

/**
 * Returns a greeting string based on the current hour.
 * If a name is provided, appends it: "Buenos días, Fabian".
 */
function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let base: string;
  if (hour >= 6 && hour < 12) base = t("daily.greetingMorning");
  else if (hour >= 12 && hour < 19) base = t("daily.greetingAfternoon");
  else base = t("daily.greetingEvening");
  return name ? `${base}, ${name}` : base;
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
 * Renders the date section in a horizontal layout:
 *
 *   07      Lunes           ← day name clicks → weekly note
 *   ABR     Buenos días     ← month abbr clicks → monthly note
 */
export function renderDateCard(
  container: HTMLElement,
  calendarDate: CalendarDate,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
  name?: string
): void {
  const section = container.createDiv({ cls: "widget-daily__date" });

  // Left column: big day number + month abbreviation (clickable → monthly note)
  const left = section.createDiv({ cls: "widget-daily__date-left" });

  left.createEl("span", {
    cls: "widget-daily__day-number",
    text: String(calendarDate.dayNumber).padStart(2, "0"),
  });

  const monthEl = left.createEl("span", {
    cls: "widget-daily__month-abbr widget-daily__month-abbr--link",
    text: getMonthAbbr(calendarDate.raw, getLocale()),
  });
  monthEl.setAttribute("title", t("daily.openMonthlyNote"));
  monthEl.addEventListener("click", () => openPeriodicNoteUseCase.openMonthly(calendarDate.raw));

  // Right column: day name (clickable → weekly note) + greeting
  const right = section.createDiv({ cls: "widget-daily__date-right" });

  const dayNameEl = right.createEl("span", {
    cls: "widget-daily__day-name widget-daily__day-name--link",
    text: calendarDate.dayName,
  });
  dayNameEl.setAttribute("title", t("daily.openWeeklyNote"));
  dayNameEl.addEventListener("click", () => openPeriodicNoteUseCase.openWeekly(calendarDate.raw));

  right.createEl("span", {
    cls: "widget-daily__greeting",
    text: getGreeting(name),
  });
}
