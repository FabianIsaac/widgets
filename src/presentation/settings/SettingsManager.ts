import type ObsidianWidgetsPlugin from "../../main";

export interface WidgetPluginSettings {
  /** Display language: "en" | "es" */
  language: string;
}

export const DEFAULT_SETTINGS: WidgetPluginSettings = {
  language: "auto",
};

/**
 * Manages loading and persisting plugin settings via Obsidian's loadData/saveData.
 */
export class SettingsManager {
  private settings: WidgetPluginSettings = { ...DEFAULT_SETTINGS };

  constructor(private readonly plugin: ObsidianWidgetsPlugin) {}

  async load(): Promise<void> {
    const saved = await this.plugin.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
  }

  async save(): Promise<void> {
    await this.plugin.saveData(this.settings);
  }

  get(): WidgetPluginSettings {
    return this.settings;
  }

  async update(patch: Partial<WidgetPluginSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.save();
  }
}
