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

    // js-yaml parses bare ISO dates (2026-04-08) as JS Date objects, so handle both
    const rawDate = raw["date"];
    if (rawDate instanceof Date) {
      const y = rawDate.getUTCFullYear();
      const m = String(rawDate.getUTCMonth() + 1).padStart(2, "0");
      const d = String(rawDate.getUTCDate()).padStart(2, "0");
      config.date = `${y}-${m}-${d}`;
    } else if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
      config.date = rawDate.trim();
    }

    if (typeof raw["name"] === "string" && raw["name"].trim()) {
      config.name = raw["name"].trim();
    }

    const g = raw["gratitude"];
    if (g && typeof g === "object" && !Array.isArray(g)) {
      const gObj = g as Record<string, unknown>;
      if (typeof gObj["heading"] === "string" && gObj["heading"].trim()) {
        config.gratitude = { heading: gObj["heading"].trim() };
        const after = Number(gObj["after"]);
        if (!isNaN(after) && after >= 0 && after <= 23) {
          config.gratitude.after = Math.floor(after);
        }
        if (typeof gObj["tag"] === "string" && gObj["tag"].trim()) {
          config.gratitude.tag = gObj["tag"].trim().replace(/^#/, "");
        }
      }
    } else if (typeof g === "string" && g.trim()) {
      config.gratitude = { heading: g.trim() };
    }

    const rawCaptures = raw["captures"];
    if (Array.isArray(rawCaptures)) {
      config.captures = rawCaptures.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const c = item as Record<string, unknown>;
        if (typeof c["label"] !== "string" || !c["label"].trim()) return [];
        if (typeof c["format"] !== "string" || !c["format"].trim()) return [];
        const entry: import("@domain/widget/value-objects/DailyNoteConfig").CaptureButtonConfig = {
          label: String(c["label"]).trim(),
          format: String(c["format"]).trim(),
        };
        if (typeof c["heading"] === "string" && c["heading"].trim()) {
          entry.heading = c["heading"].trim();
        }
        if (typeof c["placeholder"] === "string" && c["placeholder"].trim()) {
          entry.placeholder = c["placeholder"].trim();
        }
        const after = Number(c["after"]);
        if (!isNaN(after) && after >= 0 && after <= 23) {
          entry.after = Math.floor(after);
        }
        const until = Number(c["until"]);
        if (!isNaN(until) && until >= 0 && until <= 23) {
          entry.until = Math.floor(until);
        }
        return [entry];
      });
    }

    const cal = raw["calendar"];
    if (cal) {
      const entries = Array.isArray(cal) ? cal : [cal];
      const parsed = entries.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const url = (item as Record<string, unknown>)["url"];
        if (typeof url !== "string" || !url.trim()) return [];
        return [{ url: url.trim() }];
      });
      if (parsed.length > 0) config.calendars = parsed;
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
