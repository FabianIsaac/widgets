import { MonthlyNoteConfig } from "@domain/widget/value-objects/MonthlyNoteConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

/**
 * Application use case: parse raw YAML source into a MonthlyNoteConfig.
 */
export class ParseMonthlyNoteConfigUseCase {
  constructor(private readonly parser: IWidgetParser<MonthlyNoteConfig>) {}

  execute(source: string): MonthlyNoteConfig {
    return this.parser.parse(source);
  }
}
