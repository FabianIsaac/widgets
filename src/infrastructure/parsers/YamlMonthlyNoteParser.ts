import * as yaml from "js-yaml";
import { MonthlyNoteConfig } from "@domain/widget/value-objects/MonthlyNoteConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

/**
 * Infrastructure: parses YAML code block source into a MonthlyNoteConfig.
 */
export class YamlMonthlyNoteParser implements IWidgetParser<MonthlyNoteConfig> {
  parse(source: string): MonthlyNoteConfig {
    if (!source.trim()) return {};
    try {
      const raw = yaml.load(source);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return this.validate(raw as Record<string, unknown>);
    } catch (e) {
      console.warn("[obsidian-widgets] Failed to parse monthly note config:", e);
      return {};
    }
  }

  private validate(raw: Record<string, unknown>): MonthlyNoteConfig {
    const config: MonthlyNoteConfig = {};

    const month = Number(raw["month"]);
    if (!isNaN(month) && month >= 1 && month <= 12) {
      config.month = Math.floor(month);
    }

    const year = Number(raw["year"]);
    if (!isNaN(year) && year >= 2000) {
      config.year = Math.floor(year);
    }

    if (raw["legend"] === true) {
      config.legend = true;
    }

    return config;
  }
}
