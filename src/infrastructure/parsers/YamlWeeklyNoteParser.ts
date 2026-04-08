import * as yaml from "js-yaml";
import { WeeklyNoteConfig } from "@domain/widget/value-objects/WeeklyNoteConfig";
import { WeatherConfig } from "@domain/weather/value-objects/WeatherConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

/**
 * Infrastructure: parses YAML code block source into a WeeklyNoteConfig.
 */
export class YamlWeeklyNoteParser implements IWidgetParser<WeeklyNoteConfig> {
  parse(source: string): WeeklyNoteConfig {
    if (!source.trim()) return {};
    try {
      const raw = yaml.load(source);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return this.validate(raw as Record<string, unknown>);
    } catch (e) {
      console.warn("[obsidian-widgets] Failed to parse weekly note config:", e);
      return {};
    }
  }

  private validate(raw: Record<string, unknown>): WeeklyNoteConfig {
    const config: WeeklyNoteConfig = {};
    const w = raw["weather"];
    if (w && typeof w === "object" && !Array.isArray(w)) {
      const weather = w as Record<string, unknown>;
      const lat = Number(weather["latitude"]);
      const lon = Number(weather["longitude"]);
      if (!isNaN(lat) && !isNaN(lon)) {
        const weatherConfig: WeatherConfig = { latitude: lat, longitude: lon };
        if (typeof weather["location"] === "string") weatherConfig.location = weather["location"];
        weatherConfig.units = weather["units"] === "fahrenheit" ? "fahrenheit" : "celsius";
        config.weather = weatherConfig;
      }
    }
    return config;
  }
}
