import { App, MarkdownRenderChild, MarkdownPostProcessorContext, setIcon } from "obsidian";
import { ParseWeeklyNoteConfigUseCase } from "@application/weekly/ParseWeeklyNoteConfigUseCase";
import { FetchWeeklyForecastUseCase } from "@application/weekly/FetchWeeklyForecastUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { DailyForecast } from "@domain/weather/value-objects/DailyForecast";
import { getWeatherCondition } from "@infrastructure/weather/WmoWeatherConditions";
import { t, getLocale } from "@infrastructure/i18n/i18n";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns ISO week number (ISO 8601) for a given date */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86_400_000 + 1) / 7);
}

/** Returns the Monday of the ISO week containing the given date */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** True if two Dates represent the same calendar day */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 3-letter uppercase day abbreviation: "LUN", "MON", etc. */
function dayAbbr(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

/** 3-letter uppercase month abbreviation: "ABR", "APR", etc. */
function monthAbbr(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

/** Full month name, capitalized */
function monthName(date: Date, locale: string): string {
  const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

/**
 * Renders the widget header:
 *   [📅 Semana 15]
 *   Abril 2026          (or "Mar · Abr 2026" when the week spans two months)
 */
function renderWeekHeader(
  container: HTMLElement,
  monday: Date,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase
): void {
  const locale = getLocale();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekNum = getISOWeekNumber(monday);

  // Week number row — clickable to open weekly note
  const weekRow = container.createDiv({ cls: "widget-weekly__week-row" });
  const weekBtn = weekRow.createEl("button", { cls: "widget-weekly__week-btn" });
  setIcon(weekBtn.createSpan({ cls: "widget-weekly__week-icon" }), "calendar-range");
  weekBtn.createEl("span", { text: `${t("weekly.week")} ${weekNum}` });
  weekBtn.setAttribute("aria-label", t("weekly.openNote"));
  weekBtn.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openWeekly(monday);
  });

  // Month + year row
  const monthYearRow = container.createDiv({ cls: "widget-weekly__month-year" });
  if (monday.getMonth() === sunday.getMonth()) {
    monthYearRow.setText(`${monthName(monday, locale)} ${monday.getFullYear()}`);
  } else {
    // Week spans two months
    const m1 = monthAbbr(monday, locale);
    const m2 = monthAbbr(sunday, locale);
    const year = sunday.getFullYear();
    monthYearRow.setText(`${m1} · ${m2} ${year}`);
  }
}

/**
 * Renders a single day column inside the grid:
 *   LUN        ← day abbreviation (bold + accent if today)
 *    7         ← day number
 *   ☀️        ← weather emoji (if available)
 *   24° 18°   ← max / min temp (if available)
 *
 * The entire column is clickable and opens the daily note for that day.
 */
function renderDayColumn(
  row: HTMLElement,
  date: Date,
  forecast: DailyForecast | undefined,
  hasWeather: boolean,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase
): void {
  const locale = getLocale();
  const isToday = isSameDay(date, new Date());

  const col = row.createDiv({
    cls: ["widget-weekly__day-col", isToday ? "is-today" : ""].filter(Boolean).join(" "),
  });

  // Day abbreviation
  col.createEl("span", {
    cls: "widget-weekly__day-abbr",
    text: dayAbbr(date, locale),
  });

  // Day number
  col.createEl("span", {
    cls: "widget-weekly__day-num",
    text: String(date.getDate()),
  });

  // Weather section
  if (hasWeather) {
    if (forecast && forecast.weatherCode >= 0) {
      const condition = getWeatherCondition(forecast.weatherCode, locale);
      col.createEl("span", {
        cls: "widget-weekly__day-emoji",
        text: condition.emoji,
      });

      const unitSymbol = "°";  // units are handled by the adapter, just append °
      col.createEl("span", {
        cls: "widget-weekly__day-temp",
        text: `${forecast.maxTemp}${unitSymbol} ${forecast.minTemp}${unitSymbol}`,
      });
    } else {
      // Weather not yet loaded or unavailable — show placeholder
      col.createEl("span", { cls: "widget-weekly__day-emoji", text: "—" });
      col.createEl("span", { cls: "widget-weekly__day-temp widget-weekly__day-temp--loading", text: "…" });
    }
  }

  // Click to open daily note
  col.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openDaily(date);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

class WeeklyNoteWidgetComponent extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly parseUseCase: ParseWeeklyNoteConfigUseCase,
    private readonly fetchForecastUseCase: FetchWeeklyForecastUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly _app: App
  ) {
    super(containerEl);
  }

  onload(): void {
    const config = this.parseUseCase.execute(this.source);
    const container = this.containerEl.createDiv({ cls: "widget-weekly" });
    const today = new Date();
    const monday = getMondayOfWeek(today);
    const hasWeather = !!config.weather;

    // Week number + month/year header
    renderWeekHeader(container, monday, this.openPeriodicNoteUseCase);

    // 7-day grid — render immediately with placeholders for weather
    const grid = container.createDiv({ cls: "widget-weekly__days-grid" });
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    // Initial render with no forecast data
    weekDates.forEach((date) =>
      renderDayColumn(grid, date, undefined, hasWeather, this.openPeriodicNoteUseCase)
    );

    // If weather configured: fetch and re-render the grid
    if (config.weather) {
      this.fetchForecastUseCase
        .execute(config.weather, monday)
        .then((forecasts) => {
          grid.empty();
          weekDates.forEach((date, i) =>
            renderDayColumn(grid, date, forecasts[i], true, this.openPeriodicNoteUseCase)
          );
        })
        .catch(() => {
          // Leave weather slots showing "—" / "…" on error
        });
    }
  }
}

// ── Renderer entry point ──────────────────────────────────────────────────────

export class WeeklyNoteWidgetRenderer {
  constructor(
    private readonly parseUseCase: ParseWeeklyNoteConfigUseCase,
    private readonly fetchForecastUseCase: FetchWeeklyForecastUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new WeeklyNoteWidgetComponent(
        el,
        source,
        this.parseUseCase,
        this.fetchForecastUseCase,
        this.openPeriodicNoteUseCase,
        this.app
      )
    );
  }
}
