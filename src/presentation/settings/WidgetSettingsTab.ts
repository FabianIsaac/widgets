import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianWidgetsPlugin from "../../main";
import { t, changeLanguage } from "@infrastructure/i18n/i18n";
import { TAG_COLOR_OPTIONS, type TagColorEntry, type LinkColorEntry, type FrontmatterColorEntry } from "./SettingsManager";
import type { CaptureButtonConfig } from "@domain/widget/value-objects/DailyNoteConfig";

/**
 * Settings tab for the Obsidian Widgets plugin.
 * Sections are grouped by widget type.
 */
export class WidgetSettingsTab extends PluginSettingTab {
  private readonly plugin: ObsidianWidgetsPlugin;

  constructor(app: App, plugin: ObsidianWidgetsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: t("settings.title") });

    // ══════════════════════════════════════════════════════════════════════════
    // General
    // ══════════════════════════════════════════════════════════════════════════
    containerEl.createEl("h3", { text: t("settings.sectionGeneral") });

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("auto", t("settings.languageAuto"))
          .addOption("en", "English")
          .addOption("es", "Español")
          .setValue(this.plugin.settingsManager.get().language)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ language: value });
            await changeLanguage(value);
            this.display();
          });
      });

    // ══════════════════════════════════════════════════════════════════════════
    // Widget diario
    // ══════════════════════════════════════════════════════════════════════════
    containerEl.createEl("h3", { text: t("settings.sectionDaily") });

    // ── Capturas rápidas ──────────────────────────────────────────────────────
    containerEl.createEl("h4", {
      text: t("settings.captureTemplatesHeading"),
      cls: "widget-settings__subsection",
    });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.captureTemplatesDesc"),
    });

    const captureTemplates = this.plugin.settingsManager.get().captureTemplates;
    for (let i = 0; i < captureTemplates.length; i++) {
      this.renderCaptureTemplateEntry(containerEl, captureTemplates, i);
    }
    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.captureTemplatesAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [
            ...this.plugin.settingsManager.get().captureTemplates,
            { label: "", format: "- {text}" } as CaptureButtonConfig,
          ];
          await this.plugin.settingsManager.update({ captureTemplates: updated });
          this.display();
        });
    });

    // ── Gratitud ──────────────────────────────────────────────────────────────
    containerEl.createEl("h4", {
      text: t("settings.gratitudeHeading"),
      cls: "widget-settings__subsection",
    });

    new Setting(containerEl)
      .setName(t("settings.gratitudeAutoTag"))
      .setDesc(t("settings.gratitudeAutoTagDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. agradecimiento")
          .setValue(this.plugin.settingsManager.get().gratitudeAutoTag)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({
              gratitudeAutoTag: value.trim().replace(/^#/, ""),
            });
          });
      });

    // ══════════════════════════════════════════════════════════════════════════
    // Widget semanal
    // ══════════════════════════════════════════════════════════════════════════
    containerEl.createEl("h3", { text: t("settings.sectionWeekly") });

    // ── Prefijos de tags excluidos ────────────────────────────────────────────
    containerEl.createEl("h4", {
      text: t("settings.excludedTagPrefixesHeading"),
      cls: "widget-settings__subsection",
    });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.excludedTagPrefixesDesc"),
    });

    const excludedTagPrefixes = this.plugin.settingsManager.get().excludedTagPrefixes;
    for (let i = 0; i < excludedTagPrefixes.length; i++) {
      new Setting(containerEl)
        .addText((text) => {
          text
            .setPlaceholder("tipo/")
            .setValue(excludedTagPrefixes[i])
            .onChange(async (value) => {
              const updated = [...this.plugin.settingsManager.get().excludedTagPrefixes];
              updated[i] = value.trim();
              await this.plugin.settingsManager.update({ excludedTagPrefixes: updated });
            });
        })
        .addExtraButton((btn) => {
          btn
            .setIcon("trash")
            .setTooltip(t("settings.excludedTagPrefixesRemove"))
            .onClick(async () => {
              const updated = this.plugin.settingsManager
                .get()
                .excludedTagPrefixes.filter((_, idx) => idx !== i);
              await this.plugin.settingsManager.update({ excludedTagPrefixes: updated });
              this.display();
            });
        });
    }
    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.excludedTagPrefixesAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [...this.plugin.settingsManager.get().excludedTagPrefixes, ""];
          await this.plugin.settingsManager.update({ excludedTagPrefixes: updated });
          this.display();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // Widget mensual
    // ══════════════════════════════════════════════════════════════════════════
    containerEl.createEl("h3", { text: t("settings.sectionMonthly") });

    // ── Colores de etiquetas ──────────────────────────────────────────────────
    containerEl.createEl("h4", {
      text: t("settings.tagColorsHeading"),
      cls: "widget-settings__subsection",
    });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.tagColorsDesc"),
    });

    const tagColors = this.plugin.settingsManager.get().tagColors;
    for (let i = 0; i < tagColors.length; i++) {
      this.renderTagColorEntry(containerEl, tagColors, i);
    }
    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.tagColorsAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [
            ...this.plugin.settingsManager.get().tagColors,
            { tag: "", color: "blue" } as TagColorEntry,
          ];
          await this.plugin.settingsManager.update({ tagColors: updated });
          this.display();
        });
    });

    // ── Colores de referencias ────────────────────────────────────────────────
    containerEl.createEl("h4", {
      text: t("settings.linkColorsHeading"),
      cls: "widget-settings__subsection",
    });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.linkColorsDesc"),
    });

    const linkColors = this.plugin.settingsManager.get().linkColors;
    for (let i = 0; i < linkColors.length; i++) {
      this.renderLinkColorEntry(containerEl, linkColors, i);
    }
    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.linkColorsAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [
            ...this.plugin.settingsManager.get().linkColors,
            { link: "", color: "green" } as LinkColorEntry,
          ];
          await this.plugin.settingsManager.update({ linkColors: updated });
          this.display();
        });
    });

    // ── Propiedades frontmatter ───────────────────────────────────────────────
    containerEl.createEl("h4", {
      text: t("settings.frontmatterColorsHeading"),
      cls: "widget-settings__subsection",
    });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.frontmatterColorsDesc"),
    });

    const frontmatterColors = this.plugin.settingsManager.get().frontmatterColors;
    for (let i = 0; i < frontmatterColors.length; i++) {
      this.renderFrontmatterColorEntry(containerEl, frontmatterColors, i);
    }
    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.frontmatterColorsAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [
            ...this.plugin.settingsManager.get().frontmatterColors,
            { property: "", value: "", color: "purple" } as FrontmatterColorEntry,
          ];
          await this.plugin.settingsManager.update({ frontmatterColors: updated });
          this.display();
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // Clima por defecto
    // ══════════════════════════════════════════════════════════════════════════
    containerEl.createEl("h3", { text: t("settings.sectionWeather") });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.sectionWeatherDesc"),
    });

    new Setting(containerEl)
      .setName(t("settings.latitude"))
      .setDesc(t("settings.latitudeDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. -33.511")
          .setValue(this.plugin.settingsManager.get().latitude)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ latitude: value.trim() });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.longitude"))
      .setDesc(t("settings.longitudeDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. -70.631")
          .setValue(this.plugin.settingsManager.get().longitude)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ longitude: value.trim() });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.location"))
      .setDesc(t("settings.locationDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. San Joaquín")
          .setValue(this.plugin.settingsManager.get().location)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ location: value.trim() });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.units"))
      .setDesc(t("settings.unitsDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("celsius", "Celsius (°C)")
          .addOption("fahrenheit", "Fahrenheit (°F)")
          .setValue(this.plugin.settingsManager.get().units)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ units: value as "celsius" | "fahrenheit" });
          });
      });
  }

  // ── Private renderers ────────────────────────────────────────────────────────

  private renderCaptureTemplateEntry(
    containerEl: HTMLElement,
    templates: CaptureButtonConfig[],
    index: number
  ): void {
    const entry = templates[index];

    new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder(t("settings.captureTemplatesLabel"))
          .setValue(entry.label)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().captureTemplates];
            updated[index] = { ...updated[index], label: value };
            await this.plugin.settingsManager.update({ captureTemplates: updated });
          });
      })
      .addText((text) => {
        text
          .setPlaceholder(t("settings.captureTemplatesFormat"))
          .setValue(entry.format)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().captureTemplates];
            updated[index] = { ...updated[index], format: value };
            await this.plugin.settingsManager.update({ captureTemplates: updated });
          });
      })
      .addText((text) => {
        text
          .setPlaceholder(t("settings.captureTemplatesHeadingField"))
          .setValue(entry.heading ?? "")
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().captureTemplates];
            const h = value.trim();
            updated[index] = { ...updated[index], heading: h || undefined };
            await this.plugin.settingsManager.update({ captureTemplates: updated });
          });
      })
      .addText((text) => {
        text.inputEl.style.width = "52px";
        text
          .setPlaceholder(t("settings.captureTemplatesAfter"))
          .setValue(entry.after !== undefined ? String(entry.after) : "")
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().captureTemplates];
            const n = parseInt(value);
            updated[index] = { ...updated[index], after: !isNaN(n) && n >= 0 && n <= 23 ? n : undefined };
            await this.plugin.settingsManager.update({ captureTemplates: updated });
          });
      })
      .addText((text) => {
        text.inputEl.style.width = "52px";
        text
          .setPlaceholder(t("settings.captureTemplatesUntil"))
          .setValue(entry.until !== undefined ? String(entry.until) : "")
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().captureTemplates];
            const n = parseInt(value);
            updated[index] = { ...updated[index], until: !isNaN(n) && n >= 0 && n <= 23 ? n : undefined };
            await this.plugin.settingsManager.update({ captureTemplates: updated });
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("settings.captureTemplatesRemove"))
          .onClick(async () => {
            const updated = this.plugin.settingsManager
              .get()
              .captureTemplates.filter((_, i) => i !== index);
            await this.plugin.settingsManager.update({ captureTemplates: updated });
            this.display();
          });
      });
  }

  private renderTagColorEntry(
    containerEl: HTMLElement,
    tagColors: TagColorEntry[],
    index: number
  ): void {
    const entry = tagColors[index];

    const setting = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder("tag-name")
          .setValue(entry.tag)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().tagColors];
            updated[index] = { ...updated[index], tag: value.trim() };
            await this.plugin.settingsManager.update({ tagColors: updated });
          });
      })
      .addDropdown((dropdown) => {
        TAG_COLOR_OPTIONS.forEach(({ value, label }) => dropdown.addOption(value, label));
        dropdown.setValue(entry.color).onChange(async (value) => {
          const updated = [...this.plugin.settingsManager.get().tagColors];
          updated[index] = { ...updated[index], color: value };
          await this.plugin.settingsManager.update({ tagColors: updated });
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("settings.tagColorsRemove"))
          .onClick(async () => {
            const updated = this.plugin.settingsManager
              .get()
              .tagColors.filter((_, i) => i !== index);
            await this.plugin.settingsManager.update({ tagColors: updated });
            this.display();
          });
      });

    const colorSwatch = setting.controlEl.createDiv({ cls: "widget-settings__color-swatch" });
    colorSwatch.style.setProperty("--swatch-color", `var(--color-${entry.color})`);
  }

  private renderLinkColorEntry(
    containerEl: HTMLElement,
    linkColors: LinkColorEntry[],
    index: number
  ): void {
    const entry = linkColors[index];

    const setting = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder(t("settings.linkColorsFilename"))
          .setValue(entry.link)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().linkColors];
            updated[index] = { ...updated[index], link: value.trim() };
            await this.plugin.settingsManager.update({ linkColors: updated });
          });
      })
      .addText((text) => {
        text
          .setPlaceholder(t("settings.linkColorsAlias"))
          .setValue(entry.alias ?? "")
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().linkColors];
            updated[index] = { ...updated[index], alias: value.trim() || undefined };
            await this.plugin.settingsManager.update({ linkColors: updated });
          });
      })
      .addDropdown((dropdown) => {
        TAG_COLOR_OPTIONS.forEach(({ value, label }) => dropdown.addOption(value, label));
        dropdown.setValue(entry.color).onChange(async (value) => {
          const updated = [...this.plugin.settingsManager.get().linkColors];
          updated[index] = { ...updated[index], color: value };
          await this.plugin.settingsManager.update({ linkColors: updated });
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("settings.linkColorsRemove"))
          .onClick(async () => {
            const updated = this.plugin.settingsManager
              .get()
              .linkColors.filter((_, i) => i !== index);
            await this.plugin.settingsManager.update({ linkColors: updated });
            this.display();
          });
      });

    const colorSwatch = setting.controlEl.createDiv({ cls: "widget-settings__color-swatch" });
    colorSwatch.style.setProperty("--swatch-color", `var(--color-${entry.color})`);
  }

  private renderFrontmatterColorEntry(
    containerEl: HTMLElement,
    frontmatterColors: FrontmatterColorEntry[],
    index: number
  ): void {
    const entry = frontmatterColors[index];

    const setting = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder(t("settings.frontmatterColorsProperty"))
          .setValue(entry.property)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().frontmatterColors];
            updated[index] = { ...updated[index], property: value.trim() };
            await this.plugin.settingsManager.update({ frontmatterColors: updated });
          });
      })
      .addText((text) => {
        text
          .setPlaceholder(t("settings.frontmatterColorsValue"))
          .setValue(entry.value)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().frontmatterColors];
            updated[index] = { ...updated[index], value: value.trim() };
            await this.plugin.settingsManager.update({ frontmatterColors: updated });
          });
      })
      .addText((text) => {
        text
          .setPlaceholder(t("settings.frontmatterColorsAlias"))
          .setValue(entry.alias ?? "")
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().frontmatterColors];
            updated[index] = { ...updated[index], alias: value.trim() || undefined };
            await this.plugin.settingsManager.update({ frontmatterColors: updated });
          });
      })
      .addDropdown((dropdown) => {
        TAG_COLOR_OPTIONS.forEach(({ value, label }) => dropdown.addOption(value, label));
        dropdown.setValue(entry.color).onChange(async (value) => {
          const updated = [...this.plugin.settingsManager.get().frontmatterColors];
          updated[index] = { ...updated[index], color: value };
          await this.plugin.settingsManager.update({ frontmatterColors: updated });
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("settings.frontmatterColorsRemove"))
          .onClick(async () => {
            const updated = this.plugin.settingsManager
              .get()
              .frontmatterColors.filter((_, i) => i !== index);
            await this.plugin.settingsManager.update({ frontmatterColors: updated });
            this.display();
          });
      });

    const colorSwatch = setting.controlEl.createDiv({ cls: "widget-settings__color-swatch" });
    colorSwatch.style.setProperty("--swatch-color", `var(--color-${entry.color})`);
  }
}
