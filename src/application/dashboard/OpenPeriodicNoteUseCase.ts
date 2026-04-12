import { IPeriodicNotePort } from "@domain/calendar/ports/IPeriodicNotePort";

/**
 * Application use case: open a daily or weekly note for a given date.
 * Delegates the actual Obsidian API calls to the injected port.
 */
export class OpenPeriodicNoteUseCase {
  constructor(private readonly periodicNotePort: IPeriodicNotePort) {}

  async openDaily(date: Date): Promise<void> {
    await this.periodicNotePort.openDailyNote(date);
  }

  async openWeekly(date: Date): Promise<void> {
    await this.periodicNotePort.openWeeklyNote(date);
  }

  async openMonthly(date: Date): Promise<void> {
    await this.periodicNotePort.openMonthlyNote(date);
  }

  async openYearly(date: Date): Promise<void> {
    await this.periodicNotePort.openYearlyNote(date);
  }
}
