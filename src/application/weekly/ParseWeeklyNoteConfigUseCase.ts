import { WeeklyNoteConfig } from "@domain/widget/value-objects/WeeklyNoteConfig";
import { IWidgetParser } from "@domain/widget/ports/IWidgetParser";

export class ParseWeeklyNoteConfigUseCase {
  constructor(private readonly parser: IWidgetParser<WeeklyNoteConfig>) {}

  execute(source: string): WeeklyNoteConfig {
    return this.parser.parse(source);
  }
}
