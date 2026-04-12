import { App, MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import { ParseDashboardConfigUseCase } from "@application/dashboard/ParseDashboardConfigUseCase";
import { OpenPeriodicNoteUseCase } from "@application/dashboard/OpenPeriodicNoteUseCase";
import { CalendarDate } from "@domain/calendar/value-objects/CalendarDate";
import { renderIconBar } from "./IconBarRenderer";
import { renderDateBar } from "./DateBarRenderer";
import { getLocale } from "@infrastructure/i18n/i18n";

/**
 * A MarkdownRenderChild that owns the dashboard widget's DOM and lifecycle.
 * Obsidian calls onload() when the block is rendered and onunload() when the
 * note is closed or the block is removed — keeping cleanup automatic.
 */
class DashboardWidgetComponent extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly parseUseCase: ParseDashboardConfigUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App
  ) {
    super(containerEl);
  }

  onload(): void {
    const container = this.containerEl.createDiv({ cls: "widget-dashboard" });
    const config = this.parseUseCase.execute(this.source);
    const today = CalendarDate.today(getLocale());
    renderIconBar(container, config, this.app);
    renderDateBar(container, today, this.openPeriodicNoteUseCase);
  }
}

/**
 * Presentation: creates and registers a DashboardWidgetComponent for each
 * code block via ctx.addChild(), delegating lifecycle to Obsidian.
 */
export class DashboardWidgetRenderer {
  constructor(
    private readonly parseUseCase: ParseDashboardConfigUseCase,
    private readonly openPeriodicNoteUseCase: OpenPeriodicNoteUseCase,
    private readonly app: App
  ) {}

  render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    ctx.addChild(
      new DashboardWidgetComponent(
        el,
        source,
        this.parseUseCase,
        this.openPeriodicNoteUseCase,
        this.app
      )
    );
  }
}
