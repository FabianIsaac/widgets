import { setIcon } from "obsidian";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { t, getLocale } from "@infrastructure/i18n/i18n";

/**
 * Returns the 3-letter month abbreviation for a date.
 */
function shortMonth(date: Date): string {
  return new Intl.DateTimeFormat(getLocale(), { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

/**
 * Returns a date shifted by the given number of days.
 */
function shiftDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Renders the navigation row:
 *   [← 6 ABR]   [📖 Nota de hoy]   [8 ABR →]
 */
export function renderNavigation(
  container: HTMLElement,
  today: Date,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase
): void {
  const nav = container.createDiv({ cls: "widget-daily__nav" });

  const yesterday = shiftDate(today, -1);
  const tomorrow = shiftDate(today, 1);

  // ← Yesterday button
  const prevBtn = nav.createEl("button", { cls: "widget-daily__nav-btn" });
  setIcon(prevBtn.createSpan(), "arrow-left");
  prevBtn.createEl("span", {
    text: `${yesterday.getDate()} ${shortMonth(yesterday)}`,
  });
  prevBtn.setAttribute("aria-label", t("daily.prevDay"));
  prevBtn.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openDaily(yesterday);
  });

  // Open today's note (primary action)
  const openBtn = nav.createEl("button", { cls: "widget-daily__open-btn" });
  setIcon(openBtn.createSpan(), "book-open");
  openBtn.createEl("span", { text: t("daily.openNote") });
  openBtn.setAttribute("aria-label", t("daily.openDailyNote"));
  openBtn.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openDaily(today);
  });

  // Tomorrow → button
  const nextBtn = nav.createEl("button", { cls: "widget-daily__nav-btn" });
  nextBtn.createEl("span", {
    text: `${tomorrow.getDate()} ${shortMonth(tomorrow)}`,
  });
  setIcon(nextBtn.createSpan(), "arrow-right");
  nextBtn.setAttribute("aria-label", t("daily.nextDay"));
  nextBtn.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openDaily(tomorrow);
  });
}
