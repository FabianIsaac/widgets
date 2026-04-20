import { App, TFile } from "obsidian";
import { CaptureButtonConfig } from "@domain/widget/value-objects/DailyNoteConfig";
import { t } from "@infrastructure/i18n/i18n";

/**
 * Extends CaptureButtonConfig with an optional post-submit hook.
 * Used internally to attach side-effects (e.g. adding a frontmatter tag)
 * without polluting the domain config type.
 */
export type CaptureEntry = CaptureButtonConfig & {
  afterSubmit?: () => Promise<void>;
  /**
   * When the target heading is not found in the note, the new section is
   * inserted immediately before the first heading in this list that already
   * exists in the file — keeping sections in a stable order.
   *
   * Typical usage:
   *   - time-block captures: [captureHeading1, captureHeading2, ..., gratitudeHeading]
   *   - named captures:      [gratitudeHeading]
   * This ensures time-block sections stay above named sections, which stay above gratitude.
   */
  pinBeforeFirstOf?: string[];
};

// ── Note helpers ──────────────────────────────────────────────────────────────

/** Returns HH:mm string for the current local time. */
function currentTime(): string {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}

/** Applies format substitutions to a format string.
 *  Supported tokens: {task} → "- [ ] {text}", {text}, {time}, \n → newline.
 */
function applyFormat(format: string, text: string): string {
  return format
    .replace(/\\n/g, "\n")
    .replace(/\{task\}/g, "- [ ] {text}")
    .replace(/\{time\}/g, currentTime())
    .replace(/\{text\}/g, text);
}

/** Finds the index of a heading line matching `heading` text (any level). */
function findHeadingIndex(lines: string[], heading: string): number {
  return lines.findIndex((l) => {
    const m = l.match(/^(#{1,6})\s+(.+)/);
    return m && m[2].trim() === heading;
  });
}

/**
 * Appends `line` to the daily note under `heading`.
 * - If the heading exists: inserts after the last entry in that section.
 * - If the heading is missing and `pinLastHeading` is given: creates the heading
 *   immediately before `pinLastHeading` so that section stays at the bottom.
 * - Otherwise creates the heading at the end of the file.
 * - If no heading at all: appends at the very end.
 */
export async function appendToNote(
  app: App,
  file: TFile,
  line: string,
  heading?: string,
  pinBeforeFirstOf?: string[]
): Promise<void> {
  const content = await app.vault.read(file);

  if (!heading) {
    await app.vault.modify(file, content.trimEnd() + "\n" + line + "\n");
    return;
  }

  const lines = content.split("\n");
  const headingIdx = findHeadingIndex(lines, heading);

  if (headingIdx === -1) {
    // Heading not found — insert before the earliest existing heading in the pin list
    let insertAt = -1;
    if (pinBeforeFirstOf && pinBeforeFirstOf.length > 0) {
      let earliest = Infinity;
      for (const pin of pinBeforeFirstOf) {
        const idx = findHeadingIndex(lines, pin);
        if (idx !== -1 && idx < earliest) {
          earliest = idx;
          insertAt = idx;
        }
      }
    }

    if (insertAt !== -1) {
      // Ensure a blank line before the new heading
      const needsBlankBefore = lines[insertAt - 1]?.trim() !== "";
      const toInsert = [
        ...(needsBlankBefore ? [""] : []),
        `## ${heading}`,
        line,
        "",
      ];
      lines.splice(insertAt, 0, ...toInsert);
      await app.vault.modify(file, lines.join("\n"));
    } else {
      await app.vault.modify(file, content.trimEnd() + `\n\n## ${heading}\n${line}\n`);
    }
  } else {
    let insertIdx = headingIdx;
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) break;
      if (lines[i].trim()) insertIdx = i;
    }
    lines.splice(insertIdx + 1, 0, line);
    await app.vault.modify(file, lines.join("\n"));
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────

/**
 * Renders a row of quick-capture buttons at the bottom of the daily widget.
 * Each button, when clicked, reveals a shared input field. Pressing Enter
 * appends the formatted line to the daily note and clears the input.
 * Pressing Escape or clicking the active button again closes the input.
 */
export function renderQuickCapture(
  container: HTMLElement,
  app: App,
  file: TFile,
  captures: CaptureEntry[]
): void {
  const now = new Date().getHours();
  const visible = captures.filter((c) => {
    const after = c.after ?? 0;
    const { until } = c;
    if (until === undefined) return now >= after;
    // Wraps midnight (e.g. after:23 until:4): visible when now>=23 OR now<4
    if (after > until) return now >= after || now < until;
    // Normal range (e.g. after:8 until:18): visible when now>=8 AND now<18
    return now >= after && now < until;
  });
  if (visible.length === 0) return;

  const section = container.createDiv({ cls: "widget-daily__captures" });
  const buttonsRow = section.createDiv({ cls: "widget-daily__captures-buttons" });

  let activeConfig: CaptureEntry | null = null;
  let activeBtn: HTMLElement | null = null;
  let inputRow: HTMLElement | null = null;

  function closeInput(): void {
    inputRow?.remove();
    inputRow = null;
    activeBtn?.removeClass("is-active");
    activeBtn = null;
    activeConfig = null;
  }

  function openInput(btn: HTMLElement, config: CaptureEntry): void {
    inputRow?.remove();

    activeBtn?.removeClass("is-active");
    activeConfig = config;
    activeBtn = btn;
    btn.addClass("is-active");

    inputRow = section.createDiv({ cls: "widget-daily__captures-input-row" });
    const input = inputRow.createEl("input", {
      cls: "widget-daily__captures-input",
      type: "text",
    });
    input.setAttribute("placeholder", config.placeholder ?? t("daily.capturePlaceholder"));
    input.focus();

    input.addEventListener("keydown", async (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        const line = applyFormat(config.format, text);
        // If no explicit heading, group under the current hour block (e.g. "## 10:00")
        const heading = config.heading ?? `${String(new Date().getHours()).padStart(2, "0")}:00`;
        await appendToNote(app, file, line, heading, config.pinBeforeFirstOf);
        await config.afterSubmit?.();
      } else if (e.key === "Escape") {
        closeInput();
      }
    });
  }

  for (const config of visible) {
    const btn = buttonsRow.createEl("button", {
      cls: "widget-daily__capture-btn",
      text: config.label,
    });
    btn.addEventListener("click", () => {
      if (activeConfig === config) {
        closeInput();
      } else {
        openInput(btn, config);
      }
    });
  }
}
