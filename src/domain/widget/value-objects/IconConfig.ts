/**
 * Configuration for a single icon in the icon bar.
 * Either `link` or `command` must be provided.
 * If both are provided, `link` takes precedence.
 */
export interface IconConfig {
  /** Lucide icon name (e.g. "home", "calendar", "settings") */
  icon: string;
  /** Obsidian internal link to open (e.g. "[[Home]]" or "Home") */
  link?: string;
  /** Obsidian command ID to execute (e.g. "app:open-settings") */
  command?: string;
  /** Tooltip text shown on hover */
  tooltip?: string;
}
