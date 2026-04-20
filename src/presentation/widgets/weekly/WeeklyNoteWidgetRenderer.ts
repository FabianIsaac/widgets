import { App, MarkdownRenderChild, MarkdownPostProcessorContext, TFile, setTooltip } from "obsidian";
import { resolveWeatherConfig } from "@infrastructure/weather/WeatherConfigResolver";
import { SettingsManager } from "@presentation/settings/SettingsManager";
import { ParseWeeklyNoteConfigUseCase } from "@application/weekly/ParseWeeklyNoteConfigUseCase";
import { FetchWeeklyForecastUseCase } from "@application/weekly/FetchWeeklyForecastUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { DailyForecast } from "@domain/weather/value-objects/DailyForecast";
import { getWeatherCondition } from "@infrastructure/weather/WmoWeatherConditions";
import { t, getLocale } from "@infrastructure/i18n/i18n";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86_400_000 + 1) / 7);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getMondayOfISOWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return monday;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayAbbr(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

function monthAbbr(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

function monthName(date: Date, locale: string): string {
  const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDailyNoteFile(app: App, date: Date): TFile | null {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const candidates = [`${yyyy}-${mm}-${dd}`, `${dd}-${mm}-${yyyy}`];
  const files = app.vault.getMarkdownFiles();
  return files.find((f) => candidates.some((name) => f.basename === name)) ?? null;
}

function hasPendingTasks(app: App, file: TFile): boolean {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache?.listItems) return false;
  return cache.listItems.some((item) => item.task === " ");
}

const DAILY_NOTE_PATTERN = /^\d{4}-\d{2}-\d{2}$|^\d{2}-\d{2}-\d{4}$/;

interface WeekStats {
  completedTasks: number;
  totalTasks: number;
  pendingDays: number;
  topTags: Array<{ tag: string; count: number }>;
  newNotesCount: number;
}

function getWeekStats(app: App, monday: Date, excludedTagPrefixes: string[]): WeekStats {
  let completedTasks = 0, totalTasks = 0, pendingDays = 0;
  const tagCounts = new Map<string, number>();

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const file = getDailyNoteFile(app, date);
    if (!file) continue;
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) continue;

    // Tasks
    if (cache.listItems) {
      const tasks = cache.listItems.filter((item) => item.task !== undefined);
      const completed = tasks.filter((item) => item.task === "x" || item.task === "X").length;
      completedTasks += completed;
      totalTasks += tasks.length;
      if (tasks.some((item) => item.task === " ")) pendingDays++;
    }

    // Tags
    if (cache.tags) {
      for (const { tag } of cache.tags) {
        const normalized = tag.replace(/^#/, "");
        if (excludedTagPrefixes.some((prefix) => prefix && normalized.startsWith(prefix))) continue;
        tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
      }
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // New notes created this week (excluding daily notes by filename pattern)
  const weekStart = monday.getTime();
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 7);
  const weekEndTime = weekEnd.getTime();

  const newNotesCount = app.vault.getMarkdownFiles().filter((f) => {
    return f.stat.ctime >= weekStart &&
           f.stat.ctime < weekEndTime &&
           !DAILY_NOTE_PATTERN.test(f.basename);
  }).length;

  return { completedTasks, totalTasks, pendingDays, topTags, newNotesCount };
}

// ── Weather cache helpers ─────────────────────────────────────────────────────

const FORECAST_CACHE_KEY = "widget_weekly_weather_v2";

function readForecastCache(app: App, file: TFile, mondayStr: string): DailyForecast[] | null {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  const cached = fm?.[FORECAST_CACHE_KEY];
  if (!cached || cached.weekMonday !== mondayStr || !Array.isArray(cached.forecasts)) return null;
  return (cached.forecasts as { date: string; weatherCode: number; maxTemp: number; minTemp: number }[]).map(
    (f) => ({ date: new Date(f.date), weatherCode: f.weatherCode, maxTemp: f.maxTemp, minTemp: f.minTemp })
  );
}

async function writeForecastCache(app: App, file: TFile, forecasts: DailyForecast[], mondayStr: string): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[FORECAST_CACHE_KEY] = {
      weekMonday: mondayStr,
      forecasts: forecasts.map((f) => ({
        date: toLocalISODate(f.date), // local date, not UTC
        weatherCode: f.weatherCode,
        maxTemp: f.maxTemp,
        minTemp: f.minTemp,
      })),
    };
  });
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function renderWeekHeader(
  container: HTMLElement,
  monday: Date,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
  onPrev: () => void,
  onNext: () => void
): void {
  const locale = getLocale();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekNum = getISOWeekNumber(monday);
  const refDate = monday.getMonth() === sunday.getMonth() ? monday : sunday;

  const header = container.createDiv({ cls: "widget-weekly__header" });

  // Week label row with nav arrows
  const weekNav = header.createDiv({ cls: "widget-weekly__week-nav" });

  const prevBtn = weekNav.createEl("span", { cls: "widget-weekly__nav-btn", text: "‹" });
  setTooltip(prevBtn, t("weekly.prevWeek"));
  prevBtn.addEventListener("click", (e: MouseEvent) => { e.preventDefault(); onPrev(); });

  weekNav.createEl("span", {
    cls: "widget-weekly__week-label",
    text: `${t("weekly.week")} ${weekNum}`,
  });

  const nextBtn = weekNav.createEl("span", { cls: "widget-weekly__nav-btn", text: "›" });
  setTooltip(nextBtn, t("weekly.nextWeek"));
  nextBtn.addEventListener("click", (e: MouseEvent) => { e.preventDefault(); onNext(); });

  const headingRow = header.createDiv({ cls: "widget-weekly__heading-row" });

  const monthEl = headingRow.createEl("span", {
    cls: "widget-weekly__month-heading",
    text: monday.getMonth() === sunday.getMonth()
      ? monthName(monday, locale)
      : `${monthAbbr(monday, locale)} · ${monthAbbr(sunday, locale)}`,
  });
  setTooltip(monthEl, t("weekly.openMonthlyNote"));
  monthEl.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openMonthly(refDate);
  });

  const yearEl = headingRow.createEl("span", {
    cls: "widget-weekly__year-heading",
    text: String(refDate.getFullYear()),
  });
  setTooltip(yearEl, t("weekly.openYearlyNote"));
  yearEl.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openYearly(refDate);
  });
}

function renderDayColumn(
  row: HTMLElement,
  date: Date,
  forecast: DailyForecast | undefined,
  hasWeather: boolean,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
  hasPending: boolean
): void {
  const locale = getLocale();
  const isToday = isSameDay(date, new Date());
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  const col = row.createDiv({
    cls: ["widget-weekly__day-col", isToday ? "is-today" : "", isWeekend ? "is-weekend" : ""].filter(Boolean).join(" "),
  });

  col.createEl("span", { cls: "widget-weekly__day-abbr", text: dayAbbr(date, locale) });
  col.createEl("span", { cls: "widget-weekly__day-num", text: String(date.getDate()) });

  if (hasWeather) {
    if (forecast && forecast.weatherCode >= 0) {
      const condition = getWeatherCondition(forecast.weatherCode, locale);
      col.createEl("span", { cls: "widget-weekly__day-emoji", text: condition.emoji });
      col.createEl("span", {
        cls: "widget-weekly__day-temp",
        text: `${forecast.maxTemp}° ${forecast.minTemp}°`,
      });
    } else {
      col.createEl("span", { cls: "widget-weekly__day-emoji", text: "—" });
      col.createEl("span", { cls: "widget-weekly__day-temp widget-weekly__day-temp--loading", text: "…" });
    }
  }

  if (hasPending) {
    col.createDiv({ cls: "widget-weekly__day-task-dot" });
  }

  col.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    openPeriodicNoteUseCase.openDaily(date);
  });
}

function renderWeekSummary(container: HTMLElement, stats: WeekStats): void {
  const hasContent =
    stats.totalTasks > 0 || stats.pendingDays > 0 ||
    stats.topTags.length > 0 || stats.newNotesCount > 0;
  if (!hasContent) return;

  const summary = container.createDiv({ cls: "widget-weekly__summary" });

  // Tags row (left-aligned) — always present so metrics stay right-aligned
  const tagsEl = summary.createDiv({ cls: "widget-weekly__summary-tags" });
  for (const { tag } of stats.topTags) {
    tagsEl.createEl("span", { cls: "widget-weekly__summary-tag", text: `#${tag}` });
  }

  // Right-aligned metrics
  const metrics = summary.createDiv({ cls: "widget-weekly__summary-metrics" });

  if (stats.newNotesCount > 0) {
    const notesItem = metrics.createDiv({ cls: "widget-weekly__summary-item" });
    notesItem.createEl("span", { cls: "widget-weekly__summary-icon widget-weekly__summary-icon--notes", text: "+" });
    notesItem.createEl("span", { cls: "widget-weekly__summary-value", text: String(stats.newNotesCount) });
    setTooltip(notesItem, t("weekly.summaryNewNotesTooltip", { count: stats.newNotesCount }));
  }

  if (stats.totalTasks > 0) {
    const taskItem = metrics.createDiv({ cls: "widget-weekly__summary-item" });
    taskItem.createEl("span", { cls: "widget-weekly__summary-icon", text: "✓" });
    taskItem.createEl("span", { cls: "widget-weekly__summary-value", text: `${stats.completedTasks}/${stats.totalTasks}` });
    setTooltip(taskItem, t("weekly.summaryTasksTooltip", { completed: stats.completedTasks, total: stats.totalTasks }));
  }

  if (stats.pendingDays > 0) {
    const pendingItem = metrics.createDiv({ cls: "widget-weekly__summary-item" });
    pendingItem.createEl("span", { cls: "widget-weekly__summary-icon widget-weekly__summary-icon--pending", text: "○" });
    pendingItem.createEl("span", { cls: "widget-weekly__summary-value", text: String(stats.pendingDays) });
    setTooltip(pendingItem, t("weekly.summaryPendingTooltip", { count: stats.pendingDays }));
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

class WeeklyNoteWidgetComponent extends MarkdownRenderChild {
  private monday!: Date;
  private widget!: HTMLElement;

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
    const today = new Date();
    this.monday = (config.week != null)
      ? getMondayOfISOWeek(config.week, config.year ?? today.getFullYear())
      : getMondayOfWeek(today);

    this.widget = this.containerEl.createDiv({ cls: "widget-weekly" });
    this.renderWeek();
  }

  private openAdjacentWeek(delta: number): void {
    const target = new Date(this.monday);
    target.setDate(this.monday.getDate() + delta * 7);
    this.openPeriodicNoteUseCase.openWeekly(target);
  }

  private renderWeek(): void {
    const config = this.parseUseCase.execute(this.source);
    const weatherConfig = resolveWeatherConfig(config.weather, this.settingsManager.get());

    renderWeekHeader(
      this.widget,
      this.monday,
      this.openPeriodicNoteUseCase,
      () => this.openAdjacentWeek(-1),
      () => this.openAdjacentWeek(1)
    );

    const grid = this.widget.createDiv({ cls: "widget-weekly__days-grid" });
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.monday);
      d.setDate(this.monday.getDate() + i);
      return d;
    });

    const pendingByDay = weekDates.map((date) => {
      const file = getDailyNoteFile(this.app, date);
      return file ? hasPendingTasks(this.app, file) : false;
    });

    if (!weatherConfig) {
      weekDates.forEach((date, i) =>
        renderDayColumn(grid, date, undefined, false, this.openPeriodicNoteUseCase, pendingByDay[i])
      );
    } else {
      weekDates.forEach((date, i) =>
        renderDayColumn(grid, date, undefined, true, this.openPeriodicNoteUseCase, pendingByDay[i])
      );

      const file = this.app.vault.getAbstractFileByPath(this.sourcePath) as TFile;
      const mondayStr = toLocalISODate(this.monday);
      const cached = readForecastCache(this.app, file, mondayStr);

      if (cached) {
        grid.empty();
        weekDates.forEach((date, i) =>
          renderDayColumn(grid, date, cached[i], true, this.openPeriodicNoteUseCase, pendingByDay[i])
        );
      } else {
        this.fetchForecastUseCase
          .execute(weatherConfig, this.monday)
          .then(async (forecasts) => {
            grid.empty();
            weekDates.forEach((date, i) =>
              renderDayColumn(grid, date, forecasts[i], true, this.openPeriodicNoteUseCase, pendingByDay[i])
            );
            await writeForecastCache(this.app, file, forecasts, mondayStr);
          })
          .catch(() => { /* leave placeholders */ });
      }
    }

    const { excludedTagPrefixes } = this.settingsManager.get();
    const weekStats = getWeekStats(this.app, this.monday, excludedTagPrefixes);
    renderWeekSummary(this.widget, weekStats);
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
