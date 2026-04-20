import { App, MarkdownRenderChild, MarkdownPostProcessorContext, TFile } from "obsidian";
import { ParseDailyNoteConfigUseCase } from "@application/daily/ParseDailyNoteConfigUseCase";
import { FetchWeatherUseCase } from "@application/daily/FetchWeatherUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { CalendarDate } from "@domain/calendar/value-objects/CalendarDate";
import { WeatherData } from "@domain/weather/value-objects/WeatherData";
import { renderDateCard } from "./DateCardRenderer";
import {
  renderWeatherLoading,
  renderWeatherData,
  renderWeatherError,
} from "./WeatherRenderer";
import { ensureTag } from "./GratitudeRenderer";
import { renderQuickCapture, type CaptureEntry } from "./QuickCaptureRenderer";
import { renderCalendarEventsList, renderCalendarEventsLoading } from "./CalendarEventsRenderer";
import { FetchTodayEventsUseCase } from "@application/daily/FetchTodayEventsUseCase";
import { CalendarEvent } from "@domain/calendar/value-objects/CalendarEvent";
import { resolveWeatherConfig } from "@infrastructure/weather/WeatherConfigResolver";
import { SettingsManager } from "@presentation/settings/SettingsManager";
import { getLocale } from "@infrastructure/i18n/i18n";

/** Frontmatter key used to cache fetched weather for the daily widget. */
const WEATHER_CACHE_KEY = "widget_daily_weather";

/** Frontmatter key used to persist calendar events for the daily widget. */
const EVENTS_CACHE_KEY = "widget_daily_events";

/**
 * Reads CalendarEvent[] from frontmatter. Returns the array if present, null otherwise.
 */
function readEventsCache(app: App, file: TFile): CalendarEvent[] | null {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  const cached = fm?.[EVENTS_CACHE_KEY];
  if (!Array.isArray(cached)) return null;
  return cached as CalendarEvent[];
}

/**
 * Writes CalendarEvent[] to the note's frontmatter as a plain array.
 */
async function writeEventsCache(app: App, file: TFile, events: CalendarEvent[]): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[EVENTS_CACHE_KEY] = events;
  });
}

/** Returns today's date as a YYYY-MM-DD string in the local timezone. */
function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Reads cached WeatherData from the note's frontmatter if it was stored today.
 * Returns null if missing or stale.
 */
function readWeatherCache(app: App, file: TFile, todayStr: string): WeatherData | null {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  const cached = fm?.[WEATHER_CACHE_KEY];
  if (!cached || cached.cachedAt !== todayStr) return null;
  return {
    tempMin: cached.tempMin,
    tempMax: cached.tempMax,
    weatherCode: cached.weatherCode,
    windSpeed: cached.windSpeed,
    units: cached.units,
    location: cached.location,
  };
}

/**
 * Saves WeatherData to the note's frontmatter under WEATHER_CACHE_KEY.
 */
async function writeWeatherCache(app: App, file: TFile, data: WeatherData, todayStr: string): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[WEATHER_CACHE_KEY] = { ...data, cachedAt: todayStr };
  });
}

/**
 * MarkdownRenderChild that owns the daily-note widget DOM and lifecycle.
 */
class DailyNoteWidgetComponent extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly sourcePath: string,
    private readonly parseUseCase: ParseDailyNoteConfigUseCase,
    private readonly fetchWeatherUseCase: FetchWeatherUseCase,
    private readonly fetchTodayEventsUseCase: FetchTodayEventsUseCase,
    private readonly _openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {
    super(containerEl);
  }

  onload(): void {
    const config = this.parseUseCase.execute(this.source);
    const container = this.containerEl.createDiv({ cls: "widget-daily" });
    const locale = getLocale();

    const calendarDate = config.date
      ? CalendarDate.fromString(config.date, locale)
      : CalendarDate.today(locale);

    const file = this.app.vault.getAbstractFileByPath(this.sourcePath) as TFile;

    const row = container.createDiv({ cls: "widget-daily__row" });
    renderDateCard(row, calendarDate, this._openPeriodicNoteUseCase, config.name);

    const weatherConfig = resolveWeatherConfig(config.weather, this.settingsManager.get());

    if (weatherConfig) {
      const weatherEl = row.createDiv({ cls: "widget-daily__weather" });
      // Use the widget's own date as the cache key so past-date notes keep their
      // historical weather and never overwrite it with today's data.
      const widgetDateStr = config.date ?? localDateStr();
      const cached = readWeatherCache(this.app, file, widgetDateStr);

      if (cached) {
        renderWeatherData(weatherEl, cached);
      } else {
        renderWeatherLoading(weatherEl);
        this.fetchWeatherUseCase
          .execute(weatherConfig, widgetDateStr)
          .then(async (data) => {
            weatherEl.empty();
            renderWeatherData(weatherEl, data);
            await writeWeatherCache(this.app, file, data, widgetDateStr);
          })
          .catch(() => {
            weatherEl.empty();
            renderWeatherError(weatherEl);
          });
      }
    }

    // ── Calendar events (one or more feeds) ───────────────────────────────────
    if (config.calendars && config.calendars.length > 0) {
      const dateStr = config.date ?? localDateStr();
      const urls = config.calendars.map((c) => c.url);
      const cachedEvents = readEventsCache(this.app, file);

      const eventsSlot = container.createDiv();

      if (cachedEvents !== null) {
        renderCalendarEventsList(eventsSlot, cachedEvents);
      } else {
        renderCalendarEventsLoading(eventsSlot);
      }

      Promise.all(urls.map((url) => this.fetchTodayEventsUseCase.execute(url, dateStr)))
        .then(async (results) => {
          const seen = new Set<string>();
          const merged = results
            .flat()
            .filter((e) => {
              const key = `${e.summary}|${e.startTime ?? "allday"}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort((a, b) => {
              if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
              return (a.startTime ?? "").localeCompare(b.startTime ?? "");
            });
          eventsSlot.empty();
          renderCalendarEventsList(eventsSlot, merged);
          await writeEventsCache(this.app, file, merged);
        })
        .catch((err) => {
          console.warn("[obsidian-widgets] Calendar fetch failed:", err);
          if (cachedEvents === null) eventsSlot.empty();
        });
    }

    // ── Unified capture section (quick-capture buttons, gratitude always last) ──
    const { gratitudeAutoTag, captureTemplates } = this.settingsManager.get();
    const entries: CaptureEntry[] = [];

    // Per-widget captures take precedence; fall back to global templates.
    const captures = config.captures ?? captureTemplates;
    const gratitudeHeading = config.gratitude?.heading;

    // Collect all capture entries that have an explicit heading (named sections).
    // Time-block captures (no heading) must be pinned before ALL named sections
    // AND gratitude, so that time-block sections are always grouped above them.
    const namedHeadings = captures
      .filter((c) => c.heading)
      .map((c) => c.heading as string);

    entries.push(
      ...captures.map((c) => {
        const pinBeforeFirstOf = [
          ...(c.heading ? [] : namedHeadings),   // time-block only: also pin before named sections
          ...(gratitudeHeading ? [gratitudeHeading] : []),
        ];
        return { ...c, pinBeforeFirstOf: pinBeforeFirstOf.length > 0 ? pinBeforeFirstOf : undefined };
      })
    );

    // Gratitude always appended last (no pinning needed — it creates itself at the very end)
    if (config.gratitude) {
      const tag = config.gratitude.tag ?? (gratitudeAutoTag || undefined);
      entries.push({
        label: config.gratitude.heading,
        format: "- {text}",
        heading: config.gratitude.heading,
        after: config.gratitude.after,
        afterSubmit: tag ? async () => { await ensureTag(this.app, file, tag); } : undefined,
      });
    }

    const isToday = !config.date || config.date === localDateStr();

    if (entries.length > 0 && isToday) {
      renderQuickCapture(container, this.app, file, entries);
    }
  }
}

/**
 * Creates and registers a DailyNoteWidgetComponent via ctx.addChild()
 * for each widget-daily code block encountered.
 */
export class DailyNoteWidgetRenderer {
  constructor(
    private readonly parseUseCase: ParseDailyNoteConfigUseCase,
    private readonly fetchWeatherUseCase: FetchWeatherUseCase,
    private readonly fetchTodayEventsUseCase: FetchTodayEventsUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App,
    private readonly settingsManager: SettingsManager
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new DailyNoteWidgetComponent(
        el,
        source,
        ctx.sourcePath,
        this.parseUseCase,
        this.fetchWeatherUseCase,
        this.fetchTodayEventsUseCase,
        this.openPeriodicNoteUseCase,
        this.app,
        this.settingsManager
      )
    );
  }
}
