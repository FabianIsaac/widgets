import * as yaml from "js-yaml";
import { DailyNoteConfig } from "@domain/widget/value-objects/DailyNoteConfig";
import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

/**
 * Infrastructure: parses YAML code block source into a DailyNoteConfig.
 * Returns an empty config (no weather) if the block is empty or invalid.
 */
export class YamlDailyNoteParser implements IWidgetParser<DailyNoteConfig> {
  parse(source: string): DailyNoteConfig {
    if (!source.trim()) return {};

    try {
      const raw = yaml.load(source);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return this.validate(raw as Record<string, unknown>);
    } catch (e) {
      console.warn("[obsidian-widgets] Failed to parse daily note config:", e);
      return {};
    }
  }

  private validate(raw: Record<string, unknown>): DailyNoteConfig {
    const config: DailyNoteConfig = {};

    if (typeof raw["name"] === "string" && raw["name"].trim()) {
      config.name = raw["name"].trim();
    }

    const w = raw["weather"];
    if (w && typeof w === "object" && !Array.isArray(w)) {
      const weather = w as Record<string, unknown>;
      const lat = Number(weather["latitude"]);
      const lon = Number(weather["longitude"]);

      if (!isNaN(lat) && !isNaN(lon)) {
        const weatherConfig: WeatherConfig = { latitude: lat, longitude: lon };
        if (typeof weather["location"] === "string") {
          weatherConfig.location = weather["location"];
        }
        if (weather["units"] === "fahrenheit") {
          weatherConfig.units = "fahrenheit";
        } else {
          weatherConfig.units = "celsius";
        }
        config.weather = weatherConfig;
      }
    }

    return config;
  }
}
