/**
 * Weather forecast data for a single day.
 */
export interface DailyForecast {
  /** The calendar date for this forecast entry */
  date: Date;
  /** WMO weather interpretation code */
  weatherCode: number;
  /** Maximum temperature for the day (rounded) */
  maxTemp: number;
  /** Minimum temperature for the day (rounded) */
  minTemp: number;
}
