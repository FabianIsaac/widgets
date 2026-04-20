import { App, TFile } from "obsidian";
import { appendToNote } from "./QuickCaptureRenderer";

// ── Note helpers ──────────────────────────────────────────────────────────────

/** Adds `tag` to the frontmatter tags array if not already present. */
export async function ensureTag(app: App, file: TFile, tag: string): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const existing: unknown = fm["tags"];
    if (Array.isArray(existing)) {
      if (!existing.includes(tag)) existing.push(tag);
    } else if (typeof existing === "string") {
      if (existing !== tag) fm["tags"] = [existing, tag];
    } else {
      fm["tags"] = [tag];
    }
  });
}

// ── Renderer ──────────────────────────────────────────────────────────────────

/**
 * Renders a gratitude input section at the bottom of the daily widget.
 * Only visible after `afterHour` (0–23). Entries are written directly to
 * the note file as bullets under `heading` — they are NOT shown in the widget.
 *
 * @param afterHour - Hour of day from which the section becomes visible (default 0).
 */
export function renderGratitude(
  container: HTMLElement,
  app: App,
  file: TFile,
  heading: string,
  afterHour = 0,
  tag?: string
): void {
  if (new Date().getHours() < afterHour) return;

  const section = container.createDiv({ cls: "widget-daily__gratitude" });

  section.createEl("span", { cls: "widget-daily__gratitude-title", text: heading });

  const inputRow = section.createDiv({ cls: "widget-daily__gratitude-input-row" });
  const input = inputRow.createEl("input", {
    cls: "widget-daily__gratitude-input",
    type: "text",
  });
  input.setAttribute("placeholder", "Agregar…");

  async function submit(): Promise<void> {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await appendToNote(app, file, `- ${text}`, heading);
    if (tag) await ensureTag(app, file, tag);
  }

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") submit();
  });
}
