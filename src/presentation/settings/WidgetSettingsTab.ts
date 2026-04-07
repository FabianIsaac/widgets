import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianWidgetsPlugin from "../../main";

/**
 * Settings tab for the Obsidian Widgets plugin.
 * Placeholder for future per-plugin configuration.
 */
export class WidgetSettingsTab extends PluginSettingTab {
  private readonly plugin: ObsidianWidgetsPlugin;

  constructor(app: App, plugin: ObsidianWidgetsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian Widgets" });

    new Setting(containerEl)
      .setName("Version")
      .setDesc(
        `Plugin version: ${this.plugin.manifest.version}. More settings coming in future releases.`
      );
  }
}
