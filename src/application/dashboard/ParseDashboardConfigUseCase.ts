import { DashboardConfig } from "@domain/widget/value-objects/DashboardConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

/**
 * Application use case: parse raw YAML source from a code block into a
 * DashboardConfig. Falls back to an empty config on any parse error.
 */
export class ParseDashboardConfigUseCase {
  constructor(private readonly parser: IWidgetParser<DashboardConfig>) {}

  execute(source: string): DashboardConfig {
    if (!source.trim()) return {};
    return this.parser.parse(source);
  }
}
