import { App, setIcon } from "obsidian";
import { DashboardConfig } from "@domain/widget/value-objects/DashboardConfig";

/**
 * Presentation: renders Row 1 of the dashboard widget — the icon bar.
 * Each icon can open a note (link) or execute an Obsidian command (command).
 */
export function renderIconBar(
  container: HTMLElement,
  config: DashboardConfig,
  app: App
): void {
  const row = container.createDiv({ cls: "widget-dashboard__icon-bar" });

  const icons = config.icons ?? [];
  if (icons.length === 0) return;

  for (const iconCfg of icons) {
    const btn = row.createEl("button", {
      cls: "widget-dashboard__icon-btn",
    });

    setIcon(btn, iconCfg.icon);

    if (iconCfg.tooltip) {
      btn.setAttribute("aria-label", iconCfg.tooltip);
      btn.setAttribute("title", iconCfg.tooltip);
    }

    btn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      if (iconCfg.link) {
        // Strip [[ ]] if the user wrote the link in wiki-link format
        const target = iconCfg.link.replace(/^\[\[|\]\]$/g, "");
        app.workspace.openLinkText(target, "", false);
      } else if (iconCfg.command) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (app as any).commands.executeCommandById(iconCfg.command);
      }
    });
  }
}
