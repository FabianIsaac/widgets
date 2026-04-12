import { setIcon } from "obsidian";
import { CalendarDate } from "@domain/calendar/value-objects/CalendarDate";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { t } from "@infrastructure/i18n/i18n";

/**
 * Presentation: renders Row 2 of the dashboard widget — the date bar.
 *
 * Layout: [DayName  DayNumber  MonthName]   [weekly-icon]
 *
 * - Clicking the date text opens today's daily note.
 * - Clicking the calendar icon opens this week's weekly note.
 */
export function renderDateBar(
  container: HTMLElement,
  calendarDate: CalendarDate,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase
): void {
  const row = container.createDiv({ cls: "widget-dashboard__date-bar" });

  // --- Accent dot ---
  row.createEl("span", { cls: "widget-dashboard__date-dot" });

  // --- Date text (opens daily note) ---
  const dateText = row.createEl("span", {
    cls: "widget-dashboard__date-text",
    text: `${calendarDate.dayName} ${calendarDate.dayNumber} ${calendarDate.monthName}`,
  });
  dateText.setAttribute("aria-label", t("dashboard.openDailyNote"));
  dateText.setAttribute("title", t("dashboard.openDailyNote"));
  dateText.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openDaily(calendarDate.raw);
  });

  // --- Weekly note icon ---
  const weeklyBtn = row.createEl("div", {
    cls: "widget-dashboard__weekly-btn",
  });
  setIcon(weeklyBtn, "calendar-days");
  weeklyBtn.setAttribute("aria-label", t("dashboard.openWeeklyNote"));
  weeklyBtn.setAttribute("title", t("dashboard.openWeeklyNote"));
  weeklyBtn.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openWeekly(calendarDate.raw);
  });
}
