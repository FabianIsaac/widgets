import { App, MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import { ParseDailyNoteConfigUseCase } from "@application/daily/ParseDailyNoteConfigUseCase";
import { FetchWeatherUseCase } from "@application/daily/FetchWeatherUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { CalendarDate } from "@domain/calendar/value-objects/CalendarDate";
import { renderDateCard } from "./DateCardRenderer";
import {
  renderWeatherLoading,
  renderWeatherData,
  renderWeatherError,
} from "./WeatherRenderer";
import { renderNavigation } from "./NavigationRenderer";
import { getLocale } from "@infrastructure/i18n/i18n";

/**
 * MarkdownRenderChild that owns the daily-note widget DOM and lifecycle.
 * Obsidian calls onload() on render and onunload() when the note closes.
 */
class DailyNoteWidgetComponent extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly parseUseCase: ParseDailyNoteConfigUseCase,
    private readonly fetchWeatherUseCase: FetchWeatherUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly _app: App
  ) {
    super(containerEl);
  }

  onload(): void {
    const config = this.parseUseCase.execute(this.source);
    const container = this.containerEl.createDiv({ cls: "widget-daily" });
    const today = CalendarDate.today(getLocale());

    // ── Top section: date card (left) + weather (right) ──
    const topSection = container.createDiv({ cls: "widget-daily__top" });

    renderDateCard(topSection, today);

    if (config.weather) {
      const weatherEl = topSection.createDiv({ cls: "widget-daily__weather-card" });
      renderWeatherLoading(weatherEl);

      this.fetchWeatherUseCase
        .execute(config.weather)
        .then((data) => {
          weatherEl.empty();
          renderWeatherData(weatherEl, data);
        })
        .catch(() => {
          weatherEl.empty();
          renderWeatherError(weatherEl);
        });
    }

    // ── Navigation row ──
    renderNavigation(container, today.raw, this.openPeriodicNoteUseCase);
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
    private readonly app: App
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new DailyNoteWidgetComponent(
        el,
        source,
        this.parseUseCase,
        this.fetchWeatherUseCase,
        this.openPeriodicNoteUseCase,
        this.app
      )
    );
  }
}
