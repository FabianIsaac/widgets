import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianWidgetsPlugin from "../../main";
import { t, changeLanguage } from "@infrastructure/i18n/i18n";

/**
 * Settings tab for the Obsidian Widgets plugin.
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

    containerEl.createEl("h2", { text: t("settings.title") });

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("auto", t("settings.languageAuto"))
          .addOption("en", "English")
          .addOption("es", "Español")
          .setValue(this.plugin.settingsManager.get().language)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ language: value });
            await changeLanguage(value);
            // Re-render settings tab with the new language
            this.display();
          });
      });
  }
}
