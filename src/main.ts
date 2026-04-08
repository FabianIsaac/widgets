import { Plugin } from "obsidian";
import { initI18n } from "@infrastructure/i18n/i18n";
import { ObsidianPeriodicNoteAdapter } from "@infrastructure/obsidian/ObsidianPeriodicNoteAdapter";
import { YamlDashboardParser } from "@infrastructure/parsers/YamlDashboardParser";
import { YamlDailyNoteParser } from "@infrastructure/parsers/YamlDailyNoteParser";
import { YamlWeeklyNoteParser } from "@infrastructure/parsers/YamlWeeklyNoteParser";
import { OpenMeteoWeatherAdapter } from "@infrastructure/weather/OpenMeteoWeatherAdapter";
import { OpenMeteoForecastAdapter } from "@infrastructure/weather/OpenMeteoForecastAdapter";
import { ParseDashboardConfigUseCase } from "@application/dashboard/ParseDashboardConfigUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { ParseDailyNoteConfigUseCase } from "@application/daily/ParseDailyNoteConfigUseCase";
import { FetchWeatherUseCase } from "@application/daily/FetchWeatherUseCase";
import { ParseWeeklyNoteConfigUseCase } from "@application/weekly/ParseWeeklyNoteConfigUseCase";
import { FetchWeeklyForecastUseCase } from "@application/weekly/FetchWeeklyForecastUseCase";
import { DashboardWidgetRenderer } from "@presentation/widgets/dashboard/DashboardWidgetRenderer";
import { DailyNoteWidgetRenderer } from "@presentation/widgets/daily/DailyNoteWidgetRenderer";
import { WeeklyNoteWidgetRenderer } from "@presentation/widgets/weekly/WeeklyNoteWidgetRenderer";
import { WidgetSettingsTab } from "@presentation/settings/WidgetSettingsTab";
import { SettingsManager } from "@presentation/settings/SettingsManager";

/**
 * Obsidian Widgets Plugin entry point.
 *
 * Registered code block processors:
 *   - widget-dashboard  → configurable icon bar + date bar
 *   - widget-daily      → date card + weather + day navigation
 *   - widget-weekly     → week number + month/year + 7-day grid with forecast
 */
export default class ObsidianWidgetsPlugin extends Plugin {
  public settingsManager!: SettingsManager;

  async onload(): Promise<void> {
    // 1. Load persisted settings
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.load();

    // 2. Initialize i18n with saved language preference
    await initI18n(this.settingsManager.get().language);

    // 3. Shared infrastructure
    const periodicNoteAdapter = new ObsidianPeriodicNoteAdapter(this.app);
    const openPeriodicNoteUseCase = new OpenPeriodicNoteUseCase(periodicNoteAdapter);

    // 4. Dashboard widget
    const dashboardRenderer = new DashboardWidgetRenderer(
      new ParseDashboardConfigUseCase(new YamlDashboardParser()),
      openPeriodicNoteUseCase,
      this.app
    );

    this.registerMarkdownCodeBlockProcessor(
      "widget-dashboard",
      (source, el, ctx) => dashboardRenderer.render(source, el, ctx)
    );

    // 5. Daily note widget
    const dailyNoteRenderer = new DailyNoteWidgetRenderer(
      new ParseDailyNoteConfigUseCase(new YamlDailyNoteParser()),
      new FetchWeatherUseCase(new OpenMeteoWeatherAdapter()),
      openPeriodicNoteUseCase,
      this.app
    );

    this.registerMarkdownCodeBlockProcessor(
      "widget-daily",
      (source, el, ctx) => dailyNoteRenderer.render(source, el, ctx)
    );

    // 6. Weekly note widget
    const weeklyNoteRenderer = new WeeklyNoteWidgetRenderer(
      new ParseWeeklyNoteConfigUseCase(new YamlWeeklyNoteParser()),
      new FetchWeeklyForecastUseCase(new OpenMeteoForecastAdapter()),
      openPeriodicNoteUseCase,
      this.app
    );

    this.registerMarkdownCodeBlockProcessor(
      "widget-weekly",
      (source, el, ctx) => weeklyNoteRenderer.render(source, el, ctx)
    );

    // 7. Settings tab
    this.addSettingTab(new WidgetSettingsTab(this.app, this));
  }

  onunload(): void {
    // Obsidian automatically cleans up registered processors and child components
  }
}
