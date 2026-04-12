import { App, MarkdownRenderChild, MarkdownPostProcessorContext, TFile } from "obsidian";
import { ParseMonthlyNoteConfigUseCase } from "@application/monthly/ParseMonthlyNoteConfigUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { t, getLocale } from "@infrastructure/i18n/i18n";
import { SettingsManager, TagColorEntry, LinkColorEntry } from "@presentation/settings/SettingsManager";

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
 * Given a list of tags and the configured tag-color entries,
 * returns the colors that should be shown (in config order, deduped).
 */
function resolveTagColors(tags: string[], tagColors: TagColorEntry[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of tagColors) {
    if (tags.includes(entry.tag) && !seen.has(entry.color)) {
      seen.add(entry.color);
      result.push(entry.color);
    }
  }
  return result;
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

/**
 * Given a list of link basenames and the configured link-color entries,
 * returns the colors that should be shown (in config order, deduped).
 */
function resolveLinkColors(links: string[], linkColors: LinkColorEntry[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of linkColors) {
    if (entry.link && links.includes(entry.link) && !seen.has(entry.color)) {
      seen.add(entry.color);
      result.push(entry.color);
    }
  }
  return result;
}

/**
 * Merges tag colors and link colors, deduping by color value across both sources.
 */
function resolveAllDotColors(
  app: App,
  file: TFile,
  tagColors: TagColorEntry[],
  linkColors: LinkColorEntry[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const tags = tagColors.length > 0 ? getFileTags(app, file) : [];
  const links = linkColors.length > 0 ? getFileLinks(app, file) : [];

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
  openPeriodicNoteUseCase: OpenPeriodicNoteUseCase
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
  linkColors: LinkColorEntry[]
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

      // Render tag + link color dots
      if (noteFile && (tagColors.length > 0 || linkColors.length > 0)) {
        const colors = resolveAllDotColors(app, noteFile, tagColors, linkColors);
        if (colors.length > 0) {
          const dotsEl = cell.createDiv({ cls: "widget-monthly__day-dots" });
          for (const color of colors) {
            const dot = dotsEl.createDiv({ cls: "widget-monthly__day-dot" });
            dot.style.setProperty("background-color", `var(--color-${color})`);
          }
        }
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
  linkColors: LinkColorEntry[]
): void {
  const grid = container.createDiv({ cls: "widget-monthly__grid" });

  renderDayHeaders(grid);

  // Find the Monday of the week containing the 1st of the month
  const firstDay = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDay.getDay() || 7; // Sun=0 → 7
  const monday = new Date(firstDay);
  monday.setDate(firstDay.getDate() - (firstDayOfWeek - 1));

  // Render weeks until we've passed the last day of the month
  const lastDay = new Date(year, month, 0); // last day of month
  let cursor = new Date(monday);

  while (cursor <= lastDay) {
    renderWeekRow(grid, new Date(cursor), month, today, app, openPeriodicNoteUseCase, tagColors, linkColors);
    cursor.setDate(cursor.getDate() + 7);
  }
}

/**
 * Renders a legend row: colored dot + tag name, one per configured entry.
 */
function renderLegend(
  container: HTMLElement,
  tagColors: TagColorEntry[],
  linkColors: LinkColorEntry[]
): void {
  const hasEntries =
    tagColors.some((e) => e.tag) || linkColors.some((e) => e.link);
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
    const { tagColors, linkColors } = this.settingsManager.get();

    const container = this.containerEl.createDiv({ cls: "widget-monthly" });

    renderMonthHeader(container, year, month, this.openPeriodicNoteUseCase);
    renderCalendarGrid(container, year, month, today, this.app, this.openPeriodicNoteUseCase, tagColors, linkColors);

    if (config.legend) {
      renderLegend(container, tagColors, linkColors);
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
