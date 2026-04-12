/**
 * Value object wrapping a Date, providing localized day and month names.
 * Pure domain logic — no Obsidian API dependency.
 */
export class CalendarDate {
  private readonly date: Date;
  private readonly locale: string;

  constructor(date: Date, locale: string) {
    this.date = date;
    this.locale = locale;
  }

  /** Localized full day name (e.g. "Monday" / "Lunes") */
  get dayName(): string {
    return new Intl.DateTimeFormat(this.locale, { weekday: "long" }).format(
      this.date
    );
  }

  /** Numeric day of the month (1–31) */
  get dayNumber(): number {
    return this.date.getDate();
  }

  /** Localized full month name (e.g. "April" / "Abril") */
  get monthName(): string {
    return new Intl.DateTimeFormat(this.locale, { month: "long" }).format(
      this.date
    );
  }

  /** The underlying Date object */
  get raw(): Date {
    return this.date;
  }

  /** Factory: today's date with the given locale */
  static today(locale: string): CalendarDate {
    return new CalendarDate(new Date(), locale);
  }

  /**
   * Factory: creates a CalendarDate from a YYYY-MM-DD string.
   * Parses as local date to avoid UTC timezone offset issues.
   */
  static fromString(dateStr: string, locale: string): CalendarDate {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new CalendarDate(new Date(year, month - 1, day), locale);
  }
}
