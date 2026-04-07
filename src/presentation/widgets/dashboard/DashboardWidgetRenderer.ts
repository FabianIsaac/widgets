import { App } from "obsidian";
import { ParseDashboardConfigUseCase } from "../../../application/dashboard/ParseDashboardConfigUseCase";
import { OpenPeriodicNoteUseCase } from "../../../application/dashboard/OpenPeriodicNoteUseCase";
import { CalendarDate } from "../../../domain/calendar/value-objects/CalendarDate";
import { renderIconBar } from "./IconBarRenderer";
import { renderDateBar } from "./DateBarRenderer";
import { getLocale } from "../../../infrastructure/i18n/i18n";

/**
 * Presentation: orchestrates the full dashboard widget render.
 * Registered as a Markdown code block processor for the "widget-dashboard" language.
 */
export class DashboardWidgetRenderer {
  constructor(
    private readonly parseUseCase: ParseDashboardConfigUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App
  ) {}

  render(source: string, el: HTMLElement): void {
    const container = el.createDiv({ cls: "widget-dashboard" });

    const config = this.parseUseCase.execute(source);
    const locale = getLocale();
    const today = CalendarDate.today(locale);

    renderIconBar(container, config, this.app);
    renderDateBar(container, today, this.app, this.openPeriodicNoteUseCase);
  }
}
