import type ObsidianWidgetsPlugin from "../../main";

/** A tag-to-color mapping entry for the monthly calendar dot coloring */
export interface TagColorEntry {
  tag: string;
  /** One of: red, orange, yellow, green, cyan, blue, purple, pink */
  color: string;
}

/** A link-to-color mapping entry for the monthly calendar dot coloring */
export interface LinkColorEntry {
  /** Basename of the linked file (without extension, e.g. "_Dashboard Vicente") */
  link: string;
  /** Friendly name shown in the legend instead of the raw filename */
  alias?: string;
  /** One of: red, orange, yellow, green, cyan, blue, purple, pink */
  color: string;
}

export const TAG_COLOR_OPTIONS = [
  { value: "red",    label: "Red"    },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "green",  label: "Green"  },
  { value: "cyan",   label: "Cyan"   },
  { value: "blue",   label: "Blue"   },
  { value: "purple", label: "Purple" },
  { value: "pink",   label: "Pink"   },
];

export interface WidgetPluginSettings {
  /** Display language: "en" | "es" */
  language: string;
  /** Default latitude for weather widgets (overridable per widget) */
  latitude: string;
  /** Default longitude for weather widgets (overridable per widget) */
  longitude: string;
  /** Default location display name for weather widgets */
  location: string;
  /** Default temperature units for weather widgets */
  units: "celsius" | "fahrenheit";
  /** Tag-to-color mappings for monthly calendar dot coloring */
  tagColors: TagColorEntry[];
  /** Link-to-color mappings for monthly calendar dot coloring */
  linkColors: LinkColorEntry[];
}

export const DEFAULT_SETTINGS: WidgetPluginSettings = {
  language: "auto",
  latitude: "",
  longitude: "",
  location: "",
  units: "celsius",
  tagColors: [],
  linkColors: [],
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
