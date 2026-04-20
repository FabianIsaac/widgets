import { App, MarkdownRenderChild, MarkdownPostProcessorContext, TFile, setTooltip } from "obsidian";
import { ParseWeeklyNoteConfigUseCase } from "@application/weekly/ParseWeeklyNoteConfigUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { SettingsManager } from "@presentation/settings/SettingsManager";
import { t, getLocale } from "@infrastructure/i18n/i18n";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

    if (cache.listItems) {
      const tasks = cache.listItems.filter((item) => item.task !== undefined);
      const completed = tasks.filter((item) => item.task === "x" || item.task === "X").length;
      completedTasks += completed;
      totalTasks += tasks.length;
      if (tasks.some((item) => item.task === " ")) pendingDays++;
    }

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

  if (stats.topTags.length > 0) {
    const tagsEl = summary.createDiv({ cls: "widget-weekly__summary-tags" });
    for (const { tag } of stats.topTags) {
      tagsEl.createEl("span", { cls: "widget-weekly__summary-tag", text: `#${tag}` });
    }
  }

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

class TwWeeklyWidgetComponent extends MarkdownRenderChild {
  private monday!: Date;
  private widget!: HTMLElement;

  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly parseUseCase: ParseWeeklyNoteConfigUseCase,
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
    renderWeekHeader(
      this.widget,
      this.monday,
      this.openPeriodicNoteUseCase,
      () => this.openAdjacentWeek(-1),
      () => this.openAdjacentWeek(1)
    );

    const grid = this.widget.createDiv({ cls: "widget-weekly__days-grid" });

    for (let i = 0; i < 7; i++) {
      const d = new Date(this.monday);
      d.setDate(this.monday.getDate() + i);
      const file = getDailyNoteFile(this.app, d);
      const pending = file ? hasPendingTasks(this.app, file) : false;
      renderDayColumn(grid, d, this.openPeriodicNoteUseCase, pending);
    }

    const { excludedTagPrefixes } = this.settingsManager.get();
    const weekStats = getWeekStats(this.app, this.monday, excludedTagPrefixes);
    renderWeekSummary(this.widget, weekStats);
  }
}

// ── Renderer entry point ──────────────────────────────────────────────────────

export class TwWeeklyWidgetRenderer {
  constructor(
    private readonly parseUseCase: ParseWeeklyNoteConfigUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new TwWeeklyWidgetComponent(
        el,
        source,
        this.parseUseCase,
        this.openPeriodicNoteUseCase,
        this.app,
        this.settingsManager
      )
    );
  }
}
