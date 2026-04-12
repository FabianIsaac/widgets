import { App, TFile } from "obsidian";

// ── Note helpers ──────────────────────────────────────────────────────────────

/** Finds the index of the first heading line whose text matches `heading` (any level). */
function findHeadingIndex(lines: string[], heading: string): number {
  return lines.findIndex((l) => {
    const m = l.match(/^(#{1,6})\s+(.+)/);
    return m && m[2].trim() === heading;
  });
}

/** Extracts bullet entries under headingIdx, stopping at the next heading. */
function extractEntries(lines: string[], headingIdx: number): string[] {
  const entries: string[] = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) break;
    const m = lines[i].match(/^[\s]*[-*]\s+(.+)/);
    if (m) entries.push(m[1].trim());
  }
  return entries;
}

/** Inserts a new bullet entry under the heading (or creates the heading if absent). */
async function addEntry(app: App, file: TFile, heading: string, text: string): Promise<void> {
  const content = await app.vault.read(file);
  const lines = content.split("\n");
  const headingIdx = findHeadingIndex(lines, heading);

  if (headingIdx === -1) {
    // Heading doesn't exist — append at end
    const newContent = content.trimEnd() + `\n\n## ${heading}\n- ${text}\n`;
    await app.vault.modify(file, newContent);
  } else {
    // Find the last bullet in this section to insert after it
    let insertIdx = headingIdx;
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) break;
      if (/^[\s]*[-*]\s+/.test(lines[i])) insertIdx = i;
    }
    lines.splice(insertIdx + 1, 0, `- ${text}`);
    await app.vault.modify(file, lines.join("\n"));
  }
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
  afterHour = 0
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
    await addEntry(app, file, heading, text);
  }

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") submit();
  });
}
