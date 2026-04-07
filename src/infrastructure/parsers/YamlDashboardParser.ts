import * as yaml from "js-yaml";
import { DashboardConfig } from "../../domain/widget/value-objects/DashboardConfig";
import { IconConfig } from "../../domain/widget/value-objects/IconConfig";
import { IWidgetParser } from "../../domain/widget/ports/IWidgetParser";

/**
 * Infrastructure implementation: parses YAML code block source into a
 * DashboardConfig using js-yaml. Returns an empty config on errors.
 */
export class YamlDashboardParser implements IWidgetParser<DashboardConfig> {
  parse(source: string): DashboardConfig {
    try {
      const raw = yaml.load(source);
      if (!raw || typeof raw !== "object") return {};
      return this.validate(raw as Record<string, unknown>);
    } catch (e) {
      console.warn("[obsidian-widgets] Failed to parse dashboard config:", e);
      return {};
    }
  }

  private validate(raw: Record<string, unknown>): DashboardConfig {
    const config: DashboardConfig = {};

    if (Array.isArray(raw["icons"])) {
      config.icons = (raw["icons"] as unknown[])
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item): IconConfig | null => {
          if (typeof item["icon"] !== "string") return null;
          const entry: IconConfig = { icon: item["icon"] };
          if (typeof item["link"] === "string") entry.link = item["link"];
          if (typeof item["command"] === "string") entry.command = item["command"];
          if (typeof item["tooltip"] === "string") entry.tooltip = item["tooltip"];
          return entry;
        })
        .filter((item): item is IconConfig => item !== null);
    }

    return config;
  }
}
