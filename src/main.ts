import { Plugin } from "obsidian";
import { initI18n } from "./infrastructure/i18n/i18n";
import { ObsidianPeriodicNoteAdapter } from "./infrastructure/obsidian/ObsidianPeriodicNoteAdapter";
import { YamlDashboardParser } from "./infrastructure/parsers/YamlDashboardParser";
import { ParseDashboardConfigUseCase } from "./application/dashboard/ParseDashboardConfigUseCase";
import { OpenPeriodicNoteUseCase } from "./application/dashboard/OpenPeriodicNoteUseCase";
import { DashboardWidgetRenderer } from "./presentation/widgets/dashboard/DashboardWidgetRenderer";
import { WidgetSettingsTab } from "./presentation/settings/WidgetSettingsTab";

/**
 * Obsidian Widgets Plugin entry point.
 *
 * Registers a Markdown code block processor for each widget type.
 * Currently supported:
 *   - widget-dashboard
 */
export default class ObsidianWidgetsPlugin extends Plugin {
  async onload(): Promise<void> {
    // 1. Initialize i18n (detects Obsidian's locale automatically)
    await initI18n();

    // 2. Wire up dependencies (manual DI — no framework needed)
    const periodicNoteAdapter = new ObsidianPeriodicNoteAdapter(this.app);
    const yamlParser = new YamlDashboardParser();
    const parseUseCase = new ParseDashboardConfigUseCase(yamlParser);
    const openPeriodicNoteUseCase = new OpenPeriodicNoteUseCase(periodicNoteAdapter);

    const dashboardRenderer = new DashboardWidgetRenderer(
      parseUseCase,
      openPeriodicNoteUseCase,
      this.app
    );

    // 3. Register code block processor
    this.registerMarkdownCodeBlockProcessor(
      "widget-dashboard",
      (source, el) => dashboardRenderer.render(source, el)
    );

    // 4. Register settings tab
    this.addSettingTab(new WidgetSettingsTab(this.app, this));
  }

  onunload(): void {
    // Obsidian automatically cleans up registered processors and event listeners
  }
}
