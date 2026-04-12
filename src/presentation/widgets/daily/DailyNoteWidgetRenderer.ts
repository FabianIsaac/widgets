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
import { renderGratitude } from "./GratitudeRenderer";
import { resolveWeatherConfig } from "@infrastructure/weather/WeatherConfigResolver";
import { SettingsManager } from "@presentation/settings/SettingsManager";
import { getLocale } from "@infrastructure/i18n/i18n";

/** Frontmatter key used to cache fetched weather for the daily widget. */
const WEATHER_CACHE_KEY = "widget_daily_weather";

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
      const todayStr = new Date().toISOString().slice(0, 10);
      const cached = readWeatherCache(this.app, file, todayStr);

      if (cached) {
        renderWeatherData(weatherEl, cached);
      } else {
        renderWeatherLoading(weatherEl);
        this.fetchWeatherUseCase
          .execute(weatherConfig)
          .then(async (data) => {
            weatherEl.empty();
            renderWeatherData(weatherEl, data);
            await writeWeatherCache(this.app, file, data, todayStr);
          })
          .catch(() => {
            weatherEl.empty();
            renderWeatherError(weatherEl);
          });
      }
    }

    // ── Gratitude / custom section ──
    if (config.gratitude) {
      renderGratitude(container, this.app, file, config.gratitude.heading, config.gratitude.after);
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
        this.openPeriodicNoteUseCase,
        this.app,
        this.settingsManager
      )
    );
  }
}
