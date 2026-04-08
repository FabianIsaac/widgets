import { App, Notice } from "obsidian";
import {
  appHasDailyNotesPluginLoaded,
  appHasWeeklyNotesPluginLoaded,
  getAllDailyNotes,
  getAllWeeklyNotes,
  createDailyNote,
  createWeeklyNote,
  getDailyNote,
  getWeeklyNote,
} from "obsidian-daily-notes-interface";
import { IPeriodicNotePort } from "@domain/calendar/ports/IPeriodicNotePort";
import { t } from "@infrastructure/i18n/i18n";

declare const moment: (date?: Date) => ReturnType<typeof import("moment")>;

/**
 * Infrastructure adapter: implements IPeriodicNotePort using the
 * obsidian-daily-notes-interface library and Obsidian workspace API.
 */
export class ObsidianPeriodicNoteAdapter implements IPeriodicNotePort {
  constructor(private readonly app: App) {}

  async openDailyNote(date: Date): Promise<void> {
    if (!appHasDailyNotesPluginLoaded()) {
      new Notice(t("dashboard.noPeriodicPlugin"));
      return;
    }

    const m = moment(date);
    const allNotes = getAllDailyNotes();
    let note = getDailyNote(m, allNotes);

    if (!note) {
      note = await createDailyNote(m);
    }

    if (note) {
      await this.app.workspace.getLeaf(false).openFile(note);
    }
  }

  async openWeeklyNote(date: Date): Promise<void> {
    if (!appHasWeeklyNotesPluginLoaded()) {
      new Notice(t("dashboard.noPeriodicPlugin"));
      return;
    }

    const m = moment(date);
    const allNotes = getAllWeeklyNotes();
    let note = getWeeklyNote(m, allNotes);

    if (!note) {
      note = await createWeeklyNote(m);
    }

    if (note) {
      await this.app.workspace.getLeaf(false).openFile(note);
    }
  }
}
