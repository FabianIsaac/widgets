/**
 * Configuration for the weather section of the daily note widget.
 * Coordinates can be found at https://www.latlong.net/
 */
export interface WeatherConfig {
  latitude: number;
  longitude: number;
  /** Optional display name shown in the weather card */
  location?: string;
  /** Temperature units. Defaults to "celsius". */
  units?: "celsius" | "fahrenheit";
}
