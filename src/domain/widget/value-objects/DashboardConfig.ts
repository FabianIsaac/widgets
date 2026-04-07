import { IconConfig } from "./IconConfig";

/**
 * Full configuration parsed from a widget-dashboard code block.
 */
export interface DashboardConfig {
  /** List of icons to display in the icon bar (Row 1) */
  icons?: IconConfig[];
}
