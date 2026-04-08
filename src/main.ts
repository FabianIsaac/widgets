import { Plugin } from "obsidian";
import { initI18n } from "@infrastructure/i18n/i18n";
import { ObsidianPeriodicNoteAdapter } from "@infrastructure/obsidian/ObsidianPeriodicNoteAdapter";
import { YamlDashboardParser } from "@infrastructure/parsers/YamlDashboardParser";
import { ParseDashboardConfigUseCase } from "@application/dashboard/ParseDashboardConfigUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { DashboardWidgetRenderer } from "@presentation/widgets/dashboard/DashboardWidgetRenderer";
import { WidgetSettingsTab } from "@presentation/settings/WidgetSettingsTab";
import { SettingsManager } from "@presentation/settings/SettingsManager";

/**
 * Obsidian Widgets Plugin entry point.
 *
 * Registers a Markdown code block processor for each widget type.
 * Currently supported:
 *   - widget-dashboard
 */
export default class ObsidianWidgetsPlugin extends Plugin {
  public settingsManager!: SettingsManager;

  async onload(): Promise<void> {
    // 1. Load persisted settings
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.load();

    // 2. Initialize i18n using the saved language preference
    await initI18n(this.settingsManager.get().language);

    // 3. Wire up dependencies (manual DI)
    const periodicNoteAdapter = new ObsidianPeriodicNoteAdapter(this.app);
    const yamlParser = new YamlDashboardParser();
    const parseUseCase = new ParseDashboardConfigUseCase(yamlParser);
    const openPeriodicNoteUseCase = new OpenPeriodicNoteUseCase(periodicNoteAdapter);

    const dashboardRenderer = new DashboardWidgetRenderer(
      parseUseCase,
      openPeriodicNoteUseCase,
      this.app
    );

    // 4. Register code block processor — ctx.addChild() handles component lifecycle
    this.registerMarkdownCodeBlockProcessor(
      "widget-dashboard",
      (source, el, ctx) => dashboardRenderer.render(source, el, ctx)
    );

    // 5. Register settings tab
    this.addSettingTab(new WidgetSettingsTab(this.app, this));
  }

  onunload(): void {
    // Obsidian automatically cleans up registered processors and child components
  }
}
