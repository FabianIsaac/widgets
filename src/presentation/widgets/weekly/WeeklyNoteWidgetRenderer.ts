import { App, MarkdownRenderChild, MarkdownPostProcessorContext, TFile } from "obsidian";
import { resolveWeatherConfig } from "@infrastructure/weather/WeatherConfigResolver";
import { SettingsManager } from "@presentation/settings/SettingsManager";
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

/**
 * Returns the Monday of a specific ISO week number and year.
 * ISO 8601: week 1 is the week containing the first Thursday of the year.
 */
function getMondayOfISOWeek(week: number, year: number): Date {
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // convert Sun=0 to 7
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return monday;
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
 *   SEMANA 15           ← small label (not clickable)
 *   Abril  2026         ← month (clickable → monthly note) + year (clickable → yearly note)
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

  // Representative date for monthly/yearly navigation: use Sunday's month when
  // the week spans two months, so the heading shows the ending month.
  const refDate = monday.getMonth() === sunday.getMonth() ? monday : sunday;

  const header = container.createDiv({ cls: "widget-weekly__header" });

  header.createEl("span", {
    cls: "widget-weekly__week-label",
    text: `${t("weekly.week")} ${weekNum}`,
  });

  const headingRow = header.createDiv({ cls: "widget-weekly__heading-row" });

  // Month — opens monthly note
  const monthEl = headingRow.createEl("span", {
    cls: "widget-weekly__month-heading",
    text: monday.getMonth() === sunday.getMonth()
      ? monthName(monday, locale)
      : `${monthAbbr(monday, locale)} · ${monthAbbr(sunday, locale)}`,
  });
  monthEl.setAttribute("title", t("weekly.openMonthlyNote"));
  monthEl.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openMonthly(refDate);
  });

  // Year — opens yearly note
  const yearEl = headingRow.createEl("span", {
    cls: "widget-weekly__year-heading",
    text: String(refDate.getFullYear()),
  });
  yearEl.setAttribute("title", t("weekly.openYearlyNote"));
  yearEl.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openYearly(refDate);
  });
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

  const day = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;

  const col = row.createDiv({
    cls: ["widget-weekly__day-col", isToday ? "is-today" : "", isWeekend ? "is-weekend" : ""].filter(Boolean).join(" "),
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

/** Formats a Date as "YYYY-MM-DD" in local time */
function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ── Weather cache helpers ─────────────────────────────────────────────────────

const FORECAST_CACHE_KEY = "widget_weekly_weather_v2";

/** Reads cached forecast from frontmatter if stored for the same week monday. Returns null if missing or stale. */
function readForecastCache(app: App, file: TFile, mondayStr: string): DailyForecast[] | null {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  const cached = fm?.[FORECAST_CACHE_KEY];
  if (!cached || cached.weekMonday !== mondayStr || !Array.isArray(cached.forecasts)) return null;
  return (cached.forecasts as { date: string; weatherCode: number; maxTemp: number; minTemp: number }[]).map(
    (f) => ({ date: new Date(f.date), weatherCode: f.weatherCode, maxTemp: f.maxTemp, minTemp: f.minTemp })
  );
}

/** Saves the 7-day forecast to the note's frontmatter, keyed by the week's monday. */
async function writeForecastCache(app: App, file: TFile, forecasts: DailyForecast[], mondayStr: string): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[FORECAST_CACHE_KEY] = {
      weekMonday: mondayStr,
      forecasts: forecasts.map((f) => ({
        date: f.date.toISOString().slice(0, 10),
        weatherCode: f.weatherCode,
        maxTemp: f.maxTemp,
        minTemp: f.minTemp,
      })),
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

class WeeklyNoteWidgetComponent extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly sourcePath: string,
    private readonly parseUseCase: ParseWeeklyNoteConfigUseCase,
    private readonly fetchForecastUseCase: FetchWeeklyForecastUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {
    super(containerEl);
  }

  onload(): void {
    const config = this.parseUseCase.execute(this.source);
    const container = this.containerEl.createDiv({ cls: "widget-weekly" });

    const today = new Date();
    const monday = (config.week != null)
      ? getMondayOfISOWeek(config.week, config.year ?? today.getFullYear())
      : getMondayOfWeek(today);
    const weatherConfig = resolveWeatherConfig(config.weather, this.settingsManager.get());

    renderWeekHeader(container, monday, this.openPeriodicNoteUseCase);

    const grid = container.createDiv({ cls: "widget-weekly__days-grid" });
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    if (!weatherConfig) {
      weekDates.forEach((date) =>
        renderDayColumn(grid, date, undefined, false, this.openPeriodicNoteUseCase)
      );
      return;
    }

    // Initial render with placeholders
    weekDates.forEach((date) =>
      renderDayColumn(grid, date, undefined, true, this.openPeriodicNoteUseCase)
    );

    const file = this.app.vault.getAbstractFileByPath(this.sourcePath) as TFile;
    const mondayStr = toLocalISODate(monday);
    const cached = readForecastCache(this.app, file, mondayStr);

    if (cached) {
      grid.empty();
      weekDates.forEach((date, i) =>
        renderDayColumn(grid, date, cached[i], true, this.openPeriodicNoteUseCase)
      );
    } else {
      this.fetchForecastUseCase
        .execute(weatherConfig, monday)
        .then(async (forecasts) => {
          grid.empty();
          weekDates.forEach((date, i) =>
            renderDayColumn(grid, date, forecasts[i], true, this.openPeriodicNoteUseCase)
          );
          await writeForecastCache(this.app, file, forecasts, mondayStr);
        })
        .catch(() => {
          // Leave placeholders showing "—" / "…" on error
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
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new WeeklyNoteWidgetComponent(
        el,
        source,
        ctx.sourcePath,
        this.parseUseCase,
        this.fetchForecastUseCase,
        this.openPeriodicNoteUseCase,
        this.app,
        this.settingsManager
      )
    );
  }
}
