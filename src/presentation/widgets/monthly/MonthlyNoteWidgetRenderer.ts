import { App, MarkdownRenderChild, MarkdownPostProcessorContext, TFile } from "obsidian";
import { ParseMonthlyNoteConfigUseCase } from "@application/monthly/ParseMonthlyNoteConfigUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { t, getLocale } from "@infrastructure/i18n/i18n";
import { SettingsManager, TagColorEntry, LinkColorEntry, FrontmatterColorEntry } from "@presentation/settings/SettingsManager";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns ISO week number (ISO 8601) for a given date */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86_400_000 + 1) / 7);
}

/** True if two Dates represent the same calendar day */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Returns the daily note TFile for the given date, or null if not found */
function getDailyNoteFile(app: App, date: Date): TFile | null {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  // Check common daily note formats: YYYY-MM-DD and DD-MM-YYYY
  const candidates = [
    `${yyyy}-${mm}-${dd}`,
    `${dd}-${mm}-${yyyy}`,
  ];

  const files = app.vault.getMarkdownFiles();
  return files.find((f) => candidates.some((name) => f.basename === name)) ?? null;
}

/**
 * Returns true if the file has at least one uncompleted task (- [ ] item).
 */
function hasPendingTasks(app: App, file: TFile): boolean {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache?.listItems) return false;
  return cache.listItems.some((item) => item.task === " ");
}

/**
 * Returns the list of tags from the `tags` frontmatter property of a file.
 * Returns an empty array if none found.
 */
function getFileTags(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  const raw = cache?.frontmatter?.["tags"];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Returns the basenames (without heading/block anchors) of all outgoing links
 * in a file, as reported by Obsidian's metadata cache.
 */
function getFileLinks(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache?.links) return [];
  return cache.links.map((ref) => ref.link.split("#")[0].trim());
}

/** Returns completed and total task counts for a file. */
function getTaskStats(app: App, file: TFile): { completed: number; total: number } {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache?.listItems) return { completed: 0, total: 0 };
  const tasks = cache.listItems.filter((item) => item.task !== undefined);
  const completed = tasks.filter((item) => item.task === "x" || item.task === "X").length;
  return { completed, total: tasks.length };
}

/** Aggregates task stats across all daily notes in a given month. */
function getMonthTaskStats(app: App, year: number, month: number): { completed: number; total: number } {
  const daysInMonth = new Date(year, month, 0).getDate();
  let completed = 0;
  let total = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const file = getDailyNoteFile(app, new Date(year, month - 1, day));
    if (file) {
      const stats = getTaskStats(app, file);
      completed += stats.completed;
      total += stats.total;
    }
  }
  return { completed, total };
}

/**
 * Merges tag, link, and frontmatter colors, deduping by color value.
 */
function resolveAllDotColors(
  app: App,
  file: TFile,
  tagColors: TagColorEntry[],
  linkColors: LinkColorEntry[],
  frontmatterColors: FrontmatterColorEntry[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const tags = tagColors.length > 0 ? getFileTags(app, file) : [];
  const links = linkColors.length > 0 ? getFileLinks(app, file) : [];
  const fm = frontmatterColors.length > 0
    ? (app.metadataCache.getFileCache(file)?.frontmatter ?? null)
    : null;

  for (const entry of tagColors) {
    if (tags.includes(entry.tag) && !seen.has(entry.color)) {
      seen.add(entry.color);
      result.push(entry.color);
    }
  }
  for (const entry of linkColors) {
    if (entry.link && links.includes(entry.link) && !seen.has(entry.color)) {
      seen.add(entry.color);
      result.push(entry.color);
    }
  }
  if (fm) {
    for (const entry of frontmatterColors) {
      if (!entry.property || !entry.value) continue;
      const raw = fm[entry.property];
      if (raw !== undefined && raw !== null &&
          String(raw).toLowerCase() === entry.value.toLowerCase() &&
          !seen.has(entry.color)) {
        seen.add(entry.color);
        result.push(entry.color);
      }
    }
  }
  return result;
}

/** Uppercase 3-letter day abbreviation: "LUN", "MON" */
function dayAbbr(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
    .slice(0, 3);
}

/** Full month name, capitalized */
function fullMonthName(year: number, month: number, locale: string): string {
  const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

/**
 * Renders the header:
 *   ABRIL   2026
 *   (month → yearly note, year → yearly note)
 */
function renderMonthHeader(
  container: HTMLElement,
  year: number,
  month: number,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
  taskStats: { completed: number; total: number }
): void {
  const locale = getLocale();
  const refDate = new Date(year, month - 1, 1);

  const header = container.createDiv({ cls: "widget-monthly__header" });

  header.createEl("span", {
    cls: "widget-monthly__month-name",
    text: fullMonthName(year, month, locale),
  });
  header.createEl("span", {
    cls: "widget-monthly__year",
    text: String(year),
  });

  // Both clickable → yearly note
  header.querySelectorAll("span").forEach((el) => {
    (el as HTMLElement).addEventListener("click", () =>
      openPeriodicNoteUseCase.openYearly(refDate)
    );
  });

  // Task progress summary — only when the month has tasks
  if (taskStats.total > 0) {
    const pct = taskStats.completed / taskStats.total;
    const tooltip = t("monthly.progressTooltip", {
      completed: taskStats.completed,
      total: taskStats.total,
    });

    const progress = header.createDiv({ cls: "widget-monthly__progress" });
    progress.setAttribute("title", tooltip);

    progress.createEl("span", {
      cls: "widget-monthly__progress-text",
      text: `${taskStats.completed}/${taskStats.total}`,
    });

    const track = progress.createDiv({ cls: "widget-monthly__progress-track" });
    const fill = track.createDiv({ cls: "widget-monthly__progress-fill" });
    fill.style.width = `${Math.round(pct * 100)}%`;
  }
}

/**
 * Renders the column headers: empty week-number cell + Mon–Sun labels
 */
function renderDayHeaders(container: HTMLElement): void {
  const locale = getLocale();
  const row = container.createDiv({ cls: "widget-monthly__header-row" });

  // Empty cell above week numbers
  row.createDiv({ cls: "widget-monthly__week-cell widget-monthly__week-cell--header" });

  // Mon (1) → Sun (0), ISO order
  const monday = new Date(2024, 0, 1); // a known Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isWeekend = i >= 5;
    row.createDiv({
      cls: `widget-monthly__day-header${isWeekend ? " is-weekend" : ""}`,
      text: dayAbbr(d, locale),
    });
  }
}

/**
 * Renders a single week row:
 *   [W15]  8   9  10  11  12  13  14
 */
function renderWeekRow(
  container: HTMLElement,
  monday: Date,
  currentMonth: number,
  today: Date,
  app: App,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
  tagColors: TagColorEntry[],
  linkColors: LinkColorEntry[],
  frontmatterColors: FrontmatterColorEntry[]
): void {
  const row = container.createDiv({ cls: "widget-monthly__week-row" });

  // Week number — clickable → weekly note
  const weekNum = getISOWeekNumber(monday);
  const weekCell = row.createDiv({
    cls: "widget-monthly__week-cell",
    text: String(weekNum),
  });
  weekCell.addEventListener("click", () => openPeriodicNoteUseCase.openWeekly(monday));

  // 7 days Mon–Sun
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const isCurrentMonth = date.getMonth() + 1 === currentMonth;
    const isToday = isSameDay(date, today);
    const isWeekend = i >= 5;
    const noteFile = isCurrentMonth ? getDailyNoteFile(app, date) : null;
    const hasNote = noteFile !== null;

    const cls = [
      "widget-monthly__day-cell",
      isToday ? "is-today" : "",
      isWeekend ? "is-weekend" : "",
      !isCurrentMonth ? "is-outside" : "",
      isCurrentMonth && !hasNote ? "is-no-note" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const cell = row.createDiv({ cls });

    if (isCurrentMonth) {
      cell.createEl("span", {
        cls: "widget-monthly__day-num",
        text: String(date.getDate()),
      });

      // Task stats
      const taskStats = noteFile ? getTaskStats(app, noteFile) : { completed: 0, total: 0 };
      const pendingTask = noteFile ? hasPendingTasks(app, noteFile) : false;
      const hasCompleted = taskStats.completed > 0;

      // Render dots: colored (tag/link/frontmatter) + ✓ completed + ○ pending
      const colors = noteFile
        ? resolveAllDotColors(app, noteFile, tagColors, linkColors, frontmatterColors)
        : [];

      if (colors.length > 0 || hasCompleted || pendingTask) {
        const dotsEl = cell.createDiv({ cls: "widget-monthly__day-dots" });
        for (const color of colors) {
          const dot = dotsEl.createDiv({ cls: "widget-monthly__day-dot" });
          dot.style.setProperty("background-color", `var(--color-${color})`);
        }
        if (hasCompleted) {
          dotsEl.createEl("span", { cls: "widget-monthly__day-task-done", text: "✓" });
        }
        if (pendingTask) {
          dotsEl.createDiv({ cls: "widget-monthly__day-dot widget-monthly__day-dot--pending" });
        }
      }

      // Task ratio (e.g. "2/5"), only when tasks exist
      if (taskStats.total > 0) {
        cell.createEl("span", {
          cls: "widget-monthly__day-tasks",
          text: `${taskStats.completed}/${taskStats.total}`,
        });
      }

      cell.addEventListener("click", () => openPeriodicNoteUseCase.openDaily(date));
    }
  }
}

/**
 * Renders the full calendar grid for the given month.
 * Weeks run Mon–Sun (ISO). Partial first/last weeks show empty cells for
 * days outside the current month.
 */
function renderCalendarGrid(
  container: HTMLElement,
  year: number,
  month: number,
  today: Date,
  app: App,
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
  tagColors: TagColorEntry[],
  linkColors: LinkColorEntry[],
  frontmatterColors: FrontmatterColorEntry[]
): void {
  const grid = container.createDiv({ cls: "widget-monthly__grid" });

  renderDayHeaders(grid);

  const firstDay = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDay.getDay() || 7;
  const monday = new Date(firstDay);
  monday.setDate(firstDay.getDate() - (firstDayOfWeek - 1));

  const lastDay = new Date(year, month, 0);
  let cursor = new Date(monday);

  while (cursor <= lastDay) {
    renderWeekRow(grid, new Date(cursor), month, today, app, openPeriodicNoteUseCase, tagColors, linkColors, frontmatterColors);
    cursor.setDate(cursor.getDate() + 7);
  }
}

/**
 * Renders a legend row: colored dot + tag name, one per configured entry.
 */
function renderLegend(
  container: HTMLElement,
  tagColors: TagColorEntry[],
  linkColors: LinkColorEntry[],
  frontmatterColors: FrontmatterColorEntry[]
): void {
  const hasEntries =
    tagColors.some((e) => e.tag) ||
    linkColors.some((e) => e.link) ||
    frontmatterColors.some((e) => e.property && e.value);
  if (!hasEntries) return;

  const legend = container.createDiv({ cls: "widget-monthly__legend" });

  for (const entry of tagColors) {
    if (!entry.tag) continue;
    const item = legend.createDiv({ cls: "widget-monthly__legend-item" });
    const dot = item.createDiv({ cls: "widget-monthly__legend-dot" });
    dot.style.setProperty("background-color", `var(--color-${entry.color})`);
    item.createEl("span", { cls: "widget-monthly__legend-label", text: entry.tag });
  }

  for (const entry of linkColors) {
    if (!entry.link) continue;
    const item = legend.createDiv({ cls: "widget-monthly__legend-item" });
    const dot = item.createDiv({ cls: "widget-monthly__legend-dot" });
    dot.style.setProperty("background-color", `var(--color-${entry.color})`);
    item.createEl("span", { cls: "widget-monthly__legend-label", text: entry.alias ?? `[[${entry.link}]]` });
  }

  for (const entry of frontmatterColors) {
    if (!entry.property || !entry.value) continue;
    const item = legend.createDiv({ cls: "widget-monthly__legend-item" });
    const dot = item.createDiv({ cls: "widget-monthly__legend-dot" });
    dot.style.setProperty("background-color", `var(--color-${entry.color})`);
    const label = entry.alias ?? `${entry.property}: ${entry.value}`;
    item.createEl("span", { cls: "widget-monthly__legend-label", text: label });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

class MonthlyNoteWidgetComponent extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly parseUseCase: ParseMonthlyNoteConfigUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {
    super(containerEl);
  }

  onload(): void {
    const config = this.parseUseCase.execute(this.source);
    const today = new Date();

    const month = config.month ?? today.getMonth() + 1;
    const year = config.year ?? today.getFullYear();
    const { tagColors, linkColors, frontmatterColors } = this.settingsManager.get();

    const container = this.containerEl.createDiv({ cls: "widget-monthly" });

    const monthTaskStats = getMonthTaskStats(this.app, year, month);
    renderMonthHeader(container, year, month, this.openPeriodicNoteUseCase, monthTaskStats);
    renderCalendarGrid(container, year, month, today, this.app, this.openPeriodicNoteUseCase, tagColors, linkColors, frontmatterColors);

    if (config.legend) {
      renderLegend(container, tagColors, linkColors, frontmatterColors);
    }
  }
}

// ── Renderer entry point ──────────────────────────────────────────────────────

export class MonthlyNoteWidgetRenderer {
  constructor(
    private readonly parseUseCase: ParseMonthlyNoteConfigUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new MonthlyNoteWidgetComponent(
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
