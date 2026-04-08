import { DailyNoteConfig } from "@domain/widget/value-objects/DailyNoteConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

/**
 * Application use case: parse raw YAML source into a DailyNoteConfig.
 */
export class ParseDailyNoteConfigUseCase {
  constructor(private readonly parser: IWidgetParser<DailyNoteConfig>) {}

  execute(source: string): DailyNoteConfig {
    return this.parser.parse(source);
  }
}
