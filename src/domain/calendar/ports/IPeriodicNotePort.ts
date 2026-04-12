/**
 * Port (interface) for opening periodic notes (daily, weekly).
 * Implementations live in the infrastructure layer and use the
 * obsidian-daily-notes-interface library + Obsidian workspace API.
 */
export interface IPeriodicNotePort {
  openDailyNote(date: Date): Promise<void>;
  openWeeklyNote(date: Date): Promise<void>;
  openMonthlyNote(date: Date): Promise<void>;
  openYearlyNote(date: Date): Promise<void>;
}
