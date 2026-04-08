/**
 * Current weather data returned by the weather port.
 * Temperature is already rounded to the nearest integer.
 */
export interface WeatherData {
  /** Current temperature (rounded) */
  temperature: number;
  /** WMO Weather Interpretation Code (0–99) */
  weatherCode: number;
  /** Wind speed in km/h */
  windSpeed: number;
  /** Units used for temperature */
  units: "celsius" | "fahrenheit";
  /** Display name for the location, if provided */
  location?: string;
}
